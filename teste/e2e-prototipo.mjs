// Prototipo (teste/prototipo/): a mesma tela de app sem e com a tatile. Confere que cada
// comportamento muda de verdade entre as versoes, nos tres aparelhos.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { servir } from './servir.mjs'

const server = await servir(0)
const base = `http://localhost:${server.address().port}/prototipo/`
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const resultados = []
async function caso(nome, fn) {
  try { await fn(); resultados.push(['ok', nome]) } catch (e) { resultados.push(['FALHOU', nome, e.message.split('\n').slice(0, 12).join(' | ')]) }
}

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const erros = []
page.on('pageerror', e => erros.push(String(e)))
page.on('console', m => m.type() === 'error' && erros.push(m.text()))
await page.goto(base)
await page.waitForTimeout(400)
const tela = () => page.frames().find(f => f.url().includes('app.html'))
const clicar = async (grupo, valor) => { await page.click(`[data-grupo="${grupo}"] [data-${grupo}="${valor}"]`); await page.waitForTimeout(450) }
const esperarAtualizar = () => tela().waitForFunction(() => document.querySelector('[data-atualizar]').dataset.estado === 'parado', null, { timeout: 6000 })
const css = (sel, prop) => tela().$eval(sel, (el, p) => getComputedStyle(el)[p], prop)

for (const aparelho of ['celular', 'tablet', 'desktop', 'fullhd', 'qhd', '4k']) {
  await clicar('aparelho', aparelho)
  const largura = { celular: 390, tablet: 820, desktop: 1280, fullhd: 1920, qhd: 2560, '4k': 3840 }[aparelho]

  await caso(`${aparelho}: tela no tamanho certo, sem rolagem lateral nas duas versoes`, async () => {
    for (const v of ['sem', 'com']) {
      await clicar('versao', v)
      const m = await tela().evaluate(() => ({ w: innerWidth, rol: document.documentElement.scrollWidth - innerWidth }))
      assert.equal(m.w, largura); assert.equal(m.rol, 0, `${v}: rolagem lateral`)
    }
  })

  await caso(`${aparelho}: Sem e Com mudam espaco, titulo, numero, raio e sombra`, async () => {
    await clicar('versao', 'sem')
    const sem = { secao: await css('.espaco', 'height'), pad: await css('.resumo .card', 'paddingTop'), h1: await css('h1', 'fontSize'), num: await css('[data-ao-vivo="faturamento"]', 'fontVariantNumeric'), sombra: await css('.resumo .card', 'boxShadow'), raio: await css('.promo .capa', 'borderTopLeftRadius') }
    await clicar('versao', 'com')
    const com = { secao: await css('.espaco', 'height'), pad: await css('.resumo .card', 'paddingTop'), h1: await css('h1', 'fontSize'), num: await css('[data-ao-vivo="faturamento"]', 'fontVariantNumeric'), sombra: await css('.resumo .card', 'boxShadow'), raio: await css('.promo .capa', 'borderTopLeftRadius') }
    // no celular o respiro do card e 16 nas duas versoes; o que muda e o espaco entre secoes
    assert.equal(sem.secao, '16px'); assert.notEqual(com.secao, sem.secao)
    assert.equal(sem.pad, '16px')
    assert.notEqual(com.h1, sem.h1)
    assert.equal(sem.num, 'proportional-nums'); assert.equal(com.num, 'tabular-nums')
    assert.equal(sem.sombra, 'none'); assert.notEqual(com.sombra, 'none')
    assert.equal(sem.raio, '20px'); assert.ok(parseFloat(com.raio) < 20, `raio de dentro ${com.raio}`)
  })
}

await clicar('aparelho', 'desktop')

await caso('servidor rapido: skeleton pisca no Sem e nao no Com', async () => {
  await clicar('velocidade', 'rapido')
  for (const [v, espera] of [['sem', true], ['com', false]]) {
    await clicar('versao', v)
    await tela().click('[data-atualizar]')
    await page.waitForTimeout(60)
    const sk = await tela().$$eval('[data-lista] .sk', l => l.length)
    assert.equal(sk > 0, espera, `${v}: skeleton ${sk}`)
    await page.waitForTimeout(500)
  }
  await clicar('velocidade', 'lento')
})

await caso('aba vai para o endereco so no Com, e Cancelados mostra vazio com acao', async () => {
  await clicar('versao', 'com')
  await tela().click('[data-aba="cancelados"]')
  await page.waitForTimeout(300) // o endereco falso atualiza a cada 200 ms
  assert.match(await page.textContent('#endereco'), /\?aba=cancelados/)
  assert.ok(await tela().$('[data-vazio] [data-ir-todos]'), 'vazio sem acao')
  await tela().click('[data-ir-todos]')
  await clicar('versao', 'sem')
  await tela().click('[data-aba="pagos"]')
  await page.waitForTimeout(300)
  assert.equal(await page.textContent('#endereco'), 'acme.app/pedidos')
  await tela().click('[data-aba="cancelados"]')
  assert.equal(await tela().textContent('[data-vazio]'), 'Nenhum dado.')
  await tela().click('[data-aba="todos"]')
})

await caso('menu: no Com o item pisca uma vez na cor de destaque; arquivar some na hora com Desfazer', async () => {
  await clicar('versao', 'com')
  await tela().click('[data-acoes="1042"]')
  const item = tela().locator('[data-acao="arquivar"]')
  await item.click()
  const anim = await item.evaluate(el => [getComputedStyle(el).animationName, getComputedStyle(el).animationIterationCount]).catch(() => null)
  if (anim) assert.deepEqual(anim, ['escolhido', '1'])
  await page.waitForTimeout(400)
  assert.equal(await tela().$('[data-pedido="1042"]'), null, 'nao sumiu na hora')
  await tela().click('[data-desfazer]')
  assert.ok(await tela().$('[data-pedido="1042"]'), 'Desfazer nao devolveu')
})

await caso('cancelar: no Com soltar antes nao cancela e segurar cancela; no Sem um toque cancela', async () => {
  await tela().click('[data-acoes="1040"]'); await tela().click('[data-acao="cancelar"]'); await page.waitForTimeout(400)
  const b = await tela().$('[data-segurar]')
  const box = await b.boundingBox()
  // boundingBox ja vem na coordenada da pagina, com a escala da moldura aplicada
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up()
  assert.match(await tela().textContent('[data-msg-segurar]'), /Soltou antes/)
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up()
  await page.waitForTimeout(100)
  assert.match(await tela().textContent('[data-pedido="1040"] .pilula'), /Cancelado/)
  await tela().click('[data-desfazer]')
  await clicar('versao', 'sem')
  await tela().click('[data-acoes="1039"]'); await tela().click('[data-acao="cancelar"]')
  assert.match(await tela().textContent('[data-pedido="1039"] .pilula'), /Cancelado/)
})

await caso('tema escuro: no Com o card escurece, no Sem fica branco', async () => {
  await clicar('tema', 'escuro')
  await clicar('versao', 'com')
  assert.notEqual(await css('.resumo .card', 'backgroundColor'), 'rgb(255, 255, 255)')
  await clicar('versao', 'sem')
  assert.equal(await css('.resumo .card', 'backgroundColor'), 'rgb(255, 255, 255)')
  await clicar('tema', 'claro')
})

await caso('novo pedido: colar bloqueado so no Sem; no Com o erro fica do lado do campo com foco', async () => {
  for (const v of ['sem', 'com']) {
    await clicar('versao', v)
    await tela().click('[data-abrir-form]')
    const bloqueado = await tela().evaluate(() => {
      const ev = new ClipboardEvent('paste', { cancelable: true, clipboardData: new DataTransfer() })
      return !document.getElementById('email').dispatchEvent(ev)
    })
    assert.equal(bloqueado, v === 'sem', `${v}: colar`)
    await tela().fill('#email', 'cliente@empresa')
    await tela().click('[data-enviar]')
    if (v === 'com') {
      assert.match(await tela().textContent('[data-erro-email]'), /Falta o final/)
      assert.equal(await tela().evaluate(() => document.activeElement.id), 'email')
    } else assert.equal(await tela().$eval('[data-erro-topo]', e => e.hidden), false)
    await tela().click('[data-fechar]')
  }
})

await caso('monitor grande: no Com a pagina inteira ganha zoom por faixa (1,15, 1,4 e 2), no Sem nao tem zoom', async () => {
  // getBoundingClientRect devolve o valor ja ampliado, getComputedStyle o valor sem zoom
  const medir = () => tela().evaluate(() => ({ w: document.querySelector('.conteudo').getBoundingClientRect().width, linha: document.querySelector('[data-pedido] strong').getBoundingClientRect().height, zoom: getComputedStyle(document.documentElement).zoom, base: parseFloat(getComputedStyle(document.querySelector('[data-pedido] strong')).fontSize) }))
  await clicar('versao', 'com'); await clicar('aparelho', 'desktop')
  const nb = await medir()
  assert.equal(nb.zoom, '1', 'notebook com zoom')
  for (const [ap, escala] of [['fullhd', 1.15], ['qhd', 1.4], ['4k', 2]]) {
    await clicar('aparelho', ap)
    const m = await medir()
    assert.ok(Math.abs(m.w - 1440 * escala) <= 2, `${ap}: conteudo ${m.w}, esperado ${1440 * escala}`)
    assert.ok(Math.abs(m.linha / (nb.linha * escala) - 1) <= 0.1, `${ap}: linha ${m.linha}, esperado ${nb.linha * escala}`)
    assert.equal(m.base, nb.base, `${ap}: texto base igual ao do notebook`)
  }
  await clicar('versao', 'sem')
  const sem = await medir()
  assert.ok(sem.w > 3000, `Sem no 4K deveria esticar: ${sem.w}`); assert.equal(sem.base, 14)
  assert.equal(sem.zoom, '1', 'Sem tem zoom')
  await clicar('versao', 'com'); await clicar('aparelho', 'desktop')
})

// Pedidos do Leonardo em 10/11/2026: cada caso abaixo falhava na versao anterior do prototipo
await caso('tablet: numeros do resumo nao quebram linha, claro e escuro', async () => {
  await clicar('aparelho', 'tablet'); await clicar('versao', 'com')
  for (const t of ['claro', 'escuro']) {
    await clicar('tema', t)
    const alturas = await tela().$$eval('.resumo .numero', l => l.map(e => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).fontSize)))
    for (const h of alturas) assert.ok(h < 1.8, `${t}: numero em ${h.toFixed(2)} linhas de fonte`)
  }
  await clicar('tema', 'claro')
})

await caso('tema escuro: bloco de destaque fica fundo (--destaque-bloco), nao o azul claro de botao', async () => {
  await clicar('tema', 'escuro')
  assert.equal(await css('.promo', 'backgroundColor'), 'rgb(29, 78, 216)')
  assert.equal(await css('.promo', 'color'), 'rgb(255, 255, 255)')
  await clicar('tema', 'claro')
})

await caso('pilulas: mesma largura, texto ao lado alinhado e centro na mesma altura do texto', async () => {
  await clicar('aparelho', 'celular'); await clicar('versao', 'com')
  await tela().click('[data-aba="todos"]'); await page.waitForTimeout(200)
  const m = await tela().$$eval('[data-pedido]', l => l.map(li => {
    const p = li.querySelector('.pilula').getBoundingClientRect(), t = li.querySelector('.corta').getBoundingClientRect()
    return { w: p.width, x: t.left, dy: Math.abs((p.top + p.height / 2) - (t.top + t.height / 2)) }
  }))
  assert.ok(m.length >= 3)
  assert.equal(new Set(m.map(i => Math.round(i.w))).size, 1, `larguras ${m.map(i => i.w)}`)
  assert.equal(new Set(m.map(i => Math.round(i.x))).size, 1, `texto comeca em ${m.map(i => i.x)}`)
  for (const i of m) assert.ok(i.dy <= 1.5, `centro desalinhado em ${i.dy}px`)
})

await caso('atualizar: a pilula fecha em circulo, gira, fica verde com check e a largura volta (so no Com), mesmo com servidor rapido', async () => {
  await clicar('velocidade', 'rapido'); await clicar('versao', 'com'); await clicar('aparelho', 'desktop')
  await esperarAtualizar()
  const m = await tela().evaluate(() => new Promise(resolve => {
    const b = document.querySelector('[data-atualizar]'), w0 = b.offsetWidth, h = b.offsetHeight
    const out = [], t0 = performance.now()
    b.click(); b.click() // clique repetido: ignorado
    const f = () => {
      const r = b.getBoundingClientRect()
      out.push({ w: r.width, e: b.dataset.estado, busy: b.getAttribute('aria-busy'), spin: +getComputedStyle(b.querySelector('.spin')).opacity, bg: getComputedStyle(b).backgroundColor })
      if (performance.now() - t0 < 3400) { if (out.length === 6) b.click(); requestAnimationFrame(f) } else resolve({ out, w0, h })
    }
    requestAnimationFrame(f)
  }))
  const { out, w0, h } = m
  const ws = out.map(x => x.w)
  assert.ok(ws.some(w => w > h + 3 && w < w0 - 3), 'sem larguras intermediarias')
  assert.ok(ws.some(w => Math.abs(w - h) < 1.5), 'nao chegou ao circulo')
  for (const e of ['fechando', 'carregando', 'salvo', 'voltando', 'parado']) assert.ok(out.some(x => x.e === e), `faltou o estado ${e}`)
  assert.equal(out.filter((x, i) => x.e === 'fechando' && out[i - 1]?.e !== 'fechando').length, 1, 'clique repetido recomecou a animacao')
  for (const x of out) if (x.e === 'fechando' || x.e === 'carregando') assert.equal(x.busy, 'true', `aria-busy em ${x.e}`)
  assert.ok(out.some(x => x.e === 'carregando' && x.spin > 0.95 && Math.abs(x.w - h) < 1.5), 'spinner nao entrou no circulo')
  for (const x of out) if (x.e === 'fechando' && x.w > h + 1) assert.ok(x.spin < 0.05, 'spinner entrou antes de virar circulo')
  const salvo = out.filter(x => x.e === 'salvo'), fimSalvo = salvo[salvo.length - 1]
  assert.equal(fimSalvo.bg, 'rgb(31, 122, 77)', 'nao ficou verde (--sucesso)'); assert.equal(fimSalvo.busy, null)
  const carreg = out.filter(x => x.e === 'carregando').length
  assert.ok(carreg >= 40, `spinner girou so ${carreg} quadros (menos de uma volta)`)
  assert.ok(Math.abs(out[out.length - 1].w - w0) <= 1, 'largura original nao voltou')
  await clicar('versao', 'sem')
  assert.equal(await css('[data-atualizar] .icone-girar', 'display'), 'none')
  await tela().click('[data-atualizar]'); await page.waitForTimeout(150)
  assert.equal(await tela().getAttribute('[data-atualizar]', 'data-estado'), 'parado', 'Sem animou o botao')
  await page.waitForTimeout(300)
})

await caso('abas no celular: o corte seco vira esmaecimento na borda, so onde ha aba escondida (so no Com)', async () => {
  await clicar('aparelho', 'celular'); await clicar('versao', 'com'); await esperarAtualizar()
  const ler = () => tela().$eval('.abas', e => ({ fade: e.dataset.fade ?? '', mask: getComputedStyle(e).maskImage, rolou: e.scrollLeft, sobra: e.scrollWidth - e.clientWidth }))
  await tela().$eval('.abas', e => (e.scrollLeft = 0)); await page.waitForTimeout(100)
  let a = await ler()
  assert.ok(a.sobra > 0, 'as abas cabem: nada escondido para testar')
  assert.equal(a.fade, 'dir'); assert.ok(a.mask.includes('linear-gradient') && a.mask.includes('to right'), `mascara na direita: ${a.mask}`)
  await tela().$eval('.abas', e => (e.scrollLeft = e.scrollWidth)); await page.waitForTimeout(100)
  a = await ler()
  assert.equal(a.fade, 'esq'); assert.ok(a.mask.includes('to left'), `mascara na esquerda: ${a.mask}`)
  await tela().$eval('.abas', e => (e.scrollLeft = 20)); await page.waitForTimeout(100)
  a = await ler(); assert.equal(a.fade, 'ambos')
  await clicar('versao', 'sem')
  a = await ler(); assert.equal(a.fade, ''); assert.equal(a.mask, 'none')
  await clicar('versao', 'com'); await clicar('aparelho', 'desktop')
})

await caso('tema: no Com a troca e direta no proximo quadro, no Sem continua gradual', async () => {
  const proximoQuadro = sel => tela().evaluate(s => new Promise(r => requestAnimationFrame(() => r(getComputedStyle(document.querySelector(s)).backgroundColor))), sel)
  for (const [v, sel, direta] of [['com', '.resumo .card', true], ['sem', 'body', false]]) {
    await clicar('versao', v); await clicar('tema', 'claro')
    const claro = await css(sel, 'backgroundColor')
    await page.click('[data-tema="escuro"]')
    const logo = await proximoQuadro(sel)
    await page.waitForTimeout(700)
    const final = await css(sel, 'backgroundColor')
    assert.notEqual(final, claro, `${v}: o tema nao mudou a cor`)
    if (direta) assert.equal(logo, final, `${v}: no proximo quadro ${logo}, final ${final}`)
    else assert.notEqual(logo, final, `${v}: trocou de uma vez, deveria ser gradual`)
    await clicar('tema', 'claro')
  }
  await clicar('versao', 'com')
})

await caso('skeleton adaptativo: mostra quantas linhas a aba tinha (2 em Pagos, vazio em Cancelados), Sem fica em 3', async () => {
  await clicar('velocidade', 'lento')
  const contar = async () => {
    await esperarAtualizar() // o botao so aceita outro clique depois de voltar a pilula
    await tela().click('[data-atualizar]'); await page.waitForTimeout(500)
    const r = { linhas: await tela().$$eval('[data-lista] [data-sk]', l => l.length), vazio: await tela().$$eval('[data-lista] [data-sk-vazio]', l => l.length) }
    await page.waitForTimeout(1600)
    return r
  }
  await clicar('versao', 'com')
  // cada aba: o skeleton repete o que ela tinha (casos anteriores ja cancelaram e arquivaram pedidos)
  const vistos = new Set()
  for (const a of ['pagos', 'enviados', 'cancelados']) {
    await tela().click(`[data-aba="${a}"]`); await page.waitForTimeout(200)
    const n = await tela().$$eval('[data-pedido]', l => l.length)
    vistos.add(n)
    assert.deepEqual(await contar(), n ? { linhas: Math.min(n, 6), vazio: 0 } : { linhas: 0, vazio: 1 }, `aba ${a} com ${n}`)
  }
  assert.ok([...vistos].some(n => n !== 3), `nenhuma aba fora de 3 itens: ${[...vistos]}`)
  // aba que estava vazia da ultima vez: o skeleton tem a forma da tela vazia
  await tela().evaluate(() => window.tatileForma.gravar('cancelados', 0))
  assert.deepEqual(await contar(), { linhas: 0, vazio: 1 })
  await clicar('versao', 'sem')
  await tela().click('[data-aba="pagos"]'); await page.waitForTimeout(200)
  assert.deepEqual(await contar(), { linhas: 3, vazio: 0 })
  await tela().click('[data-aba="todos"]')
})

// Tatile 1.2 (10/11/2026): movimento por token no Com. Cada caso confere que o Sem continua como estava.
const escala = () => page.evaluate(() => { const m = document.getElementById('moldura'); return m.getBoundingClientRect().width / m.offsetWidth })
const centro = async sel => { const b = await (await tela().$(sel)).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
const dormirNaTela = ms => tela().evaluate(ms => new Promise(r => setTimeout(r, ms)), ms)

await caso('1.2 abas: o indicador desliza (transform e width animam) so no Com', async () => {
  await clicar('aparelho', 'desktop'); await clicar('velocidade', 'rapido')
  for (const v of ['com', 'sem']) {
    await clicar('versao', v)
    await tela().click('[data-aba="todos"]'); await page.waitForTimeout(500)
    const r = await tela().evaluate(async () => {
      const ind = document.querySelector('.ind'), esp = ms => new Promise(r => setTimeout(r, ms))
      const x = () => ind.getBoundingClientRect().left
      const x0 = x(); document.querySelector('[data-aba="enviados"]').click()
      await esp(90); const x1 = x(), anims = ind.getAnimations().length
      await esp(600); const x2 = x()
      return { x0, x1, x2, anims, display: getComputedStyle(ind).display, dur: getComputedStyle(ind).transitionDuration, curva: getComputedStyle(ind).transitionTimingFunction }
    })
    if (v === 'com') {
      assert.ok(r.anims > 0, 'indicador sem animacao')
      assert.ok(r.x2 > r.x0 && r.x1 > r.x0 && r.x1 < r.x2, `x0 ${r.x0} x1 ${r.x1} x2 ${r.x2}: nao passou por posicao intermediaria`)
      assert.match(r.dur, /0\.32s/); assert.match(r.curva, /cubic-bezier\(0\.65, 0, 0\.35, 1\)/)
    } else { assert.equal(r.display, 'none'); assert.equal(r.anims, 0) }
    await tela().click('[data-aba="todos"]')
  }
  await clicar('velocidade', 'lento')
})

await caso('1.2 numeros: no Com contam ate o valor novo (valores intermediarios), no Sem pulam', async () => {
  const amostrar = () => tela().evaluate(async () => {
    const el = document.querySelector('[data-ao-vivo="faturamento"]'), v = []
    const t0 = performance.now()
    while (performance.now() - t0 < 1700) { v.push(parseFloat(el.textContent.replace(/[^\d,]/g, '').replace(',', '.'))); await new Promise(r => requestAnimationFrame(r)) }
    return v
  })
  await clicar('versao', 'com')
  const com = await amostrar()
  assert.ok(new Set(com).size > 15, `Com: so ${new Set(com).size} valores distintos`)
  for (let i = 1; i < com.length; i++) assert.ok(com[i] >= com[i - 1], 'Com: valor recuou')
  assert.equal(await css('[data-ao-vivo="faturamento"]', 'fontVariantNumeric'), 'tabular-nums')
  await clicar('versao', 'sem')
  const sem = await amostrar()
  assert.ok(new Set(sem).size <= 5, `Sem: ${new Set(sem).size} valores distintos, deveria pular`)
})

await caso('1.2 botoes: .apertavel encolhe .97 no Com e nao no Sem; hover so dentro de (hover: hover) and (pointer: fine)', async () => {
  for (const [v, esperado] of [['com', 0.97], ['sem', 1]]) {
    await clicar('versao', v)
    const { x, y } = await centro('[data-atualizar]')
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(300)
    const m = await css('[data-atualizar]', 'transform')
    const a = m === 'none' ? 1 : parseFloat(m.match(/matrix\(([^,]+)/)[1])
    assert.ok(Math.abs(a - esperado) < 0.005, `${v}: escala ${a}`)
    await page.mouse.move(5, 5); await page.mouse.up(); await page.waitForTimeout(100)
  }
  const soltos = await tela().evaluate(() => [...document.styleSheets].flatMap(s => [...s.cssRules]).filter(r => r.selectorText?.includes(':hover')).map(r => r.selectorText))
  assert.deepEqual(soltos, [], `:hover fora do @media: ${soltos}`)
  const dentro = await tela().evaluate(() => [...document.styleSheets].flatMap(s => [...s.cssRules]).filter(r => r.media?.mediaText.includes('hover: hover') && [...r.cssRules].some(c => c.selectorText?.includes(':hover'))).length)
  assert.ok(dentro >= 1, 'nenhum :hover dentro do @media')
  await clicar('versao', 'com')
  await tela().waitForSelector('[data-atualizar]:not([aria-busy])', { timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(1600)
})

await caso('1.2 menu: no Com abre no pointerdown (antes do click), no Sem so no click', async () => {
  await clicar('aparelho', 'desktop')
  for (const v of ['com', 'sem']) {
    await clicar('versao', v)
    await tela().click('[data-aba="todos"]'); await page.waitForTimeout(300)
    const { x, y } = await centro('[data-acoes]')
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(80)
    const aposDown = (await tela().$$('.menu')).length
    assert.equal(aposDown, v === 'com' ? 1 : 0, `${v}: menus apos pointerdown`)
    await page.mouse.up(); await page.waitForTimeout(80)
    assert.equal((await tela().$$('.menu')).length, 1, `${v}: menu depois do click`)
    await page.keyboard.press('Escape')
    await clicar('versao', v) // fecha o menu
  }
})

await caso('1.2 aviso: no Com entra deslizando com barra de tempo de 3px linear e sai mais rapido; no Sem sem barra', async () => {
  await clicar('versao', 'com')
  const r = await tela().evaluate(async () => {
    avisar('Teste de aviso'); const a = document.querySelector('.aviso'), i = a.querySelector('i')
    await new Promise(r => setTimeout(r, 200))
    const barra = i.getAnimations().find(x => x.animationName === 'barra')
    const entra = getComputedStyle(a).animationName, entraDur = getComputedStyle(a).animationDuration
    const esc = new DOMMatrix(getComputedStyle(i).transform).a
    const out = { barra: !!barra, linear: getComputedStyle(i).animationTimingFunction, h: getComputedStyle(i).height, esc, entra, entraDur, tempo: getComputedStyle(i).animationDuration }
    fecharAviso(a); out.sai = getComputedStyle(a).animationName; out.saiDur = getComputedStyle(a).animationDuration
    await new Promise(r => setTimeout(r, 400)); out.removido = !a.isConnected
    return out
  })
  assert.ok(r.barra, 'barra sem animacao'); assert.equal(r.linear, 'linear'); assert.equal(r.h, '3px')
  assert.ok(r.esc > 0 && r.esc < 1, `barra em ${r.esc}`); assert.equal(r.tempo, '3s')
  assert.equal(r.entra, 'aviso-entra'); assert.equal(r.entraDur, '0.32s')
  assert.equal(r.sai, 'aviso-sai'); assert.equal(r.saiDur, '0.22s'); assert.ok(r.removido)
  await clicar('versao', 'sem')
  const sem = await tela().evaluate(() => { avisar('Teste de aviso'); const a = document.querySelector('.aviso'); const o = { barra: a.querySelector('i'), anim: getComputedStyle(a).animationName }; a.remove(); return o.barra === null && o.anim === 'none' })
  assert.ok(sem, 'Sem nao deveria ter barra nem animacao')
})

await caso('1.2 pilulas: text-box trim-both so no Com (quando o navegador suporta)', async () => {
  await clicar('versao', 'com')
  const suporta = await tela().evaluate(() => CSS.supports('text-box', 'trim-both cap alphabetic'))
  if (!suporta) return
  assert.equal(await css('.pilula', 'textBoxTrim'), 'trim-both')
  await clicar('versao', 'sem')
  assert.equal(await css('.pilula', 'textBoxTrim'), 'none')
})

await caso('1.2 celular: Novo pedido e painel de baixo com elastico (120px pra cima anda menos e volta) e fecha puxando pra baixo', async () => {
  await clicar('aparelho', 'celular'); await clicar('versao', 'com')
  await tela().click('[data-abrir-fab]'); await page.waitForTimeout(800)
  const g = () => tela().evaluate(() => { const r = document.querySelector('.painel').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width, h: innerHeight } })
  const a = await g()
  assert.ok(Math.abs(a.bottom - a.h) < 1, `painel nao esta embaixo: ${a.bottom} de ${a.h}`); assert.equal(Math.round(a.w), 390)
  assert.ok(await tela().$('[data-alca]'), 'sem alca')
  const k = await escala(), { x, y } = await centro('[data-alca]')
  await page.mouse.move(x, y); await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(x, y - (120 * k * i) / 12)
  const puxado = await g()
  const andou = a.top - puxado.top
  assert.ok(andou > 20 && andou < 60, `puxar 120 andou ${andou}, esperado bem menos que 120 (elastico)`)
  await page.mouse.up(); await page.waitForTimeout(900)
  const volta = await g(); assert.ok(Math.abs(volta.top - a.top) < 1, `nao voltou: ${volta.top} vs ${a.top}`)
  // puxar pra baixo alem de 30% fecha
  await page.mouse.move(x, y); await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(x, y + (300 * k * i) / 12)
  await page.mouse.up(); await page.waitForTimeout(700)
  assert.equal(await tela().$('.fundo-painel'), null, 'painel nao fechou')
})

await caso('1.2 desktop: Novo pedido e modal que cresce de .9 com fundo a 42%, sem alca; no Sem sem animacao', async () => {
  await clicar('aparelho', 'desktop'); await clicar('versao', 'com')
  const r = await tela().evaluate(async () => {
    document.querySelector('[data-abrir-form]').click()
    const p = document.querySelector('.painel'), esc = () => new DOMMatrix(getComputedStyle(p).transform).a
    const inicio = esc(); await new Promise(r => setTimeout(r, 60)); const meio = esc()
    await new Promise(r => setTimeout(r, 600))
    const b = p.getBoundingClientRect()
    return { inicio, meio, fim: getComputedStyle(p).transform, veu: getComputedStyle(document.querySelector('.fundo-painel')).backgroundColor, alca: !!document.querySelector('[data-alca]'), meioY: Math.abs((b.top + b.bottom) / 2 - innerHeight / 2) }
  })
  assert.ok(r.inicio >= 0.89 && r.inicio < 0.97, `comeca em ${r.inicio}`); assert.ok(r.meio > r.inicio && r.meio <= 1)
  assert.equal(r.fim, 'none'); assert.equal(r.veu, 'rgba(0, 0, 0, 0.42)'); assert.equal(r.alca, false); assert.ok(r.meioY < 2, 'modal fora do centro')
  await tela().click('[data-fechar]'); await page.waitForTimeout(500)
  await clicar('versao', 'sem')
  await tela().click('[data-abrir-form]')
  assert.equal(await css('.painel', 'transform'), 'none'); assert.equal(await tela().$('.fundo-painel.aberto'), null)
  await tela().click('[data-fechar]')
})

await caso('1.2 formulario: rotulo sobe, check com salto ao sair do campo valido, enviar com aria-disabled e motivo escrito', async () => {
  await clicar('versao', 'com')
  await tela().click('[data-abrir-form]'); await page.waitForTimeout(500)
  const rot = () => css('label[for="email"]', 'transform')
  assert.equal(await tela().getAttribute('[data-enviar]', 'aria-disabled'), 'true')
  assert.equal(await tela().getAttribute('[data-enviar]', 'aria-describedby'), 'motivo')
  assert.match(await tela().textContent('#motivo'), /Preencha o e-mail/)
  assert.equal(await tela().evaluate(() => document.querySelector('[data-enviar]').disabled), false, 'nao deve usar disabled')
  const repouso = await rot()
  await tela().fill('#email', 'cliente@empresa.com'); await page.waitForTimeout(400)
  assert.notEqual(await rot(), repouso, 'rotulo nao subiu')
  assert.equal(await tela().getAttribute('[data-enviar]', 'aria-disabled'), 'false')
  assert.equal(await tela().textContent('#motivo'), '')
  await tela().evaluate(() => document.getElementById('email').blur()); await page.waitForTimeout(500)
  assert.equal(await tela().getAttribute('[data-flut]', 'data-valido'), 'true')
  assert.equal(await css('.ok-campo', 'opacity'), '1')
  assert.match(await css('.ok-campo', 'transitionTimingFunction'), /cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/)
  assert.equal(await css('#email', 'borderTopColor'), 'rgb(31, 122, 77)', 'borda nao ficou --sucesso')
  await tela().fill('#email', ''); await page.waitForTimeout(100)
  assert.equal(await tela().getAttribute('[data-enviar]', 'aria-disabled'), 'true')
  await tela().click('[data-fechar]'); await page.waitForTimeout(400)
  await clicar('versao', 'sem')
  await tela().click('[data-abrir-form]')
  assert.equal(await tela().getAttribute('[data-enviar]', 'aria-disabled'), null)
  await tela().click('[data-fechar]')
})

await caso('1.2 enviar: o botao fecha em circulo (largura intermediaria), gira, fica verde e chega em "Salvo"', async () => {
  await clicar('versao', 'com')
  await tela().click('[data-abrir-form]'); await page.waitForTimeout(500)
  await tela().fill('#email', 'cliente@empresa.com')
  const r = await tela().evaluate(async () => {
    const b = document.querySelector('[data-enviar]'), w0 = b.getBoundingClientRect().width, h = b.getBoundingClientRect().height
    b.click(); const t0 = performance.now(), linhas = []
    while (performance.now() - t0 < 4200) { linhas.push([b.getBoundingClientRect().width, b.dataset.estado, b.querySelector('.rot')?.textContent, getComputedStyle(b).backgroundColor]); await new Promise(r => requestAnimationFrame(r)) }
    return { w0, h, linhas, painel: !!document.querySelector('.fundo-painel'), aviso: document.querySelector('.aviso')?.textContent }
  })
  const larg = r.linhas.map(l => l[0]).filter(w => w > 0)
  assert.ok(larg.some(w => w > r.h + 3 && w < r.w0 - 3), `nenhuma largura intermediaria entre ${r.h} e ${r.w0}`)
  assert.ok(larg.some(w => Math.abs(w - r.h) < 1.5), 'nao chegou ao circulo')
  const estados = new Set(r.linhas.map(l => l[1]))
  for (const e of ['fechando', 'carregando', 'salvo', 'voltando']) assert.ok(estados.has(e), `faltou o estado ${e}`)
  assert.ok(r.linhas.some(l => l[2] === 'Salvo'), 'nunca mostrou "Salvo"')
  assert.ok(r.linhas.some(l => l[1] === 'salvo' && l[3] === 'rgb(31, 122, 77)'), 'nao ficou verde (--sucesso)')
  assert.equal(r.painel, false, 'painel nao fechou'); assert.match(r.aviso ?? '', /Pedido criado/)
})

await caso('1.2 movimento reduzido: as transicoes e animacoes do Com zeram', async () => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await clicar('versao', 'com'); await clicar('aparelho', 'desktop')
  const dur = async sel => (await css(sel, 'transitionDuration')).split(',').map(parseFloat)
  for (const sel of ['.resumo .card', '.aba', '[data-atualizar]', '.ind', '.lista']) for (const d of await dur(sel)) assert.ok(d <= 0.001, `${sel}: transicao de ${d}s`)
  assert.ok(parseFloat(await tela().evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mov-padrao'))) <= 0.01)
  const r = await tela().evaluate(async () => {
    avisar('Teste'); const a = document.querySelector('.aviso'); const aviso = parseFloat(getComputedStyle(a).animationDuration), barra = getComputedStyle(a.querySelector('i')).display
    a.remove(); document.querySelector('[data-abrir-form]').click(); const p = document.querySelector('.painel')
    const painel = parseFloat(getComputedStyle(p).transitionDuration); document.querySelector('[data-fechar]').click()
    return { aviso, barra, painel }
  })
  assert.ok(r.aviso <= 0.001, `aviso ${r.aviso}s`); assert.equal(r.barra, 'none'); assert.ok(r.painel <= 0.001, `painel ${r.painel}s`)
  const antes = await tela().evaluate(async () => { const ind = document.querySelector('.ind'); document.querySelector('[data-aba="pagos"]').click(); await new Promise(r => setTimeout(r, 80)); return ind.getAnimations().filter(a => a.playState === 'running').length })
  await tela().click('[data-aba="todos"]')
  assert.equal(antes, 0, 'indicador ainda anima com movimento reduzido')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(300)
})

await caso('nenhum erro de pagina ou console', async () => assert.deepEqual(erros, []))

await browser.close()
server.close()
for (const [s, n, m] of resultados) console.log(`${s === 'ok' ? 'ok    ' : 'FALHOU'} ${n}${m ? `\n       ${m}` : ''}`)
process.exit(resultados.some(r => r[0] !== 'ok') ? 1 : 0)
