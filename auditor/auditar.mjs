#!/usr/bin/env node
// Auditor de código do tatile: acha no projeto os lugares onde as regras do sistema de design
// (espaço, cor, raio, zoom, colar, foco, número, campo, gradiente, brilho, emoji, rótulo em caixa
// alta, movimento, texto de propaganda, hover) são quebradas, sem rede e sem dependência.
//
// Uso: node auditar.mjs <pasta> [--json]
// Saída: 0 sem erro; 1 com achado de severidade erro; 2 uso errado.
// Silenciar uma linha: comentário tatile-ignorar na mesma linha.

import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { REGRAS } from './regras.mjs'

const IGNORAR = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage'])
const EXTENSOES = /\.(css|scss|tsx|jsx|ts|js|html|vue|svelte)$/
// Onde os tokens são definidos: lá o valor literal é o ponto, não o defeito
const ARQUIVO_DE_TOKEN = /^(espaco|cor|tipo|forma|tokens)\.(css|ts)$/
const LIMITE_BYTES = 512 * 1024
const IGNORAR_LINHA = 'tatile-ignorar'
const ORDEM_SEV = { erro: 0, aviso: 1 }

function listarArquivos(pasta, lista = []) {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name) || entrada.isSymbolicLink()) continue
    const caminho = join(pasta, entrada.name)
    if (entrada.isDirectory()) listarArquivos(caminho, lista)
    else if (EXTENSOES.test(entrada.name) && !/\.min\./.test(entrada.name) && lstatSync(caminho).size <= LIMITE_BYTES) lista.push(caminho)
  }
  return lista
}

// Troca comentário por espaço (mantém linhas e colunas) para regra nenhuma ler cor ou medida de comentário
function limparComentarios(texto, ext) {
  const js = !['css', 'html'].includes(ext)
  const html = ['html', 'vue', 'svelte'].includes(ext)
  let saida = ''
  let estado = null
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (c === '\n') {
      saida += c
      if (estado === 'linha') estado = null
      continue
    }
    if (estado === 'bloco' && c === '*' && texto[i + 1] === '/') { saida += '  '; i++; estado = null; continue }
    if (estado === 'html' && texto.startsWith('-->', i)) { saida += '   '; i += 2; estado = null; continue }
    if (estado) { saida += ' '; continue }
    if (c === '/' && texto[i + 1] === '*') { estado = 'bloco'; saida += '  '; i++; continue }
    if (html && texto.startsWith('<!--', i)) { estado = 'html'; saida += '    '; i += 3; continue }
    // "//" colado em ":" ou aspas é URL (https://, "//cdn"), não comentário
    if (js && c === '/' && texto[i + 1] === '/' && !/[:'"`(]/.test(texto[i - 1] ?? '')) { estado = 'linha'; saida += '  '; i++; continue }
    saida += c
  }
  return saida.split('\n')
}

const contar = (s, ch) => s.split(ch).length - 1
const ABRE_BLOCO_TOKEN = /(?:^|[\s,}])(?::root|\[data-tema[^\]]*\])[^{};]*\{/
const DEFINE_VARIAVEL = /(?:^|[\s;{'"`])--[a-z][\w-]*['"]?\s*:/i

// opcoes: o que só o projeto sabe. { tailwindHoverSemMouse: true } quando o Tailwind (v3) está
// configurado sem future.hoverOnlyWhenSupported. Sem isso, as regras de hover olham só o CSS puro.
export function analisarArquivo(rel, texto, opcoes = {}) {
  const nome = rel.split('/').pop()
  if (ARQUIVO_DE_TOKEN.test(nome)) return []
  const ext = nome.split('.').pop()
  const brutas = texto.split('\n')
  const linhas = limparComentarios(texto, ext)
  const base = {
    arquivo: rel, ext, linhas, texto: linhas.join('\n'),
    css: ['css', 'scss', 'html', 'vue', 'svelte'].includes(ext),
    marcacao: ['tsx', 'jsx', 'html', 'vue', 'svelte'].includes(ext),
  }
  const achados = []
  const jaAchou = new Set()
  let pilha = []
  let pendente = ''
  let nivelToken = 0 // chaves abertas dentro de :root / [data-tema] (0 = fora do bloco)
  let emSvg = false

  linhas.forEach((linha, i) => {
    // Seletor da linha: o que abriu nela, ou o bloco que continua aberto
    const topo = pilha.at(-1) ?? ''
    let abriu = null
    for (const ch of linha) {
      if (ch === '{') { abriu = pendente.trim(); pilha.push(abriu); pendente = '' }
      else if (ch === '}') { pilha.pop(); pendente = '' }
      else if (ch === ';') pendente = ''
      else pendente += ch
    }
    pendente += '\n'

    // Bloco de token: a linha que abre, as de dentro e a que fecha ficam de fora
    let emBloco = nivelToken > 0
    if (nivelToken > 0) nivelToken += contar(linha, '{') - contar(linha, '}')
    else {
      const m = linha.match(ABRE_BLOCO_TOKEN)
      if (m) {
        emBloco = true
        const resto = linha.slice(m.index)
        nivelToken = Math.max(0, contar(resto, '{') - contar(resto, '}'))
      }
    }

    if (/<svg\b/.test(linha)) emSvg = true
    const dentroSvg = emSvg
    if (/<\/svg>/.test(linha)) emSvg = false

    if (emBloco || DEFINE_VARIAVEL.test(linha) || brutas[i].includes(IGNORAR_LINHA) || !linha.trim()) return
    const ctx = {
      ...base, indice: i, seletor: abriu ?? topo, emSvg: dentroSvg, projeto: opcoes,
      // blocos abertos nesta linha (para saber se está dentro de @media ou @keyframes)
      pilha: [...pilha],
    }
    for (const regra of REGRAS) {
      if (regra.unicaPorArquivo && jaAchou.has(regra.id)) continue
      const r = regra.testar(linha, ctx)
      if (!r) continue
      jaAchou.add(regra.id)
      const detalhe = typeof r === 'string' ? ` (${r})` : ''
      achados.push({ severidade: regra.severidade, arquivo: rel, linha: i + 1, regra: regra.id, mensagem: `${regra.descricao}${detalhe}: ${regra.correcao}` })
    }
  })
  return achados
}

// Tailwind v3 só protege o hover de toque com future.hoverOnlyWhenSupported. A v4 já protege.
// Sem config do Tailwind na raiz não dá para saber: fica de fora (só CSS puro).
function opcoesDoProjeto(raiz) {
  const lerSe = nome => { try { return readFileSync(join(raiz, nome), 'utf8') } catch { return null } }
  const config = ['js', 'cjs', 'mjs', 'ts'].map(e => lerSe(`tailwind.config.${e}`)).find(c => c !== null)
  if (config == null) return {}
  const pacote = lerSe('package.json') ?? ''
  const versao = pacote.match(/"tailwindcss"\s*:\s*"[^\d"]*(\d+)/)
  const v4 = versao && Number(versao[1]) >= 4
  return { tailwindHoverSemMouse: !v4 && !/hoverOnlyWhenSupported\s*:\s*true/.test(config) }
}

export function auditar(pasta) {
  const raiz = resolve(pasta)
  const arquivos = listarArquivos(raiz)
  const opcoes = opcoesDoProjeto(raiz)
  const achados = arquivos.flatMap(f => analisarArquivo(relative(raiz, f), readFileSync(f, 'utf8'), opcoes))
  achados.sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha || ORDEM_SEV[a.severidade] - ORDEM_SEV[b.severidade] || a.regra.localeCompare(b.regra))
  return { arquivos: arquivos.length, achados }
}

const AJUDA = 'uso: node auditar.mjs <pasta> [--json]\nsaída: 0 sem erro, 1 com erro, 2 uso errado'

function principal(args) {
  const opcoes = args.filter(a => a.startsWith('-'))
  const desconhecidas = opcoes.filter(o => o !== '--json')
  const pastas = args.filter(a => !a.startsWith('-'))
  if (desconhecidas.length || pastas.length !== 1) {
    console.error(`${desconhecidas.length ? `opção desconhecida ${desconhecidas.join(' ')}` : 'informe uma pasta'}\n${AJUDA}`)
    return 2
  }
  if (!ehPasta(pastas[0])) {
    console.error(`pasta não existe: ${pastas[0]}\n${AJUDA}`)
    return 2
  }
  const r = auditar(pastas[0])
  if (opcoes.includes('--json')) console.log(JSON.stringify(r, null, 2))
  else {
    for (const a of r.achados) console.log(`${a.severidade}  ${a.arquivo}:${a.linha}  ${a.regra}  ${a.mensagem}`)
    const por = s => r.achados.filter(a => a.severidade === s).length
    console.log(`${r.arquivos} arquivos, ${por('erro')} erros, ${por('aviso')} avisos`)
  }
  return r.achados.some(a => a.severidade === 'erro') ? 1 : 0
}

// statSync segue link simbólico: link para pasta também vale como pasta
function ehPasta(p) {
  try { return statSync(p).isDirectory() } catch { return false }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exit(principal(process.argv.slice(2)))
