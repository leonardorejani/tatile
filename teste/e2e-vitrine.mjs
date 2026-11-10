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
  await caso(`${largura}px: explora: texto do Depois com contraste minimo 4,5 (3 se grande)`, async () => {
    await page.locator('[data-perigo="depois"]').scrollIntoViewIfNeeded()
    await page.focus('[data-perigo="depois"]'); await page.keyboard.down('Enter'); await page.waitForTimeout(1100) // deixa o aviso com Desfazer na tela
    const ruins = await page.evaluate(() => {
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,/]+/).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
      const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) }
      const sobre = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]))
      const fundo = el => { const cam = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) { cam.push(c); if (c[3] >= .99) break } } let b = [255, 255, 255]; for (const c of cam.reverse()) b = sobre(c, b); return b }
      const out = [], w = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT), vistos = new Set()
      while (w.nextNode()) {
        const el = w.currentNode.parentElement
        if (!w.currentNode.textContent.trim() || vistos.has(el) || !el.closest('.lado.depois')) continue
        vistos.add(el)
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || !el.offsetParent) continue
        const bg = fundo(el), fg = sobre(parse(cs.color), bg)
        const L1 = lum(fg), L2 = lum(bg), cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)
        const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700)
        if (cr < (grande ? 3 : 4.5)) out.push(`${cr.toFixed(2)} "${el.textContent.trim().slice(0, 28)}"`)
      }
      return out
    })
    await page.keyboard.up('Enter'); await page.click('[data-toast-perigo] button')
    assert.deepEqual(ruins, [])
  })
  await caso(`${largura}px: explora: URL do Depois nao leva a aba padrao`, async () => {
    const url = () => page.textContent('[data-url="depois"]')
    await page.locator('[data-abas="depois"]').scrollIntoViewIfNeeded()
    await page.reload(); await page.waitForTimeout(300)
    assert.equal(await url(), 'acme.app/pedidos', 'abre com ?aba=todos')
    await page.click('[data-abas="depois"] button:nth-child(2)')
    assert.equal(await url(), 'acme.app/pedidos?aba=pagos')
    await page.click('[data-abas="depois"] button:nth-child(1)')
    assert.equal(await url(), 'acme.app/pedidos', 'voltar para Todos deixou ?aba=todos')
  })
  await caso(`${largura}px: explora: segurar 1 s com o mouse exclui e o Desfazer devolve, e o aviso some em 5 s`, async () => {
    const b = page.locator('[data-perigo="depois"]'); await b.scrollIntoViewIfNeeded()
    const box = await b.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(1150); await page.mouse.up()
    assert.equal(await page.locator('[data-toast-perigo] button').innerText(), 'Desfazer', 'sem Desfazer depois de excluir')
    assert.equal(await b.isHidden(), true, 'projeto continua na tela')
    await page.click('[data-toast-perigo] button')
    assert.equal(await b.isVisible(), true, 'Desfazer nao devolveu')
    assert.equal(await page.locator('[data-toast-perigo]').count(), 0)
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(1150); await page.mouse.up()
    await page.waitForTimeout(4400)
    assert.equal(await page.locator('[data-toast-perigo]').count(), 1, 'Desfazer sumiu antes dos 5 s')
    await page.waitForTimeout(900)
    assert.equal(await page.locator('[data-toast-perigo]').count(), 0, 'Desfazer nao sumiu')
    assert.equal(await b.isVisible(), true)
    assert.match(await page.textContent('[data-msg="depois"]'), /de vez/)
  })
  await caso(`${largura}px: explora: Enter e Espaco segurados 1 s fazem o mesmo, soltar antes cancela`, async () => {
    const sel = '[data-perigo="depois"]'
    await page.locator(sel).scrollIntoViewIfNeeded(); await page.focus(sel)
    await page.keyboard.down(' '); await page.waitForTimeout(300); await page.keyboard.up(' ')
    assert.equal(await page.locator('[data-toast-perigo]').count(), 0, 'soltou antes e excluiu')
    assert.match(await page.textContent('[data-msg="depois"]'), /Soltou antes/)
    for (const tecla of ['Enter', ' ']) {
      await page.keyboard.down(tecla); await page.waitForTimeout(1150); await page.keyboard.up(tecla)
      assert.equal(await page.locator('[data-toast-perigo] button').count(), 1, `${JSON.stringify(tecla)} segurado nao excluiu`)
      await page.click('[data-toast-perigo] button')
      assert.equal(await page.isVisible(sel), true)
      await page.focus(sel)
    }
  })
  await caso(`${largura}px: nenhum erro de pagina ou console`, async () => assert.deepEqual(erros, []))
  await page.close()
}

// index de teste a 390: os tres botoes de Tatile 1.1 com respiro e sem texto colado na borda
{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true })
  await page.goto(url.replace('vitrine.html', ''))
  await caso('390px: explora: index com botoes de padding decente e texto em no maximo 2 linhas', async () => {
    const bs = await page.$$eval('a.btn', as => as.map(a => {
      const r = document.createRange(); r.selectNodeContents(a)
      const t = r.getBoundingClientRect(), b = a.getBoundingClientRect(), cs = getComputedStyle(a)
      return { txt: a.textContent.trim(), esq: t.left - b.left, dir: b.right - t.right, linhas: Math.round(t.height / parseFloat(cs.lineHeight)), pad: parseFloat(cs.paddingLeft) }
    }))
    for (const b of bs) {
      assert.ok(b.pad >= 12 && b.esq >= 12 && b.dir >= 12, `"${b.txt}" encostado na borda (padding ${b.pad}, folga ${b.esq}/${b.dir})`)
      assert.ok(b.linhas <= 2, `"${b.txt}" quebrou em ${b.linhas} linhas`)
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0)
  })
  await page.close()
}

await browser.close()
server.close()
for (const [s, n, m] of resultados) console.log(`${s === 'ok' ? 'ok    ' : 'FALHOU'} ${n}${m ? `\n       ${m}` : ''}`)
process.exit(resultados.some(r => r[0] !== 'ok') ? 1 : 0)
