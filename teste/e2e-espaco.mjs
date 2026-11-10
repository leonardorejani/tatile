// Mede na pagina real (desktop.html, que le codigo/espaco.css) a distancia
// entre os elementos em cada largura e compara com codigo/espaco.ts.
// Prova que o CSS e o TS dizem o mesmo e que cada tela recebe o valor certo.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { ESPACO, espacoPara } from '../codigo/espaco.ts'
import { servir } from './servir.mjs'

const server = await servir(0)
const url = `http://localhost:${server.address().port}/espacamento/desktop.html`
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const resultados = []

async function medir(largura, versao = 'com') {
  const celular = largura < 640
  const page = await browser.newPage({ viewport: { width: largura, height: 900 }, ...(celular ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) })
  const erros = []
  page.on('pageerror', e => erros.push(String(e)))
  page.on('console', m => m.type() === 'error' && erros.push(m.text()))
  await page.goto(`${url}?versao=${versao}`)
  await page.evaluate(() => document.querySelector('.controles').remove())
  await page.waitForTimeout(350) // transicoes de 260ms
  const m = await page.evaluate(() => {
    const r = s => document.querySelector(`[data-testid=${s}]`).getBoundingClientRect()
    const conteudo = r('conteudo'), topo = document.querySelector('.topo').getBoundingClientRect()
    return {
      margem: topo.left - conteudo.left,
      pad: r('dentro-card').left - r('card').left,
      secao: r('secao-2').top - r('secao-1').bottom,
      linha: r('linha').height,
      icone: r('linha-texto').left - r('icone').right,
      grade: r('eq-2').left - r('eq-1').right,
      larguraConteudo: conteudo.width,
      rolagemLateral: document.documentElement.scrollWidth - innerWidth,
      menuLateral: getComputedStyle(document.querySelector('.lateral')).flexDirection === 'column',
    }
  })
  await page.close()
  return { ...m, erros }
}

async function caso(nome, fn) {
  try { await fn(); resultados.push(['ok', nome]) } catch (e) { resultados.push(['FALHOU', nome, e.message]) }
}
const perto = (a, b, nome) => assert.ok(Math.abs(a - b) < 0.5, `${nome}: medido ${a.toFixed(1)}, esperado ${b}`)

for (const [largura, tela] of [[390, 'celular'], [800, 'tablet'], [1280, 'desktop'], [1920, 'amplo'], [2560, 'grande'], [3840, 'gigante']]) {
  await caso(`${tela} ${largura}px: os 6 espacamentos batem com espaco.ts`, async () => {
    const m = await medir(largura)
    const e = espacoPara(largura)
    assert.equal(e, ESPACO[tela])
    // monitor grande: a pagina inteira amplia por e.escala (zoom), a medida na tela vem multiplicada
    for (const k of ['margem', 'pad', 'secao', 'linha', 'icone', 'grade']) perto(m[k], e[k] * e.escala, k)
    assert.equal(m.rolagemLateral, 0, 'rolagem lateral')
    assert.deepEqual(m.erros, [])
  })
}

await caso('menu lateral a partir de 768px (mesmo corte do pwa-nativo)', async () => {
  assert.equal((await medir(767)).menuLateral, false)
  assert.equal((await medir(768)).menuLateral, true)
})

// Ate 1599 o conteudo para em 1200. A partir de Full HD a tela de 1440 amplia inteira por zoom
// (pedidos de 10/11/2026: primeiro "nada fica zoado em Full HD, QHD e 4K", depois "e justamente
// pra nao ficar pequeno assim", sobre o 4K com so espaco e texto crescendo)
await caso('tela larga: 1200 ate 1599, depois 1440 ampliado por 1.15 (Full HD), 1.4 (QHD) e 2 (4K)', async () => {
  for (const [largura, max] of [[1500, 1200], [1920, 1440 * 1.15], [2560, 1440 * 1.4], [3840, 1440 * 2]]) {
    const m = await medir(largura)
    assert.ok(Math.abs(m.larguraConteudo - max) < 2, `${largura}: largura ${m.larguraConteudo}, esperado ${max}`)
  }
})

await caso('sem a regra: tudo no mesmo valor (16/16/16/44/8/16)', async () => {
  const m = await medir(1280, 'sem')
  const sem = { margem: 16, pad: 16, secao: 16, linha: 44, icone: 8, grade: 16 }
  for (const k of Object.keys(sem)) perto(m[k], sem[k], k)
})

// Prototipo do celular: um aparelho so, Sem/Com anima os 5 espacamentos no lugar
const urlCelular = url.replace('desktop.html', 'celular.html')
const SEM = { margem: 12, pad: 12, secao: 12, linha: 44, icone: 8 }
const COM = { margem: 20, pad: 16, secao: 32, linha: 60, icone: 12 }
const medirCelular = () => {
  const r = s => document.querySelector(s).getBoundingClientRect()
  return {
    margem: r('.topo').left - r('.rolagem').left,
    pad: r('.meta-topo').left - r('.card').left,
    secao: r('.espaco').height,
    linha: r('.linha').height,
    icone: r('.gap-icone').width,
    rolagemLateral: document.documentElement.scrollWidth - innerWidth,
  }
}
for (const largura of [390, 1280]) {
  await caso(`celular.html em ${largura}px: Sem e Com batem com o post e a troca anima`, async () => {
    const page = await browser.newPage({ viewport: { width: largura, height: 900 }, ...(largura < 640 ? { isMobile: true, hasTouch: true } : {}) })
    const erros = []
    page.on('pageerror', e => erros.push(String(e)))
    await page.goto(urlCelular)
    await page.click('.seg [data-versao=sem]')
    await page.waitForTimeout(450)
    const sem = await page.evaluate(medirCelular)
    for (const k of Object.keys(SEM)) perto(sem[k], SEM[k], `sem ${k}`)
    await page.click('.seg [data-versao=com]')
    await page.waitForTimeout(120) // no meio da transicao de 320ms
    const meio = await page.evaluate(medirCelular)
    assert.ok(meio.secao > SEM.secao + 1 && meio.secao < COM.secao - 1, `secao no meio da animacao: ${meio.secao}`)
    await page.waitForTimeout(450)
    const com = await page.evaluate(medirCelular)
    for (const k of Object.keys(COM)) perto(com[k], COM[k], `com ${k}`)
    assert.equal(com.rolagemLateral, 0, 'rolagem lateral')
    const chips = await page.$$eval('.token b', bs => bs.map(b => b.textContent))
    assert.deepEqual(chips, ['20px', '16px', '32px', '60px', '12px'])
    assert.deepEqual(erros, [])
    await page.close()
  })
}

// Prototipo do tablet: desktop.html dentro da moldura; retrato = tokens de tablet, paisagem = desktop
await caso('tablet.html: retrato usa tokens de tablet, paisagem de desktop, Sem/Com e chips batem', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const erros = []
  page.on('pageerror', e => erros.push(String(e)))
  await page.goto(url.replace('desktop.html', 'tablet.html'))
  const frame = page.frameLocator('#tela')
  await frame.locator('[data-testid=conteudo]').waitFor()
  const quadro = page.frames().find(f => f.url().includes('desktop.html'))
  const medirQuadro = () => quadro.evaluate(() => {
    const r = s => document.querySelector(`[data-testid=${s}]`).getBoundingClientRect()
    return {
      margem: document.querySelector('.topo').getBoundingClientRect().left - r('conteudo').left,
      pad: r('dentro-card').left - r('card').left,
      secao: r('secao-2').top - r('secao-1').bottom,
      linha: r('linha').height,
      icone: r('linha-texto').left - r('icone').right,
      grade: r('eq-2').left - r('eq-1').right,
      largura: innerWidth,
      controles: !!document.querySelector('.controles'),
      rolagemLateral: document.documentElement.scrollWidth - innerWidth,
    }
  })
  const chips = () => page.$$eval('.token b', bs => bs.map(b => parseFloat(b.textContent)))
  await page.waitForTimeout(450)
  let m = await medirQuadro()
  assert.equal(m.largura, 820)
  assert.equal(m.controles, false, 'controles do desktop dentro da moldura')
  for (const k of ['margem', 'pad', 'secao', 'linha', 'icone', 'grade']) perto(m[k], ESPACO.tablet[k], `retrato ${k}`)
  assert.deepEqual(await chips(), [32, 20, 40, 56, 12, 16])
  assert.equal(m.rolagemLateral, 0)

  await page.click('[data-orientacao=paisagem]')
  await page.waitForTimeout(700)
  m = await medirQuadro()
  assert.equal(m.largura, 1180)
  for (const k of ['margem', 'pad', 'secao', 'linha', 'icone', 'grade']) perto(m[k], ESPACO.desktop[k], `paisagem ${k}`)
  assert.deepEqual(await chips(), [40, 24, 56, 52, 12, 24])

  await page.click('[data-versao=sem]')
  await page.waitForTimeout(450)
  m = await medirQuadro()
  for (const [k, v] of Object.entries({ margem: 16, pad: 16, secao: 16, linha: 44, icone: 8, grade: 16 })) perto(m[k], v, `sem ${k}`)
  assert.deepEqual(erros, [])
  await page.close()
})

await browser.close()
server.close()
for (const [s, n, msg] of resultados) console.log(`${s === 'ok' ? 'ok    ' : 'FALHOU'} ${n}${msg ? `\n       ${msg}` : ''}`)
process.exit(resultados.some(r => r[0] !== 'ok') ? 1 : 0)
