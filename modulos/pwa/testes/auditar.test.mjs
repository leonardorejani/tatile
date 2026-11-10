import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { auditar } from '../scripts/auditar.mjs'

const FIXTURES = new URL('./fixtures/', import.meta.url).pathname
const SCRIPT = new URL('../scripts/auditar.mjs', import.meta.url).pathname

// Cada teste trabalha numa cópia, para o cache e as edições não sujarem os exemplos
function copia(nome) {
  const pasta = mkdtempSync(join(tmpdir(), `pwa-nativo-${nome}-`))
  cpSync(join(FIXTURES, nome), pasta, { recursive: true })
  return pasta
}
const ids = r => new Set(r.achados.map(a => a.id))

test('projeto bom sai limpo', () => {
  const pasta = copia('bom')
  const r = auditar(pasta, { usarCache: false })
  assert.deepEqual(r.achados, [])
  rmSync(pasta, { recursive: true })
})

test('projeto ruim acusa cada defeito plantado, com arquivo e linha', () => {
  const pasta = copia('ruim')
  const r = auditar(pasta, { usarCache: false })
  for (const id of ['M02', 'M03', 'M05', 'M08', 'S01', 'N06', 'N05', 'N08', 'N07', 'P02', 'P03', 'N01', 'N03', 'N04', 'D03']) {
    assert.ok(ids(r).has(id), `faltou ${id}`)
  }
  const zoom = r.achados.find(a => a.id === 'N06')
  assert.equal(zoom.arquivo, 'app/layout.js')
  assert.equal(zoom.linha, 1)
  assert.equal(zoom.sev, 'erro')
  const chave = r.achados.find(a => a.id === 'P02')
  assert.equal(chave.arquivo, 'app/Avisos.jsx')
  assert.equal(chave.linha, 2)
  rmSync(pasta, { recursive: true })
})

test('cache: segunda rodada reaproveita tudo e dá o mesmo resultado', () => {
  const pasta = copia('ruim')
  const primeira = auditar(pasta)
  assert.equal(primeira.cache.reaproveitados, 0)
  assert.equal(primeira.cache.relidos, primeira.arquivos)
  const segunda = auditar(pasta)
  assert.equal(segunda.cache.relidos, 0)
  assert.equal(segunda.cache.reaproveitados, segunda.arquivos)
  assert.deepEqual(segunda.achados, primeira.achados)
  rmSync(pasta, { recursive: true })
})

test('cache: editar um arquivo invalida só ele e muda o resultado', () => {
  const pasta = copia('ruim')
  auditar(pasta)
  writeFileSync(join(pasta, 'app/layout.js'), "export const viewport = { width: 'device-width', initialScale: 1 }\n")
  const r = auditar(pasta)
  assert.equal(r.cache.relidos, 1)
  assert.equal(r.cache.reaproveitados, r.arquivos - 1)
  assert.ok(!ids(r).has('N06'), 'zoom bloqueado devia ter sumido depois da correção')
  rmSync(pasta, { recursive: true })
})

test('cache: só a data mudou, o sha1 confirma e não relê a análise', () => {
  const pasta = copia('ruim')
  auditar(pasta)
  const agora = new Date(Date.now() + 60_000)
  utimesSync(join(pasta, 'app/globals.css'), agora, agora)
  const r = auditar(pasta)
  assert.equal(r.cache.relidos, 0)
  const cache = JSON.parse(readFileSync(join(pasta, '.pwa-nativo/cache.json'), 'utf8'))
  assert.equal(Math.round(cache.arquivos['app/globals.css'].mtimeMs / 1000), Math.round(agora.getTime() / 1000))
  rmSync(pasta, { recursive: true })
})

test('cache: arquivo apagado sai do cache e leva o achado junto', () => {
  const pasta = copia('ruim')
  auditar(pasta)
  rmSync(join(pasta, 'app/Avisos.jsx'))
  const r = auditar(pasta)
  assert.ok(!ids(r).has('P02'))
  const cache = JSON.parse(readFileSync(join(pasta, '.pwa-nativo/cache.json'), 'utf8'))
  assert.ok(!('app/Avisos.jsx' in cache.arquivos))
  rmSync(pasta, { recursive: true })
})

test('cache: versão diferente descarta tudo', () => {
  const pasta = copia('ruim')
  auditar(pasta)
  const arquivo = join(pasta, '.pwa-nativo/cache.json')
  writeFileSync(arquivo, JSON.stringify({ ...JSON.parse(readFileSync(arquivo, 'utf8')), versao: 0 }))
  const r = auditar(pasta)
  assert.equal(r.cache.reaproveitados, 0)
  rmSync(pasta, { recursive: true })
})

test('ícone apagado é sempre conferido no disco, mesmo com o manifesto em cache', () => {
  const pasta = copia('bom')
  assert.ok(!ids(auditar(pasta)).has('M08'))
  rmSync(join(pasta, 'public/icons/icon-512.png'))
  const r = auditar(pasta)
  assert.equal(r.cache.relidos, 0)
  assert.ok(ids(r).has('M08'))
  rmSync(pasta, { recursive: true })
})

test('manifesto em JS é lido sem executar o código do projeto auditado', () => {
  const pasta = copia('bom')
  const arquivo = join(pasta, 'app/manifest.js')
  const original = readFileSync(arquivo, 'utf8')
  writeFileSync(arquivo, original.replace(/return\s*\{/, "return { invasao: (globalThis.__pwaNativoExecutou = true, 'x'),"))
  const r = auditar(pasta, { usarCache: false })
  assert.equal(globalThis.__pwaNativoExecutou, undefined, 'o auditor executou código do repositório')
  assert.ok(ids(r).has('M00'))
  writeFileSync(arquivo, original)
  assert.ok(!ids(auditar(pasta, { usarCache: false })).has('M00'), 'o manifesto do exemplo bom devia ser lido sem execução')
  rmSync(pasta, { recursive: true })
})

test('--sem-cache não grava nada', () => {
  const pasta = copia('bom')
  auditar(pasta, { usarCache: false })
  assert.ok(!existsSync(join(pasta, '.pwa-nativo')))
  rmSync(pasta, { recursive: true })
})

test('CLI: exit 0 limpo, 1 com erro, 2 em uso errado', () => {
  const bom = copia('bom')
  const ruim = copia('ruim')
  assert.equal(spawnSync('node', [SCRIPT, bom]).status, 0)
  const r = spawnSync('node', [SCRIPT, ruim], { encoding: 'utf8' })
  assert.equal(r.status, 1)
  assert.match(r.stdout, /achados\[\d+\]\{id,sev,arquivo,linha,regra\}:/)
  const uso = spawnSync('node', [SCRIPT, bom, '--inventada'], { encoding: 'utf8' })
  assert.equal(uso.status, 2)
  assert.match(uso.stdout, /code: USO/)
  assert.equal(spawnSync('node', [SCRIPT, '/pasta/que/nao/existe']).status, 2)
  rmSync(bom, { recursive: true })
  rmSync(ruim, { recursive: true })
})
