// Prova no Chromium real, para um alvo (ALVO=web|rn) numa largura (LARGURA=390|800|1280):
// 1) a demo aplica os tokens de espacamento daquela largura e muda o layout (menu 768, colunas 1024)
// 2) o skeleton repete a forma da ultima visita (cards, resumo fechado, menu recolhido)
// 3) zera o salto de layout (CLS) que o skeleton fixo causa
// 4) nao vaza entre usuarios e cai no fallback com storage falho, versao nova ou dado corrompido
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { espacoPara } from '../codigo/espaco.ts'
import { parseShape, shapeKey } from '../codigo/shape-store.ts'
import { servir } from './servir.mjs'

const ALVO = process.env.ALVO ?? 'web'
const LARGURA = Number(process.env.LARGURA ?? 1280)
const TOQUE = LARGURA < 1024
const MENU_LATERAL = LARGURA >= 768
const COLUNAS_LADO_A_LADO = LARGURA >= 1024
const E = espacoPara(LARGURA)

const server = await servir(0)
const base = `http://localhost:${server.address().port}/${ALVO === 'rn' ? 'rn' : 'demo'}/`
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const erros = []
const avisosSkeleton = []
const resultados = []
console.log(`alvo: ${ALVO} | largura: ${LARGURA}px\n`)

async function novoContexto(init) {
  const ctx = await browser.newContext({
    viewport: { width: LARGURA, height: 900 },
    ...(TOQUE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  })
  await ctx.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  // botao Recarregar e da pagina de teste manual, nao do app: fora do caminho do clique
  await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => document.querySelector('.recarregar')?.remove()))
  if (init) await ctx.addInitScript(init)
  return ctx
}

function vigiar(page) {
  page.on('pageerror', e => erros.push(String(e)))
  page.on('console', m => {
    if (m.type() === 'error') erros.push(m.text())
    if (m.text().includes('[skeleton-adaptativo]')) avisosSkeleton.push(m.text().slice(0, 200))
  })
}

// Fotografa a tela: cards de cada coluna, resumo, menu e as distancias de espacamento
const fotografar = cardSel => {
  const q = s => document.querySelector(`[data-testid=${s}]`)
  const r = el => el.getBoundingClientRect()
  const cols = [...document.querySelectorAll('[data-col]')]
  const comCapa = [...document.querySelectorAll(`[data-testid=${cardSel}]`)].find(k => k.querySelector('[data-testid=cover]'))
  return {
    menu: r(q('menu')).width,
    painel: r(q('painel')).height,
    colunas: cols.map(c => ({
      id: c.dataset.col,
      cards: [...c.querySelectorAll(`[data-testid=${cardSel}]`)].map(k => {
        const b = r(k)
        return { x: b.x, y: b.y, w: b.width, h: b.height, imagem: !!k.querySelector('[data-testid=cover]') }
      }),
    })),
    footer: r(q('footer')).y,
    espaco: {
      margem: r(q('topo')).left - r(q('conteudo')).left,
      pad: comCapa ? r(comCapa.querySelector('[data-testid=cover]')).left - r(comCapa).left : null,
      secaoTopoPainel: r(q('painel')).top - r(q('topo')).bottom,
      entreColunasX: r(cols[1]).left - r(cols[0]).right,
      entreColunasY: r(cols[1]).top - r(cols[0]).bottom,
      larguraConteudo: r(q('conteudo')).width,
      rolagemLateral: document.documentElement.scrollWidth - innerWidth,
    },
    cls: window.__cls,
  }
}

async function carregar(page, query = '') {
  await page.goto(base + '?delay=1200' + query)
  await page.waitForSelector('[data-testid=skeleton]')
  const sk = await page.evaluate(fotografar, 'sk-card')
  await page.waitForSelector('[data-testid=board]')
  await page.waitForTimeout(150) // deixa o layout-shift ser entregue
  const real = await page.evaluate(fotografar, 'card')
  return { sk, real }
}

const contagem = s => s.colunas.map(c => c.cards.length).join('/')
const perto = (a, b, nome) => assert.ok(Math.abs(a - b) < 1, `${nome}: medido ${a.toFixed(1)}, esperado ${b}`)

async function caso(nome, fn) {
  try {
    await fn()
    resultados.push(['ok', nome])
  } catch (e) {
    resultados.push(['FALHOU', nome, e.message])
  }
}

const ctx = await novoContexto()
const page = await ctx.newPage()
vigiar(page)
const medidas = {}

await caso('1a visita: skeleton padrao (1/1/1, resumo aberto, menu aberto)', async () => {
  const { sk, real } = await carregar(page)
  medidas.inicial = real
  assert.equal(contagem(sk), '1/1/1')
  perto(sk.painel, real.painel, 'resumo aberto')
  if (MENU_LATERAL) perto(sk.menu, 220, 'menu aberto')
})

await caso(`a demo aplica os tokens de ${LARGURA}px e muda o layout`, async () => {
  const e = medidas.inicial.espaco
  perto(e.margem, E.margem, 'margem')
  perto(e.pad, E.pad, 'respiro do card')
  perto(e.secaoTopoPainel, E.secao, 'entre secoes')
  if (COLUNAS_LADO_A_LADO) perto(e.entreColunasX, E.grade, 'entre colunas')
  else perto(e.entreColunasY, E.secao, 'colunas empilhadas como secoes')
  if (E.conteudoMax) assert.ok(e.larguraConteudo <= E.conteudoMax + 0.5)
  assert.equal(e.rolagemLateral, 0, 'rolagem lateral')
  if (MENU_LATERAL) assert.ok(medidas.inicial.menu >= 200, 'menu lateral')
  else assert.ok(medidas.inicial.menu >= LARGURA - 1, 'menu vira barra no topo')
})

await caso('depois de mexer, o reload repete a forma (0/1/1, resumo fechado, menu recolhido)', async () => {
  await page.click('[data-col=rascunho] [data-testid=move]') // card com imagem vai pra Produzindo
  await page.click('[data-col=concluido] [data-testid=add-text]') // card so texto em Concluido
  await page.click('[data-testid=toggle-painel]')
  if (MENU_LATERAL) await page.click('[data-testid=toggle-menu]')
  const { sk, real } = await carregar(page)
  medidas.adaptativo = { sk, real }
  assert.equal(contagem(sk), '0/1/1')
  assert.deepEqual(sk.colunas.map(c => c.cards.map(k => k.imagem)), [[], [true], [false]])
  assert.ok(sk.painel < medidas.inicial.painel, 'resumo fechado no skeleton')
  perto(sk.painel, real.painel, 'resumo')
  if (MENU_LATERAL) perto(sk.menu, 72, 'menu recolhido no skeleton')
})

await caso('skeleton adaptativo ocupa exatamente o lugar dos cards reais (CLS 0)', async () => {
  const { sk, real } = medidas.adaptativo
  assert.equal(contagem(sk), contagem(real))
  sk.colunas.forEach((c, i) =>
    c.cards.forEach((k, j) => {
      const r = real.colunas[i].cards[j]
      for (const p of ['x', 'y', 'w', 'h']) perto(k[p], r[p], `${c.id}[${j}].${p}`)
    }),
  )
  perto(sk.footer, real.footer, 'rodape')
  assert.ok(real.cls < 0.001, `CLS ${real.cls}`)
})

await caso('controle: skeleton fixo, mesmo estado, pula (CLS > 0)', async () => {
  const { sk, real } = await carregar(page, '&modo=fixo')
  medidas.fixo = { sk, real }
  assert.ok(real.cls > 0.01, `CLS do fixo ${real.cls}`)
  assert.notEqual(contagem(sk), contagem(real))
})

await caso('outro usuario no mesmo navegador nao herda a forma', async () => {
  const { sk } = await carregar(page, '&u=b')
  assert.equal(contagem(sk), '1/1/1')
  perto(sk.painel, medidas.inicial.painel, 'resumo aberto')
})

await caso('versao nova da forma volta pro padrao', async () => {
  const { sk } = await carregar(page, '&v=3')
  assert.equal(contagem(sk), '1/1/1')
})

await caso('lista grande vira no maximo 6 blocos', async () => {
  await carregar(page, '&u=c')
  for (let i = 0; i < 10; i++) await page.click('[data-col=rascunho] [data-testid=add-text]')
  const { sk, real } = await carregar(page, '&u=c')
  assert.equal(real.colunas[0].cards.length, 11)
  assert.equal(sk.colunas[0].cards.length, 6)
})

await caso('forma corrompida no storage cai no padrao sem erro', async () => {
  await page.evaluate(() => localStorage.setItem('shape:planner:a', '{lixo'))
  const { sk, real } = await carregar(page)
  assert.equal(contagem(sk), '1/1/1')
  assert.equal(contagem(real), '0/1/1')
})

await caso('storage bloqueado (modo privado/sandbox): tela abre normal', async () => {
  const bloqueado = await novoContexto(() => {
    const boom = () => {
      throw new DOMException('bloqueado', 'SecurityError')
    }
    Storage.prototype.getItem = boom
    Storage.prototype.setItem = boom
  })
  const p = await bloqueado.newPage()
  vigiar(p)
  const { sk, real } = await carregar(p)
  assert.equal(contagem(sk), '1/1/1')
  assert.equal(contagem(real), '1/0/0')
  await bloqueado.close()
})

if (ALVO !== 'rn')
  await caso('variante cookie (Next loading.tsx): servidor le a forma do cookie', async () => {
    const c = await novoContexto()
    const p = await c.newPage()
    vigiar(p)
    await carregar(p, '&storage=cookie')
    await p.click('[data-col=rascunho] [data-testid=move]')
    await p.click('[data-testid=toggle-painel]')
    const { sk } = await carregar(p, '&storage=cookie')
    assert.equal(contagem(sk), '0/1/0')
    // o que o loading.tsx faria com cookies().get(...)
    const nome = shapeKey('planner', 'a')
    const cookie = (await c.cookies()).find(k => decodeURIComponent(k.name) === nome)
    assert.ok(cookie, 'cookie nao gravado')
    assert.ok(cookie.value.length < 4096)
    const forma = parseShape(decodeURIComponent(cookie.value), { version: 2 })
    assert.deepEqual(forma, {
      menuRecolhido: false,
      painelFechado: true,
      columns: [{ id: 'rascunho', cards: [] }, { id: 'produzindo', cards: [true] }, { id: 'concluido', cards: [] }],
    })
    await c.close()
  })

await caso('quem tinha dado da versao anterior (campo faltando) volta a ter skeleton adaptativo', async () => {
  const c = await novoContexto()
  const p = await c.newPage()
  vigiar(p)
  await p.goto(base + '?delay=0&u=antigo')
  await p.evaluate(() => {
    // quadro e forma gravados pela 1.0.0: sem menuRecolhido nem painelFechado
    localStorage.setItem('demo-db:antigo', JSON.stringify({ sidebarCollapsed: true, columns: [
      { id: 'rascunho', label: 'Rascunho', cards: [] },
      { id: 'produzindo', label: 'Produzindo', cards: [{ id: 'x1', title: 'Conteudo 03', image: true }] },
      { id: 'concluido', label: 'Concluido', cards: [{ id: 'x2', title: 'Conteudo 55', image: true }] } ] }))
    localStorage.setItem('shape:planner:antigo', JSON.stringify({ v: 1, t: Date.now(), s: { sidebarCollapsed: true, columns: [] } }))
  })
  await carregar(p, '&u=antigo') // 1a abertura depois da atualizacao: padrao, e grava a forma nova
  await p.click('[data-col=concluido] [data-testid=add-text]')
  const { sk, real } = await carregar(p, '&u=antigo')
  assert.equal(contagem(real), '0/1/2')
  assert.equal(contagem(sk), contagem(real), 'skeleton preso no padrao')
  await c.close()
})

// ---- arrastar card (so web: o rn tem o proprio componente, sem esse arrastar) ----
if (ALVO !== 'rn') {
  const dctx = await novoContexto()
  const dp = await dctx.newPage()
  vigiar(dp)
  await dp.setViewportSize({ width: LARGURA, height: 2400 }) // coluna empilhada (celular/tablet) tem que caber na tela
  const abrir = async u => {
    await dp.goto(`${base}?delay=0&u=${u}`)
    await dp.waitForSelector('[data-testid=board]')
  }
  const titulos = col => dp.$$eval(`[data-col=${col}] [data-testid=card] strong`, e => e.map(x => x.textContent))
  const contar = col => dp.$$eval(`[data-col=${col}] [data-testid=card]`, e => e.length)
  const tituloCol = col => dp.textContent(`[data-col=${col}] .col-titulo span`)
  const centro = async sel => {
    const b = await dp.locator(sel).first().boundingBox()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }
  }
  const anuncio = () => dp.textContent('[data-testid=anuncio]')
  const adicionar = async n => {
    for (let i = 0; i < n; i++) await dp.click('[data-col=rascunho] [data-testid=add-text]')
  }
  const dbSalvo = u => dp.evaluate(k => localStorage.getItem(k), `demo-db:${u}`)

  await caso('arrastar: mouse reordena dentro da coluna e grava no db', async () => {
    await abrir('dnd1')
    await adicionar(2)
    const antes = await titulos('rascunho')
    assert.equal(antes.length, 3)
    const a = await centro('[data-col=rascunho] [data-testid=card] strong >> nth=0')
    const ultimo = await dp.locator('[data-col=rascunho] [data-testid=card]').nth(2).boundingBox()
    const cardA = await dp.locator('[data-col=rascunho] [data-testid=card]').first().boundingBox()
    // leva o CENTRO do card pego um pouco abaixo do centro do ultimo (o ponteiro pega no titulo, nao no meio)
    const alvoY = ultimo.y + ultimo.height / 2 + 20 + (a.y - (cardA.y + cardA.height / 2))
    await dp.mouse.move(a.x, a.y)
    await dp.mouse.down()
    await dp.mouse.move(a.x, alvoY, { steps: 40 })
    await dp.mouse.up()
    await dp.waitForTimeout(350)
    assert.deepEqual(await titulos('rascunho'), [antes[1], antes[2], antes[0]])
    const salvo = JSON.parse(await dbSalvo('dnd1'))
    assert.deepEqual(salvo.columns[0].cards.map(c => c.title), [antes[1], antes[2], antes[0]])
  })

  await caso('arrastar: para outra coluna move o card e a contagem muda', async () => {
    await abrir('dnd2')
    assert.equal(await tituloCol('rascunho'), '1')
    const a = await centro('[data-col=rascunho] [data-testid=card] strong')
    const alvo = await centro('[data-col=produzindo]')
    await dp.mouse.move(a.x, a.y)
    await dp.mouse.down()
    await dp.mouse.move(alvo.x, alvo.y, { steps: 30 })
    await dp.mouse.up()
    await dp.waitForTimeout(350)
    assert.deepEqual([await contar('rascunho'), await contar('produzindo'), await contar('concluido')], [0, 1, 0])
    assert.equal(await tituloCol('rascunho'), '0')
    assert.equal(await tituloCol('produzindo'), '1')
    assert.deepEqual(await titulos('produzindo'), ['Revisar proposta'])
  })

  await caso('arrastar: durante o arrasto os vizinhos animam e o documento nao seleciona texto', async () => {
    await abrir('dnd3')
    await adicionar(2)
    const a = await centro('[data-col=rascunho] [data-testid=card] strong >> nth=0')
    await dp.mouse.move(a.x, a.y)
    await dp.mouse.down()
    let achou = false
    let y = a.y
    for (let i = 0; i < 60 && !achou; i++) {
      y += 8
      await dp.mouse.move(a.x, y)
      achou = await dp.evaluate(
        () =>
          document.getAnimations().length > 0 &&
          [...document.querySelectorAll('[data-testid=card]:not(.pego)')].some(c => c.getAnimations().length > 0),
      )
    }
    const estado = await dp.evaluate(() => ({
      sel: getComputedStyle(document.documentElement).userSelect,
      pego: !!document.querySelector('.card.pego'),
      sombra: getComputedStyle(document.querySelector('.card.pego')).boxShadow,
      escala: getComputedStyle(document.querySelector('.card.pego')).scale,
    }))
    await dp.mouse.up()
    assert.ok(achou, 'nenhum outro card animou')
    assert.equal(estado.sel, 'none')
    assert.ok(estado.pego)
    assert.equal(estado.escala, '1.03')
    assert.notEqual(estado.sombra, 'none')
    await dp.waitForTimeout(350)
    assert.equal(await dp.evaluate(() => getComputedStyle(document.documentElement).userSelect), 'auto')
  })

  await caso('arrastar: clique simples (ou menos de 4px) nao arrasta', async () => {
    await abrir('dnd4')
    await adicionar(1)
    const antes = await titulos('rascunho')
    const dbAntes = await dbSalvo('dnd4')
    const a = await centro('[data-col=rascunho] [data-testid=card] strong >> nth=0')
    await dp.mouse.move(a.x, a.y)
    await dp.mouse.down()
    await dp.mouse.move(a.x + 3, a.y, { steps: 3 })
    assert.equal(await dp.evaluate(() => !!document.querySelector('.pego, [data-vaga]')), false)
    await dp.mouse.up()
    await dp.waitForTimeout(100)
    assert.deepEqual(await titulos('rascunho'), antes)
    assert.equal(await dbSalvo('dnd4'), dbAntes)
  })

  await caso('arrastar: teclado (espaco, seta, espaco) move, anuncia e entre colunas tambem', async () => {
    await abrir('dnd5')
    await adicionar(2)
    const antes = await titulos('rascunho')
    await dp.locator('[data-col=rascunho] [data-testid=card]').first().focus()
    await dp.keyboard.press(' ')
    assert.match(await anuncio(), /pego/)
    await dp.keyboard.press('ArrowDown')
    assert.match(await anuncio(), new RegExp(`${antes[0]}: posição 2 de 3 em A fazer`))
    await dp.keyboard.press(' ')
    assert.match(await anuncio(), /solto/)
    await dp.waitForTimeout(350)
    assert.deepEqual(await titulos('rascunho'), [antes[1], antes[0], antes[2]])
    // entre colunas: seta direita, e o foco acompanha o card
    await dp.keyboard.press(' ')
    await dp.keyboard.press('ArrowRight')
    assert.match(await anuncio(), /posição 1 de 1 em Em andamento/)
    assert.equal(await dp.evaluate(() => document.activeElement?.dataset.id != null), true, 'foco perdido')
    await dp.keyboard.press(' ')
    await dp.waitForTimeout(350)
    assert.deepEqual([await contar('rascunho'), await contar('produzindo')], [2, 1])
  })

  await caso('arrastar: Esc cancela (teclado e mouse) e volta a origem sem gravar', async () => {
    await abrir('dnd6')
    await adicionar(2)
    const antes = await titulos('rascunho')
    const dbAntes = await dbSalvo('dnd6')
    await dp.locator('[data-col=rascunho] [data-testid=card]').first().focus()
    await dp.keyboard.press(' ')
    await dp.keyboard.press('ArrowDown')
    await dp.keyboard.press('ArrowRight')
    await dp.keyboard.press('Escape')
    assert.match(await anuncio(), /cancelado/)
    await dp.waitForTimeout(350)
    assert.deepEqual(await titulos('rascunho'), antes)
    assert.equal(await contar('produzindo'), 0)
    assert.equal(await dbSalvo('dnd6'), dbAntes)
    // mouse: arrasta ate outra coluna e aperta Esc antes de soltar
    const a = await centro('[data-col=rascunho] [data-testid=card] strong >> nth=0')
    const alvo = await centro('[data-col=produzindo]')
    await dp.mouse.move(a.x, a.y)
    await dp.mouse.down()
    await dp.mouse.move(alvo.x, alvo.y, { steps: 20 })
    await dp.keyboard.press('Escape')
    await dp.mouse.up()
    await dp.waitForTimeout(350)
    assert.deepEqual(await titulos('rascunho'), antes)
    assert.equal(await contar('produzindo'), 0)
    assert.equal(await dbSalvo('dnd6'), dbAntes)
  })

  await caso('arrastar: teclado, "+ texto" no meio da previa nao some com o card novo e o pego vai pra coluna', async () => {
    await abrir('dnd9')
    const [pego] = await titulos('rascunho')
    await dp.locator('[data-col=rascunho] [data-testid=card]').first().focus()
    await dp.keyboard.press(' ')
    await dp.keyboard.press('ArrowRight')
    await dp.click('[data-col=rascunho] [data-testid=add-text]')
    // antes de soltar: o card novo ja aparece e a previa do pego continua em "Em andamento"
    assert.equal(await contar('rascunho'), 1)
    assert.deepEqual(await titulos('produzindo'), [pego])
    assert.equal(JSON.parse(await dbSalvo('dnd9')).columns[0].cards.length, 2, 'db tem os dois cards antes de soltar')
    await dp.locator('[data-col=produzindo] [data-testid=card]').first().focus()
    await dp.keyboard.press(' ')
    await dp.waitForTimeout(350)
    assert.deepEqual(await titulos('produzindo'), [pego])
    assert.equal(await contar('rascunho'), 1)
    const salvo = JSON.parse(await dbSalvo('dnd9'))
    assert.deepEqual(salvo.columns.map(c => c.cards.length), [1, 1, 0])
    assert.equal(salvo.columns[1].cards[0].title, pego)
  })

  await caso('arrastar: Tab para fora do card pego cancela, o card volta a origem e nada e gravado', async () => {
    await abrir('dnd10')
    await adicionar(1)
    const antes = await titulos('rascunho')
    const dbAntes = await dbSalvo('dnd10')
    await dp.locator('[data-col=rascunho] [data-testid=card]').first().focus()
    await dp.keyboard.press(' ')
    await dp.keyboard.press('ArrowRight')
    assert.equal(await contar('produzindo'), 1)
    await dp.keyboard.press('Tab')
    assert.match(await anuncio(), /cancelado/)
    await dp.waitForTimeout(350)
    assert.deepEqual(await titulos('rascunho'), antes)
    assert.equal(await contar('produzindo'), 0)
    assert.equal(await dbSalvo('dnd10'), dbAntes)
    // sem previa presa: "mover" age no db e o card nao fica com a marca de pego
    await dp.click('[data-col=rascunho] [data-testid=move] >> nth=0')
    assert.deepEqual(await titulos('produzindo'), [antes[0]])
    assert.equal(await dp.locator('.pego').count(), 0)
  })

  await caso('arrastar: durante a previa, "mover" e "+ texto" agem e a previa continua certa', async () => {
    await abrir('dnd11')
    await adicionar(1)
    const [a, b] = await titulos('rascunho')
    await dp.locator('[data-col=rascunho] [data-testid=card]').first().focus()
    await dp.keyboard.press(' ')
    await dp.keyboard.press('ArrowRight') // previa: a em "Em andamento"
    await dp.locator('[data-col=rascunho] [data-testid=card]', { hasText: b }).locator('[data-testid=move]').click() // db: b vai pra "Em andamento"
    assert.equal(await contar('rascunho'), 0)
    assert.deepEqual(await titulos('produzindo'), [a, b])
    await dp.click('[data-col=concluido] [data-testid=add-text]')
    assert.equal(await contar('concluido'), 1)
    assert.deepEqual(await titulos('produzindo'), [a, b])
    await dp.locator('[data-col=produzindo] [data-testid=card]').first().focus()
    await dp.keyboard.press(' ')
    await dp.waitForTimeout(350)
    const salvo = JSON.parse(await dbSalvo('dnd11'))
    assert.deepEqual(salvo.columns.map(c => c.cards.length), [0, 2, 1])
    assert.deepEqual(salvo.columns[1].cards.map(c => c.title), [a, b])
  })

  await caso('arrastar: depois de mover e recarregar, o skeleton mostra a nova contagem por coluna', async () => {
    await abrir('dnd7')
    await adicionar(2) // 3/0/0
    const a = await centro('[data-col=rascunho] [data-testid=card] strong >> nth=0')
    const alvo = await centro('[data-col=concluido]')
    await dp.mouse.move(a.x, a.y)
    await dp.mouse.down()
    await dp.mouse.move(alvo.x, alvo.y, { steps: 30 })
    await dp.mouse.up()
    await dp.waitForTimeout(350)
    assert.deepEqual([await contar('rascunho'), await contar('produzindo'), await contar('concluido')], [2, 0, 1])
    const { sk, real } = await carregar(dp, '&u=dnd7')
    assert.equal(contagem(sk), '2/0/1')
    assert.equal(contagem(real), '2/0/1')
  })

  await caso('arrastar: prefers-reduced-motion troca direto, sem deslize', async () => {
    await dp.emulateMedia({ reducedMotion: 'reduce' })
    await abrir('dnd8')
    await adicionar(2)
    const a = await centro('[data-col=rascunho] [data-testid=card] strong >> nth=0')
    await dp.mouse.move(a.x, a.y)
    await dp.mouse.down()
    let animou = false
    for (let i = 0; i < 40; i++) {
      await dp.mouse.move(a.x, a.y + 8 * (i + 1))
      animou ||= await dp.evaluate(() => [...document.querySelectorAll('[data-testid=card]:not(.pego)')].some(c => c.getAnimations().length > 0))
    }
    await dp.mouse.up()
    await dp.emulateMedia({ reducedMotion: 'no-preference' })
    assert.equal(animou, false)
  })

  await dctx.close()
}

await caso('nenhum erro de pagina ou console, nenhuma forma recusada', async () => {
  assert.deepEqual(erros, [])
  assert.deepEqual(avisosSkeleton, [])
})

await browser.close()
server.close()

for (const [s, n, m] of resultados) console.log(`${s === 'ok' ? 'ok    ' : 'FALHOU'} ${n}${m ? `\n       ${m}` : ''}`)
if (medidas.adaptativo && medidas.fixo) {
  console.log(`\nCLS fixo: ${medidas.fixo.real.cls.toFixed(4)} | CLS adaptativo: ${medidas.adaptativo.real.cls.toFixed(4)}`)
}
process.exit(resultados.some(r => r[0] !== 'ok') ? 1 : 0)
