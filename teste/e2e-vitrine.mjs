// A vitrine (teste/vitrine.html) e a referencia viva da 1.1: confere que cada demo faz o
// que promete, no desktop e no celular.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { servir } from './servir.mjs'

const server = await servir(0)
const url = `http://localhost:${server.address().port}/vitrine.html`
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const resultados = []
async function caso(nome, fn) {
  try { await fn(); resultados.push(['ok', nome]) } catch (e) { resultados.push(['FALHOU', nome, e.message]) }
}

for (const largura of [1280, 390]) {
  const page = await browser.newPage({ viewport: { width: largura, height: 900 }, ...(largura < 640 ? { isMobile: true, hasTouch: true } : {}) })
  const erros = []
  page.on('pageerror', e => erros.push(String(e)))
  page.on('console', m => m.type() === 'error' && erros.push(m.text()))
  await page.goto(url)
  await page.waitForTimeout(500)

  await caso(`${largura}px: 20 tecnicas, sem erro e sem rolagem lateral`, async () => {
    assert.equal(await page.locator('article.item').count(), 20)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0)
  })
  await caso(`${largura}px: resposta rapida pisca o skeleton no Antes e nao no Depois`, async () => {
    await page.click('[data-busca="120"]')
    await page.waitForTimeout(60)
    assert.ok((await page.locator('[data-carga="antes"] .sk').count()) > 0)
    assert.equal(await page.locator('[data-carga="depois"] .sk').count(), 0)
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-carga="depois"] .sk').count(), 0)
  })
  await caso(`${largura}px: excluir mostra Desfazer e Desfazer devolve o item`, async () => {
    await page.click('[data-lista="depois"] [data-apaga]')
    assert.equal(await page.locator('[data-lista="depois"] .d-linha').count(), 2)
    await page.click('.d-toast button')
    assert.equal(await page.locator('[data-lista="depois"] .d-linha').count(), 3)
  })
  await caso(`${largura}px: aba vai para a URL so no Depois`, async () => {
    await page.click('[data-abas="depois"] button:nth-child(3)')
    assert.equal(await page.textContent('[data-url="depois"]'), 'acme.app/pedidos?aba=enviados')
    await page.click('[data-abas="antes"] button:nth-child(3)')
    assert.equal(await page.textContent('[data-url="antes"]'), 'acme.app/pedidos')
  })
  await caso(`${largura}px: menu pisca uma vez so, na cor de destaque do app`, async () => {
    const item = page.locator('[data-menu="depois"] div').nth(1)
    await item.click()
    const anim = await item.evaluate(el => {
      const c = getComputedStyle(el)
      return { nome: c.animationName, vezes: c.animationIterationCount, cor: c.backgroundColor, destaque: getComputedStyle(document.documentElement).getPropertyValue('--destaque').trim() }
    })
    assert.equal(anim.nome, 'pisca')
    assert.equal(anim.vezes, '1')
    assert.ok(anim.destaque, 'token --destaque ausente')
  })
  await caso(`${largura}px: tema escuro troca o card de tokens, o de cor solta fica branco`, async () => {
    await page.click('[data-tema="escuro"]')
    await page.waitForTimeout(350)
    const cores = await page.evaluate(() => ({
      solto: getComputedStyle(document.querySelector('[data-tema-alvo="solto"] > div')).backgroundColor,
      token: getComputedStyle(document.querySelector('[data-tema-alvo="token"] > div')).backgroundColor,
    }))
    assert.equal(cores.solto, 'rgb(255, 255, 255)')
    assert.notEqual(cores.token, 'rgb(255, 255, 255)')
  })
  await caso(`${largura}px: nenhum erro de pagina ou console`, async () => assert.deepEqual(erros, []))
  await page.close()
}

await browser.close()
server.close()
for (const [s, n, m] of resultados) console.log(`${s === 'ok' ? 'ok    ' : 'FALHOU'} ${n}${m ? `\n       ${m}` : ''}`)
process.exit(resultados.some(r => r[0] !== 'ok') ? 1 : 0)
