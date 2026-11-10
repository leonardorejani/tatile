import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COR, RAIO, TIPO, contraste, raioDentro } from '../codigo/tokens.ts'

const ler = (arq: string) => readFileSync(new URL(`../codigo/${arq}`, import.meta.url), 'utf8')

// Le as custom properties de um bloco CSS que comeca no seletor dado
function bloco(css: string, seletor: string) {
  const i = css.indexOf(seletor)
  assert.ok(i >= 0, `bloco ${seletor} nao encontrado`)
  const abre = css.indexOf('{', i)
  let prof = 0, fim = abre
  for (; fim < css.length; fim++) {
    if (css[fim] === '{') prof++
    if (css[fim] === '}' && --prof === 0) break
  }
  const vars: Record<string, string> = {}
  for (const m of css.slice(abre, fim).matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim()
  return vars
}
const px = (v: string) => Number(v.replace('px', ''))

test('tipo.css e TIPO dizem os mesmos tamanhos nas 6 telas', () => {
  const css = ler('tipo.css')
  const base = bloco(css, ':root')
  const tablet = { ...base, ...bloco(css, '@media (min-width: 640px)') }
  const desktop = { ...tablet, ...bloco(css, '@media (min-width: 1024px)') }
  const grande = { ...desktop, ...bloco(css, '@media (min-width: 2200px)') }
  const gigante = { ...grande, ...bloco(css, '@media (min-width: 3000px)') }
  const telas = [['celular', base], ['tablet', tablet], ['desktop', desktop], ['amplo', desktop], ['grande', grande], ['gigante', gigante]] as const
  for (const [tela, vars] of telas)
    for (const [k, v] of Object.entries(TIPO[tela])) assert.equal(px(vars[`texto-${k}`]), v, `${tela} texto-${k}`)
  assert.equal(Number(base['altura-texto']), TIPO.alturaTexto)
  assert.equal(Number(base['altura-titulo']), TIPO.alturaTitulo)
})

test('cor.css e COR dizem as mesmas cores, claro e escuro (sistema e forcado)', () => {
  const css = ler('cor.css')
  const nome = (k: string) => k.replace(/[A-Z0-9]/g, c => '-' + c.toLowerCase())
  const claro = bloco(css, ':root {')
  const escuroSistema = bloco(css, ':root:not([data-tema="claro"])')
  const escuroForcado = bloco(css, ':root[data-tema="escuro"]')
  for (const [k, v] of Object.entries(COR.claro)) assert.equal(claro[nome(k)]?.toUpperCase(), v, `claro ${k}`)
  for (const [k, v] of Object.entries(COR.escuro)) {
    assert.equal(escuroSistema[nome(k)]?.toUpperCase(), v, `escuro (sistema) ${k}`)
    assert.equal(escuroForcado[nome(k)]?.toUpperCase(), v, `escuro (forcado) ${k}`)
  }
})

test('contraste minimo WCAG em todo par de texto, nos dois temas', () => {
  for (const tema of ['claro', 'escuro'] as const) {
    const c = COR[tema]
    const pares: [string, string, string, number][] = [
      ['texto/fundo', c.texto, c.fundo, 4.5],
      ['texto/superficie', c.texto, c.superficie, 4.5],
      ['texto-2/fundo', c.texto2, c.fundo, 4.5],
      ['texto-2/superficie', c.texto2, c.superficie, 4.5],
      ['texto-2/superficie-2', c.texto2, c.superficie2, 4.5],
      ['destaque-texto/destaque', c.destaqueTexto, c.destaque, 4.5],
      ['destaque-bloco-texto/destaque-bloco', c.destaqueBlocoTexto, c.destaqueBloco, 4.5],
      ['destaque/superficie (link)', c.destaque, c.superficie, 4.5],
      ['perigo/superficie', c.perigo, c.superficie, 4.5],
      ['sucesso/superficie', c.sucesso, c.superficie, 4.5],
      ['texto-3/superficie (so texto grande)', c.texto3, c.superficie, 3],
    ]
    for (const [nome, a, b, min] of pares) assert.ok(contraste(a, b) >= min, `${tema} ${nome}: ${contraste(a, b).toFixed(2)} < ${min}`)
  }
})

test('raio concentrico: dentro = fora - padding, nunca menor que 4', () => {
  assert.equal(raioDentro(20, 12), 8)
  assert.equal(raioDentro(20, 16), 4)
  assert.equal(raioDentro(20, 24), 4)
  const css = bloco(ler('forma.css'), ':root')
  assert.equal(px(css['raio-sm']), RAIO.sm)
  assert.equal(px(css['raio']), RAIO.padrao)
  assert.equal(px(css['raio-card']), RAIO.card)
  assert.match(css['raio-dentro'], /max\(4px, calc\(var\(--raio-card\) - var\(--pad/)
})
