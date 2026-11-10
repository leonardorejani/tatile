import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CURVA, MOV, contarValor, elastico } from '../codigo/movimento.ts'

const css = readFileSync(new URL('../codigo/movimento.css', import.meta.url), 'utf8')
const raiz = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')))
const vars: Record<string, string> = {}
for (const m of raiz.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim()
const kebab = (k: string) => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())

test('movimento.css e MOV dizem as mesmas duracoes', () => {
  for (const [k, v] of Object.entries(MOV)) assert.equal(vars[`mov-${kebab(k)}`], `${v}ms`, k)
})

test('movimento.css e CURVA dizem as mesmas curvas', () => {
  for (const k of ['move', 'entra', 'sai', 'salto'] as const)
    assert.equal(vars[`curva-${k}`].replace(/\s/g, ''), CURVA[k], k)
})

test('saida e 70% da entrada em cada papel', () => {
  for (const [entra, sai] of [['rapido', 'saiRapido'], ['padrao', 'saiPadrao'], ['lento', 'saiLento']] as const)
    assert.ok(Math.abs(MOV[sai] / MOV[entra] - 0.7) < 0.03, `${sai}: ${MOV[sai]} de ${MOV[entra]}`)
})

test('reduced motion zera todas as duracoes e so elas', () => {
  const i = css.indexOf('prefers-reduced-motion')
  const bloco = css.slice(i, css.indexOf('/* Retorno ao apertar'))
  const zeradas = [...bloco.matchAll(/--(mov-[\w-]+):\s*0\.01ms/g)].map(m => m[1]).sort()
  const todas = Object.keys(MOV).map(k => `mov-${kebab(k)}`).sort()
  assert.deepEqual(zeradas, todas)
})

test('elastico: zero, resistencia, nunca passa do limite, sinal preservado', () => {
  assert.equal(elastico(0, 80), 0)
  assert.equal(elastico(10, 0), 0)
  assert.ok(elastico(120, 80) < 120 * 0.55 + 0.001, 'anda menos que o dedo')
  assert.ok(elastico(120, 80) > 0)
  assert.ok(elastico(100000, 80) < 80, 'nunca passa do limite')
  assert.equal(elastico(-120, 80), -elastico(120, 80))
  // cada pixel a mais rende menos que o anterior
  const passo = (d: number) => elastico(d + 10, 80) - elastico(d, 80)
  assert.ok(passo(0) > passo(40) && passo(40) > passo(160))
  // sempre cresce
  for (let d = 0; d < 400; d += 20) assert.ok(elastico(d + 20, 80) > elastico(d, 80))
})

test('contarValor: ease-out cubico, comeca e termina certo, aceita descer', () => {
  assert.equal(contarValor(100, 200, 0), 100)
  assert.equal(contarValor(100, 200, 1), 200)
  assert.equal(contarValor(100, 200, 2), 200, 'passou do fim: trava')
  assert.equal(contarValor(100, 200, -1), 100)
  assert.ok(contarValor(0, 100, 0.5) > 50, 'ease-out: passa da metade na metade do tempo')
  assert.equal(contarValor(0, 100, 0.5), 87.5)
  assert.equal(contarValor(200, 100, 1), 100)
  assert.ok(contarValor(200, 100, 0.5) < 150)
})
