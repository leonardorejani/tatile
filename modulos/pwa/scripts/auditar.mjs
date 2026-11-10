#!/usr/bin/env node
// Auditor de PWA: confere manifesto, service worker, instalação, push e acabamento nativo de um
// projeto web, sem rede e sem dependência. Saída em TOON para agente; --json para máquina.
//
// Uso: node auditar.mjs [pasta] [--json] [--sem-cache]
// Saída: 0 sem erro; 1 com achado de severidade erro; 2 uso errado.
//
// Cache: .pwa-nativo/cache.json na pasta auditada. Cada arquivo guarda tamanho, data e sha1 junto
// da análise; arquivo que não mudou não é relido. Mudou o tamanho ou a data, o sha1 decide; mudou o
// conteúdo, a análise é refeita. As regras globais e a existência dos ícones nunca entram no cache.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { REGRAS_GLOBAIS, analisarArquivo } from './regras.mjs'

export const VERSAO_CACHE = 1
const IGNORAR = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out', '.vercel', '.turbo', 'coverage', '.pwa-nativo', '_archive', '_temp', 'deprecated'])
const EXTENSOES = /\.(js|jsx|ts|tsx|mjs|vue|svelte|html|css|scss|webmanifest|json)$/
const LIMITE_BYTES = 512 * 1024
const ORDEM_SEV = { erro: 0, aviso: 1, dica: 2 }

function listarArquivos(raiz, pasta = raiz, lista = []) {
  for (const nome of readdirSync(pasta)) {
    if (IGNORAR.has(nome) || nome.startsWith('.') && nome !== '.well-known') continue
    const caminho = join(pasta, nome)
    const info = statSync(caminho)
    if (info.isDirectory()) listarArquivos(raiz, caminho, lista)
    else if (EXTENSOES.test(nome) && info.size <= LIMITE_BYTES && !/package(-lock)?\.json$|tsconfig|\.min\./.test(nome)) lista.push(caminho)
  }
  return lista
}

function lerCache(raiz, usar) {
  const arquivo = join(raiz, '.pwa-nativo', 'cache.json')
  if (!usar || !existsSync(arquivo)) return { versao: VERSAO_CACHE, arquivos: {} }
  try {
    const cache = JSON.parse(readFileSync(arquivo, 'utf8'))
    return cache.versao === VERSAO_CACHE ? cache : { versao: VERSAO_CACHE, arquivos: {} }
  } catch {
    return { versao: VERSAO_CACHE, arquivos: {} }
  }
}

function gravarCache(raiz, cache) {
  mkdirSync(join(raiz, '.pwa-nativo'), { recursive: true })
  writeFileSync(join(raiz, '.pwa-nativo', 'cache.json'), JSON.stringify(cache))
}

// Devolve a análise do arquivo, do cache quando nada mudou
function analisarComCache(raiz, caminho, cache, contagem) {
  const rel = relative(raiz, caminho)
  const info = statSync(caminho)
  const guardado = cache.arquivos[rel]
  if (guardado && guardado.tamanho === info.size && guardado.mtimeMs === info.mtimeMs) {
    contagem.reaproveitados++
    return guardado
  }
  const texto = readFileSync(caminho, 'utf8')
  const sha1 = createHash('sha1').update(texto).digest('hex')
  if (guardado && guardado.sha1 === sha1) {
    contagem.reaproveitados++
    cache.arquivos[rel] = { ...guardado, tamanho: info.size, mtimeMs: info.mtimeMs }
    return cache.arquivos[rel]
  }
  contagem.relidos++
  const analise = { tamanho: info.size, mtimeMs: info.mtimeMs, sha1, ...analisarArquivo(rel, texto), manifesto: extrairManifesto(rel, texto) }
  cache.arquivos[rel] = analise
  return analise
}

// Objeto literal que começa no "{" de índice i, até a chave que fecha
function objetoDesde(texto, i) {
  let nivel = 0
  for (let j = i; j < texto.length; j++) {
    if (texto[j] === '{') nivel++
    else if (texto[j] === '}' && --nivel === 0) return texto.slice(i, j + 1)
  }
  return null
}

const STRING_JS = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\$])*`/g

function trechoParaJson(trecho) {
  return trecho
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, '$1')
}

// Converte o literal para JSON sem executar nada: o auditor lê repositório alheio, e avaliar o texto
// rodaria código dele. Variável, chamada ou spread não viram JSON e caem em M00.
function avaliarObjeto(literal) {
  let json = ''
  let fim = 0
  for (const m of literal.matchAll(STRING_JS)) {
    json += trechoParaJson(literal.slice(fim, m.index)) + JSON.stringify(m[0].slice(1, -1).replace(/\\(['"`\\])/g, '$1'))
    fim = m.index + m[0].length
  }
  json += trechoParaJson(literal.slice(fim))
  try {
    return JSON.parse(json.replace(/,(\s*[}\]])/g, '$1'))
  } catch {
    return { naoLido: true }
  }
}

// Manifesto em JSON, em app/manifest.(js|ts) do Next ou no VitePWA({ manifest: {...} })
function extrairManifesto(rel, texto) {
  if (/\.webmanifest$|(^|\/)manifest\.json$/.test(rel)) {
    try { return JSON.parse(texto) } catch { return { naoLido: true } }
  }
  const ehNext = /(^|\/)app\/manifest\.(js|ts)$/.test(rel)
  if (!ehNext && !/vite\.config|nuxt\.config/.test(rel)) return null
  const m = texto.match(ehNext ? /return\s*\{/ : /VitePWA\s*\([\s\S]*?manifest\s*:\s*\{/)
  if (!m) return null
  const literal = objetoDesde(texto, m.index + m[0].length - 1)
  return literal ? avaliarObjeto(literal) : { naoLido: true }
}

function iconesFaltando(raiz, manifesto) {
  const lista = [...(manifesto.icons || []), ...(manifesto.screenshots || [])]
  return lista
    .map(i => i.src)
    .filter(src => src && src.startsWith('/') && !/^\/\//.test(src))
    .filter(src => !existsSync(join(raiz, 'public', src)) && !existsSync(join(raiz, 'static', src)) && !existsSync(join(raiz, src)))
}

// Lê cada arquivo (do cache quando não mudou) e soma fatos, achados e o primeiro manifesto
function varrer(pasta, cache) {
  const contagem = { relidos: 0, reaproveitados: 0 }
  const vistos = {}
  const fatos = new Set()
  const achados = []
  let manifesto = null
  for (const caminho of listarArquivos(pasta)) {
    const analise = analisarComCache(pasta, caminho, cache, contagem)
    vistos[relative(pasta, caminho)] = analise
    analise.fatos.forEach(f => fatos.add(f))
    achados.push(...analise.achados)
    manifesto = manifesto || analise.manifesto
  }
  return { contagem, vistos, fatos, achados, manifesto }
}

// Regras globais: sempre recalculadas, nunca do cache
function achadosGlobais(pasta, fatos, manifesto) {
  const naoLido = Boolean(manifesto?.naoLido)
  const lido = naoLido ? null : manifesto
  const contexto = { fatos, manifesto: lido, iconesFaltando: lido ? iconesFaltando(pasta, lido) : [] }
  const achados = naoLido ? [{ id: 'M00', sev: 'aviso', arquivo: '-', linha: 0, regra: 'Achei o manifesto mas não consegui ler o objeto; confira à mão' }] : []
  for (const regra of REGRAS_GLOBAIS.filter(r => !(naoLido && r.id.startsWith('M')))) {
    if (!regra.falha(contexto)) continue
    achados.push({ id: regra.id, sev: regra.sev, arquivo: '-', linha: 0, regra: regra.detalhe ? `${regra.titulo}: ${regra.detalhe(contexto)}` : regra.titulo })
  }
  return achados
}

export function auditar(raiz, { usarCache = true } = {}) {
  const pasta = resolve(raiz)
  const cache = lerCache(pasta, usarCache)
  const v = varrer(pasta, cache)
  cache.arquivos = v.vistos
  if (usarCache) gravarCache(pasta, cache)
  const achados = [...v.achados, ...achadosGlobais(pasta, v.fatos, v.manifesto)]
  achados.sort((a, b) => ORDEM_SEV[a.sev] - ORDEM_SEV[b.sev] || a.id.localeCompare(b.id) || a.linha - b.linha)
  return { pasta, arquivos: Object.keys(v.vistos).length, cache: v.contagem, achados }
}

const csv = v => (/[,"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

function imprimirToon(r) {
  const por = sev => r.achados.filter(a => a.sev === sev).length
  console.log(`pasta: ${r.pasta}`)
  console.log(`arquivos: ${r.arquivos} (cache: ${r.cache.reaproveitados} reaproveitados, ${r.cache.relidos} relidos)`)
  console.log(`resumo: ${por('erro')} erros, ${por('aviso')} avisos, ${por('dica')} dicas`)
  if (!r.achados.length) {
    console.log('achados: 0 (manifesto, service worker, instalação, push e acabamento nativo em ordem)')
  } else {
    console.log(`achados[${r.achados.length}]{id,sev,arquivo,linha,regra}:`)
    for (const a of r.achados) console.log(`  ${[a.id, a.sev, a.arquivo, a.linha, a.regra].map(csv).join(',')}`)
  }
  console.log('help: cada id tem a correção em skills/pwa-nativo/references/regras.md; rode de novo depois de corrigir')
}

const AJUDA = `uso: auditar.mjs [pasta] [--json] [--sem-cache]
  pasta        projeto a auditar (padrão: pasta atual)
  --json       saída em JSON
  --sem-cache  ignora e não grava .pwa-nativo/cache.json
saída: 0 sem erro, 1 com erro, 2 uso errado`

function principal(args) {
  const opcoes = args.filter(a => a.startsWith('-'))
  const desconhecidas = opcoes.filter(o => !['--json', '--sem-cache', '--ajuda', '-h', '--help'].includes(o))
  if (desconhecidas.length) {
    console.log(`error: opção desconhecida ${desconhecidas.join(' ')}\ncode: USO\nhelp: ${AJUDA.split('\n')[0]}`)
    return 2
  }
  if (opcoes.some(o => ['--ajuda', '-h', '--help'].includes(o))) {
    console.log(AJUDA)
    return 0
  }
  const pasta = args.find(a => !a.startsWith('-')) || '.'
  if (!existsSync(pasta) || !statSync(pasta).isDirectory()) {
    console.log(`error: pasta não existe: ${pasta}\ncode: USO\nhelp: ${AJUDA.split('\n')[0]}`)
    return 2
  }
  const r = auditar(pasta, { usarCache: !opcoes.includes('--sem-cache') })
  if (opcoes.includes('--json')) console.log(JSON.stringify(r, null, 2))
  else imprimirToon(r)
  return r.achados.some(a => a.sev === 'erro') ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(principal(process.argv.slice(2)))
