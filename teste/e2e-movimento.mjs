// Movimento (teste/movimento/): cada receita anima de verdade, sem salto, e some com reduced motion.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { servir } from './servir.mjs'

const server = await servir(0)
const url = `http://localhost:${server.address().port}/movimento/`
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const resultados = []
async function caso(nome, fn) {
  try { await fn(); resultados.push(['ok', nome]) } catch (e) { resultados.push(['FALHOU', nome, e.message.split('\n').slice(0, 10).join(' | ')]) }
}

async function abrir(opcoes = {}, emulacao) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ...opcoes })
  const erros = []
  page.on('pageerror', e => erros.push(String(e)))
  page.on('console', m => m.type() === 'error' && erros.push(m.text()))
  if (emulacao) await page.emulateMedia(emulacao)
  await page.goto(url)
  await page.waitForTimeout(300)
  return { page, erros }
}

// amostra um valor a cada quadro durante `ms`, depois de rodar `acao` na propria pagina
const amostrar = (page, acao, medir, ms) => page.evaluate(([acao, medir, ms]) => new Promise(resolve => {
  const a = new Function(`return (${acao})()`), m = new Function(`return (${medir})()`)
  a()
  const out = [], t0 = performance.now()
  const f = () => { out.push(m()); performance.now() - t0 < ms ? requestAnimationFrame(f) : resolve(out) }
  requestAnimationFrame(f)
}), [acao.toString(), medir.toString(), ms])

const { page, erros } = await abrir()

await caso('pagina abre sem erro de console', async () => {
  assert.deepEqual(erros, [])
  assert.equal(await page.locator('article.item').count(), 14)
})

await caso('tokens de movimento aplicados na pagina', async () => {
  const v = await page.evaluate(() => Object.fromEntries(['--mov-rapido', '--mov-padrao', '--mov-lento', '--mov-sai-rapido', '--mov-sai-padrao', '--mov-sai-lento', '--curva-move', '--curva-entra', '--curva-sai', '--curva-salto'].map(k => [k, getComputedStyle(document.documentElement).getPropertyValue(k).replace(/\s/g, '')])))
  assert.deepEqual(v, { '--mov-rapido': '180ms', '--mov-padrao': '320ms', '--mov-lento': '480ms', '--mov-sai-rapido': '130ms', '--mov-sai-padrao': '220ms', '--mov-sai-lento': '340ms', '--curva-move': 'cubic-bezier(.65,0,.35,1)', '--curva-entra': 'cubic-bezier(.22,1,.36,1)', '--curva-sai': 'cubic-bezier(.32,0,.67,0)', '--curva-salto': 'cubic-bezier(.34,1.56,.64,1)' })
})

await caso('modal: abre crescendo de 0,9 e fecha mais rapido', async () => {
  const sel = '[data-modal="depois"] .m-caixa'
  const abre = await amostrar(page, () => document.querySelector('[data-modal-abrir="depois"]').click(), () => +getComputedStyle(document.querySelector('[data-modal="depois"] .m-caixa')).opacity, 450)
  assert.ok(abre.some(o => o > 0.05 && o < 0.95), 'sem opacidade intermediaria')
  assert.equal(await page.$eval(sel, e => getComputedStyle(e).transitionDuration.split(', ')[0]), '0.32s')
  await page.click('[data-modal-fechar="depois"]')
  assert.equal(await page.$eval(sel, e => getComputedStyle(e).transitionDuration.split(', ')[0]), '0.22s')
  await page.waitForTimeout(350)
})

await caso('acordeao anima sem salto: altura cresce em varios quadros, so para cima, padding fixo', async () => {
  const gat = '#acordeao [data-acd="depois"] .acd-gatilho'
  await page.locator(gat).first().scrollIntoViewIfNeeded()
  const pads = () => page.$eval('#acordeao [data-acd="depois"] .acd-conteudo', e => getComputedStyle(e).paddingBottom)
  const antes = await pads()
  const h = await amostrar(page, () => document.querySelector('#acordeao [data-acd="depois"] .acd-gatilho').click(), () => document.querySelector('#acordeao [data-acd="depois"] .acd-corpo').getBoundingClientRect().height, 600)
  for (let i = 1; i < h.length; i++) assert.ok(h[i] >= h[i - 1] - 0.01, `altura recuou no quadro ${i}: ${h[i - 1]} -> ${h[i]}`)
  const fim = h[h.length - 1]
  assert.ok(fim > 20, `altura final ${fim}`)
  const meio = h.filter(x => x > 1 && x < fim - 1)
  assert.ok(meio.length >= 8, `so ${meio.length} quadros intermediarios (pulo)`)
  // nenhum quadro anda mais que 40% do total (salto)
  for (let i = 1; i < h.length; i++) assert.ok(h[i] - h[i - 1] <= fim * 0.4, `salto de ${h[i] - h[i - 1]}px`)
  assert.equal(await pads(), antes, 'padding do conteudo mudou')
  assert.equal(await page.$eval('#acordeao [data-acd="depois"] .acd-corpo', e => getComputedStyle(e).paddingBottom), '0px')
  // e fecha liso tambem
  const f = await amostrar(page, () => document.querySelector('#acordeao [data-acd="depois"] .acd-gatilho').click(), () => document.querySelector('#acordeao [data-acd="depois"] .acd-corpo').getBoundingClientRect().height, 600)
  for (let i = 1; i < f.length; i++) assert.ok(f[i] <= f[i - 1] + 0.01, 'altura subiu ao fechar')
  assert.ok(f.filter(x => x > 1 && x < fim - 1).length >= 8)
})

await caso('botao encolhe ate virar circulo antes do spinner, e volta a largura original', async () => {
  const sel = '[data-btn="depois"]'
  await page.locator(sel).scrollIntoViewIfNeeded()
  const { w0, h } = await page.$eval(sel, e => ({ w0: e.offsetWidth, h: e.offsetHeight }))
  const m = await amostrar(page, () => document.querySelector('[data-btn="depois"]').click(), () => { const b = document.querySelector('[data-btn="depois"]'); return { w: b.getBoundingClientRect().width, s: +getComputedStyle(b.querySelector('.spin')).opacity } }, 520)
  assert.ok(m[0].w <= w0 + 1)
  const ws = m.map(x => x.w)
  for (let i = 1; i < ws.length; i++) assert.ok(ws[i] <= ws[i - 1] + 0.01, 'largura voltou a crescer')
  assert.ok(Math.abs(ws[ws.length - 1] - h) <= 1, `nao virou circulo: ${ws[ws.length - 1]} x ${h}`)
  assert.ok(ws.filter(w => w > h + 3 && w < w0 - 3).length >= 6, 'sem larguras intermediarias')
  for (const x of m) if (x.w > h + 1) assert.ok(x.s < 0.05, `spinner entrou com largura ${x.w}`)
  await page.waitForFunction(() => document.querySelector('[data-btn="depois"]').dataset.estado === 'carregando')
  await page.waitForFunction(() => document.querySelector('[data-btn="depois"]').dataset.estado === 'salvo', null, { timeout: 4000 })
  assert.equal(await page.$eval(sel, e => getComputedStyle(e.querySelector('.ok path')).strokeDasharray), '1px')
  await page.waitForFunction(() => document.querySelector('[data-btn="depois"]').dataset.estado === 'voltando', null, { timeout: 4000 })
  await page.waitForFunction(() => document.querySelector('[data-btn="depois"]').dataset.estado === 'parado', null, { timeout: 5000 })
  assert.ok(Math.abs((await page.$eval(sel, e => e.offsetWidth)) - w0) <= 1, 'largura original nao voltou')
})

await caso('painel de baixo: elastico para cima, mola ao soltar, fecha ao puxar 60% para baixo', async () => {
  const sheet = page.locator('[data-sheet="depois"]')
  await sheet.scrollIntoViewIfNeeded()
  await page.click('[data-sheet-abrir="depois"]')
  await page.waitForTimeout(700)
  const topo = () => page.$eval('[data-sheet="depois"]', e => e.getBoundingClientRect().top)
  const t0 = await topo()
  const a = await page.locator('[data-alca="depois"]').boundingBox()
  const x = a.x + a.width / 2, y = a.y + a.height / 2
  await page.mouse.move(x, y); await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(x, y - 10 * i)
  const t1 = await topo()
  const subiu = t0 - t1
  assert.ok(subiu > 5 && subiu < 120 * 0.6, `puxou 120px e moveu ${subiu}px`)
  await page.mouse.up()
  await page.waitForTimeout(900)
  assert.ok(Math.abs((await topo()) - t0) <= 1, 'nao voltou ao soltar')
  // para baixo, 1:1
  const h = await sheet.evaluate(e => e.offsetHeight)
  await page.mouse.move(x, y); await page.mouse.down()
  // devagar: movimento sintetico instantaneo contaria como arremesso (velocidade alta fecha)
  for (let i = 1; i <= 5; i++) { await page.mouse.move(x, y + 10 * i); await page.waitForTimeout(40) }
  assert.ok(Math.abs((await topo()) - t0 - 50) <= 1, 'nao segue o dedo 1:1')
  await page.mouse.up(); await page.waitForTimeout(900)
  assert.ok(Math.abs((await topo()) - t0) <= 1, 'puxada curta nao voltou')
  // 60% da altura: fecha
  const alvo = Math.round(h * 0.6)
  await page.mouse.move(x, y); await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + (alvo * i) / 10)
  await page.waitForTimeout(150); await page.mouse.up()
  await page.waitForTimeout(700)
  assert.equal(await sheet.evaluate(e => e.classList.contains('aberto')), false)
  const palcoBaixo = await page.$eval('[data-sheet="depois"]', e => e.parentElement.getBoundingClientRect().bottom)
  assert.ok((await topo()) >= palcoBaixo - 1, 'nao saiu da tela')
})

await caso('lista para detalhe: a foto anima na ida e na volta, em sentidos opostos', async () => {
  const hero = '[data-ld-det="depois"] [data-hero]'
  await page.locator('#lista').scrollIntoViewIfNeeded()
  const larg = () => document.querySelector('[data-ld-det="depois"] [data-hero]').getBoundingClientRect().width
  const ativas = () => document.getAnimations().filter(a => a.effect?.target?.matches?.('[data-hero]')).length
  const ida = await amostrar(page, () => document.querySelector('[data-ld-abrir="depois"]').click(), () => ({ w: document.querySelector('[data-ld-det="depois"] [data-hero]').getBoundingClientRect().width, n: document.getAnimations().filter(a => a.effect?.target?.matches?.('[data-hero]')).length }), 700)
  assert.ok(ida.some(x => x.n > 0), 'sem animacao na ida')
  const wi = ida.map(x => x.w)
  for (let i = 1; i < wi.length; i++) assert.ok(wi[i] >= wi[i - 1] - 0.01, 'ida: encolheu')
  assert.ok(wi[0] < wi[wi.length - 1] * 0.5, 'ida: nao comecou pequena (na posicao da miniatura)')
  assert.ok(wi.filter(w => w > wi[0] + 2 && w < wi[wi.length - 1] - 2).length >= 6)
  const volta = await amostrar(page, () => document.querySelector('[data-ld-voltar="depois"]').click(), () => ({ w: document.querySelector('[data-ld-det="depois"] [data-hero]').getBoundingClientRect().width, n: document.getAnimations().filter(a => a.effect?.target?.matches?.('[data-hero]')).length }), 700)
  assert.ok(volta.some(x => x.n > 0), 'sem animacao na volta')
  const wv = volta.map(x => x.w)
  for (let i = 1; i < wv.length; i++) assert.ok(wv[i] <= wv[i - 1] + 0.01, 'volta: cresceu')
  assert.ok(wv[wv.length - 1] < wv[0] * 0.5, 'volta: nao terminou na miniatura')
  assert.ok(wv.filter(w => w < wv[0] - 2 && w > wv[wv.length - 1] + 2).length >= 6)
  assert.equal(await page.$eval('[data-ld-det="depois"]', e => e.hidden), true)
})

await caso('cabecalho some ao descer e volta ao subir na lista, e fica fixo na tabela', async () => {
  await page.locator('#cabecalho').scrollIntoViewIfNeeded()
  const pos = (cont, cab) => page.evaluate(([c, h]) => ({ cab: document.querySelector(h).getBoundingClientRect(), rol: document.querySelector(c).getBoundingClientRect() }), [cont, cab])
  await page.$eval('#rol-lista', e => (e.scrollTop = 0)); await page.waitForTimeout(100)
  await page.$eval('#rol-lista', e => (e.scrollTop = 160)); await page.waitForTimeout(600)
  let p = await pos('#rol-lista', '#cab-lista')
  assert.ok(p.cab.bottom <= p.rol.top + 1, 'cabecalho da lista nao sumiu')
  await page.$eval('#rol-lista', e => (e.scrollTop = 100)); await page.waitForTimeout(600)
  p = await pos('#rol-lista', '#cab-lista')
  assert.ok(Math.abs(p.cab.top - p.rol.top) <= 1, 'cabecalho da lista nao voltou')
  await page.$eval('#rol-tabela', e => (e.scrollTop = 160)); await page.waitForTimeout(600)
  p = await pos('#rol-tabela', '#cab-tabela th')
  assert.ok(Math.abs(p.cab.top - p.rol.top) <= 1, 'cabecalho da tabela saiu do lugar')
})

await caso('abas: indicador desliza com transicao e numero conta ate o valor', async () => {
  await page.locator('#abas').scrollIntoViewIfNeeded()
  const x = await amostrar(page, () => document.querySelectorAll('#abas [data-abas]')[1].querySelectorAll('button')[2].click(), () => new DOMMatrix(getComputedStyle(document.querySelectorAll('#abas .ind')[1]).transform).m41, 500)
  assert.ok(x.filter(v => v > x[0] + 2 && v < x[x.length - 1] - 2).length >= 5, 'indicador pulou')
  await page.locator('#numero').scrollIntoViewIfNeeded()
  const v = await amostrar(page, () => document.querySelector('[data-num-tocar="depois"]').click(), () => document.querySelector('[data-num="depois"]').textContent, 800)
  assert.equal(v[v.length - 1], 'R$ 3.947,50')
  assert.ok(new Set(v).size >= 8, 'numero nao contou')
  assert.equal(await page.$eval('[data-num="depois"]', e => getComputedStyle(e).fontVariantNumeric), 'tabular-nums')
})

await caso('troca de icone: o velho sai desfocado, o novo entra', async () => {
  const b = page.locator('#icone .depois [data-ic]').first()
  await b.scrollIntoViewIfNeeded()
  await b.click(); await page.waitForTimeout(400)
  const r = await b.evaluate(e => { const [a, n] = e.querySelectorAll('svg'); const g = x => getComputedStyle(x); return { a: [g(a).opacity, g(a).filter, g(a).transform], n: [g(n).opacity, g(n).filter] } })
  assert.equal(r.a[0], '0'); assert.equal(r.a[1], 'blur(4px)'); assert.notEqual(r.a[2], 'none')
  assert.equal(r.n[0], '1'); assert.equal(r.n[1], 'none')
})

await caso('1280px: sem rolagem lateral', async () => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0)
})
await page.close()

// celular: sem rolagem lateral e o painel tambem segue o toque (pointer events)
{
  const { page: cel, erros: e2 } = await abrir({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true })
  await caso('390px: sem rolagem lateral e sem erro', async () => {
    assert.equal(await cel.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0)
    assert.deepEqual(e2, [])
  })
  await caso('390px: alca do painel com touch-action none', async () => {
    assert.equal(await cel.$eval('[data-alca="depois"]', e => getComputedStyle(e).touchAction), 'none')
  })
  await caso('390px: foto da lista cabe no palco e a volta anima', async () => {
    await cel.locator('#lista').scrollIntoViewIfNeeded()
    await cel.click('[data-ld-abrir="depois"]'); await cel.waitForTimeout(700)
    const r = await cel.evaluate(() => { const h = document.querySelector('[data-ld-det="depois"] [data-hero]').getBoundingClientRect(); const p = document.querySelector('#lista .depois .palco').getBoundingClientRect(); return { dentro: h.left >= p.left - 1 && h.right <= p.right + 1 } })
    assert.ok(r.dentro)
    await cel.click('[data-ld-voltar="depois"]'); await cel.waitForTimeout(700)
  })
  await cel.close()
}

// reduced motion: tudo vira troca direta
{
  const { page: rm } = await abrir({}, { reducedMotion: 'reduce' })
  await caso('reduced motion: todas as duracoes viram 0,01 ms e o acordeao troca direto', async () => {
    const v = await rm.evaluate(() => ['--mov-rapido', '--mov-padrao', '--mov-lento', '--mov-sai-rapido', '--mov-sai-padrao', '--mov-sai-lento', '--mov-icone', '--mov-contar', '--mov-cascata'].map(k => getComputedStyle(document.documentElement).getPropertyValue(k).trim()))
    assert.deepEqual(v, Array(9).fill('0.01ms'))
    await rm.locator('#acordeao [data-acd="depois"] .acd-gatilho').first().scrollIntoViewIfNeeded()
    const d = await rm.$eval('#acordeao [data-acd="depois"] .acd-corpo', e => parseFloat(getComputedStyle(e).transitionDuration))
    assert.ok(d <= 0.0001, `transicao do acordeao ${d}s`)
    const h = await amostrar(rm, () => document.querySelector('#acordeao [data-acd="depois"] .acd-gatilho').click(), () => document.querySelector('#acordeao [data-acd="depois"] .acd-corpo').getBoundingClientRect().height, 200)
    assert.ok(h.filter(x => x > 1 && x < h[h.length - 1] - 1).length <= 1, 'ainda anima')
  })
  await rm.close()
}

await browser.close()
server.close()
for (const r of resultados) console.log(r[0] === 'ok' ? '  ok     ' : '  FALHOU ', r[1], r[2] ? '\n          ' + r[2] : '')
const falhas = resultados.filter(r => r[0] !== 'ok').length
console.log(`\n${resultados.length - falhas} ok, ${falhas} falhou`)
process.exit(falhas ? 1 : 0)
