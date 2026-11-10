// Arrastar card (kanban) com mouse, toque e teclado. Sem dependencia: pointer events + FLIP com Web Animations.
//
// Como funciona:
// - Pegou (passou de 4px): o card vira position:fixed no mesmo lugar e segue o ponteiro 1:1 (translate direto no DOM,
//   sem re-render por frame). Uma "vaga" (placeholder) ocupa o lugar dele no fluxo e anda entre os vizinhos.
//   O card pego NUNCA troca de pai no React durante o arrasto, entao o gesto (e a captura implicita do toque) nao se perde.
// - Quando a vaga muda de lugar, os vizinhos deslizam: tira foto das posicoes antes, deixa o React mexer no DOM,
//   e no useLayoutEffect anima de onde estavam ate onde ficaram (FLIP, 200ms).
// - Soltou: grava pelo mesmo update(next) do app e o card assenta no lugar em 250ms.
// - Mouse pega o card inteiro. Toque so pega pela alca ([data-alca], touch-action:none no CSS): o resto do card
//   continua rolando a pagina, e press-and-hold de 200ms brigaria com o menu de contexto e a rolagem do celular.
// - Teclado: card focavel, espaco pega/solta, setas movem, Esc cancela. Mudanca fica em previa e so vai pro db ao soltar.
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'

export type Board = { columns: { id: string; label: string; cards: { id: string; title: string }[] }[] }
export type Drag = { id: string; col: number; index: number; left: number; top: number; width: number; height: number }

const LIMIAR = 4
const DESLIZE = 200
const ASSENTO = 250
const CURVA = 'cubic-bezier(.65,0,.35,1)'
const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function achar(b: Board, id: string) {
  for (let col = 0; col < b.columns.length; col++) {
    const i = b.columns[col].cards.findIndex(c => c.id === id)
    if (i >= 0) return { col, i }
  }
  return null
}

/** Puro: tira o card de onde esta e poe na coluna `col`, na posicao `index` (contada sem ele). */
export function mover<D extends Board>(b: D, id: string, col: number, index: number): D {
  const at = achar(b, id)
  if (!at) return b
  const card = b.columns[at.col].cards[at.i]
  const columns = b.columns.map(c => ({ ...c, cards: c.cards.filter(k => k.id !== id) }))
  columns[col].cards.splice(index, 0, card)
  return { ...b, columns } as D
}

/** Lista da coluna com a vaga (null) no lugar certo. O card pego continua na posicao original da lista. */
export function comVaga<T extends { id: string }>(cards: T[], drag: Drag | null, col: number): (T | null)[] {
  if (!drag || drag.col !== col) return cards
  const out: (T | null)[] = []
  let n = 0
  let ok = false
  for (const c of cards) {
    if (c.id !== drag.id) {
      if (n === drag.index) {
        out.push(null)
        ok = true
      }
      n++
    }
    out.push(c)
  }
  if (!ok) out.push(null)
  return out
}

const snap = (root: HTMLElement) =>
  new Map([...root.querySelectorAll<HTMLElement>('[data-id]')].map(e => [e.dataset.id!, e.getBoundingClientRect()]))

function flip(root: HTMLElement, antes: Map<string, DOMRect>, pular?: string) {
  if (reduz()) return // sem deslize: troca direta
  const els = [...root.querySelectorAll<HTMLElement>('[data-id]')].filter(e => e.dataset.id !== pular)
  els.forEach(e => e.getAnimations().forEach(a => a.cancel())) // mede o layout real, sem transform em voo
  for (const e of els) {
    const p = antes.get(e.dataset.id!)
    if (!p) continue
    const r = e.getBoundingClientRect()
    const dx = p.left - r.left
    const dy = p.top - r.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
    e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: DESLIZE, easing: CURVA })
  }
}

/** Coluna mais perto do ponteiro e a posicao nela. Na coluna de origem a vaga so troca com o vizinho que o card passou. */
function destino(root: HTMLElement, id: string, r: DOMRect, px: number, py: number, cur: Drag) {
  const cols = [...root.querySelectorAll<HTMLElement>('[data-col]')]
  let melhor = 0
  let dmin = Infinity
  cols.forEach((c, i) => {
    const b = c.getBoundingClientRect()
    const d = Math.hypot(Math.max(b.left - px, 0, px - b.right), Math.max(b.top - py, 0, py - b.bottom))
    if (d < dmin) {
      dmin = d
      melhor = i
    }
  })
  const cy = r.top + r.height / 2
  const centro = (e: HTMLElement) => {
    const b = e.getBoundingClientRect()
    return b.top + b.height / 2
  }
  const itens = [...cols[melhor].querySelectorAll<HTMLElement>(':scope > [data-id], :scope > [data-vaga]')].filter(e => e.dataset.id !== id)
  if (melhor !== cur.col) return { col: melhor, index: itens.filter(e => centro(e) < cy).length }
  const k = itens.findIndex(e => e.hasAttribute('data-vaga'))
  const ant = itens[k - 1]
  const prox = itens[k + 1]
  if (prox && cy > centro(prox)) return { col: melhor, index: cur.index + 1 }
  if (ant && cy < centro(ant)) return { col: melhor, index: cur.index - 1 }
  return { col: melhor, index: cur.index }
}

export function useArrastar<D extends Board>(db: D | null, update: (next: D) => void) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [kb, setKb] = useState<{ id: string; board: D } | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const dbRef = useRef(db)
  dbRef.current = db
  const antes = useRef<Map<string, DOMRect> | null>(null)
  const pular = useRef<string | undefined>(undefined)
  const assentar = useRef<{ id: string; cx: number; cy: number; sombra: string } | null>(null)
  const foco = useRef<string | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const achaEl = (id: string) => root.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)
    if (antes.current) {
      flip(root, antes.current, pular.current)
      antes.current = null
    }
    const s = assentar.current
    if (s) {
      assentar.current = null
      const el = achaEl(s.id)
      if (el && !reduz()) {
        el.getAnimations().forEach(a => a.cancel())
        const r = el.getBoundingClientRect()
        el.animate(
          [
            { transform: `translate(${s.cx - (r.left + r.width / 2)}px, ${s.cy - (r.top + r.height / 2)}px) scale(1.03)`, boxShadow: s.sombra, zIndex: 5 },
            { transform: 'none', boxShadow: getComputedStyle(el).boxShadow, zIndex: 5 },
          ],
          { duration: ASSENTO, easing: CURVA },
        )
      }
    }
    if (foco.current) {
      achaEl(foco.current)?.focus()
      foco.current = null
    }
  })

  const aoPegar = (e: PointerEvent<HTMLElement>, id: string) => {
    const root = rootRef.current
    const b0 = dbRef.current
    if (!root || !b0 || e.button !== 0 || drag || kb) return
    const alvo = e.target as HTMLElement
    if (alvo.closest('button, a, input')) return
    if (e.pointerType === 'touch' && !alvo.closest('[data-alca]')) return
    const card = e.currentTarget
    const x0 = e.clientX
    const y0 = e.clientY
    const ptr = e.pointerId
    const at = achar(b0, id)!
    const titulo = b0.columns[at.col].cards[at.i].title
    const html = document.documentElement
    html.style.userSelect = 'none'
    let cur: Drag | null = null

    const mexe = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== ptr) return
      const dx = ev.clientX - x0
      const dy = ev.clientY - y0
      if (!cur) {
        if (Math.hypot(dx, dy) < LIMIAR) return // clique simples continua sendo clique
        const r = card.getBoundingClientRect()
        const c0: Drag = { id, col: at.col, index: at.i, left: r.left, top: r.top, width: r.width, height: r.height }
        cur = c0
        flushSync(() => setDrag(c0))
        setAnuncio(`${titulo} pego`)
      }
      card.style.translate = `${dx}px ${dy}px`
      const d = destino(root, id, card.getBoundingClientRect(), ev.clientX, ev.clientY, cur)
      if (d.col !== cur.col || d.index !== cur.index) {
        antes.current = snap(root)
        pular.current = id
        cur = { ...cur, ...d }
        setDrag(cur)
      }
    }
    const fim = (cancelar: boolean) => {
      window.removeEventListener('pointermove', mexe)
      window.removeEventListener('pointerup', solta)
      window.removeEventListener('pointercancel', cancela)
      window.removeEventListener('keydown', tecla)
      html.style.userSelect = ''
      const c = cur
      if (!c) return
      const r = card.getBoundingClientRect()
      assentar.current = { id, cx: r.left + r.width / 2, cy: r.top + r.height / 2, sombra: getComputedStyle(card).boxShadow }
      card.style.translate = ''
      const b = dbRef.current
      setDrag(null)
      if (!cancelar && b && (c.col !== at.col || c.index !== at.i)) update(mover(b, id, c.col, c.index))
      setAnuncio(cancelar ? `${titulo}: cancelado` : `${titulo} solto`)
    }
    const solta = (ev: globalThis.PointerEvent) => ev.pointerId === ptr && fim(false)
    const cancela = (ev: globalThis.PointerEvent) => ev.pointerId === ptr && fim(true)
    const tecla = (ev: globalThis.KeyboardEvent) => ev.key === 'Escape' && fim(true)
    window.addEventListener('pointermove', mexe)
    window.addEventListener('pointerup', solta)
    window.addEventListener('pointercancel', cancela)
    window.addEventListener('keydown', tecla)
  }

  const aoTeclar = (e: KeyboardEvent<HTMLElement>, id: string) => {
    const root = rootRef.current
    const b = dbRef.current
    if (e.target !== e.currentTarget || !root || !b || drag) return
    const base = kb?.board ?? b
    const at = achar(base, id)!
    const { title } = base.columns[at.col].cards[at.i]
    const posicao = (bd: D) => {
      const p = achar(bd, id)!
      setAnuncio(`${title}: posição ${p.i + 1} de ${bd.columns[p.col].cards.length} em ${bd.columns[p.col].label}`)
    }
    if (e.key === ' ') {
      e.preventDefault()
      if (!kb) {
        setKb({ id, board: b })
        setAnuncio(`${title} pego`)
      } else {
        const o = achar(b, id)!
        setKb(null)
        if (o.col !== at.col || o.i !== at.i) update(kb.board)
        setAnuncio(`${title} solto`)
      }
      return
    }
    if (!kb) return
    if (e.key === 'Escape') {
      e.preventDefault()
      antes.current = snap(root)
      foco.current = id
      setKb(null)
      setAnuncio(`${title}: cancelado`)
      return
    }
    let { col, i } = at
    if (e.key === 'ArrowUp') i--
    else if (e.key === 'ArrowDown') i++
    else if (e.key === 'ArrowLeft') col--
    else if (e.key === 'ArrowRight') col++
    else return
    e.preventDefault()
    col = Math.max(0, Math.min(col, base.columns.length - 1))
    const total = base.columns[col].cards.length - (col === at.col ? 1 : 0)
    i = Math.max(0, Math.min(i, total))
    if (col === at.col && i === at.i) return posicao(base)
    antes.current = snap(root)
    foco.current = id // trocar de coluna remonta o card: devolve o foco
    const board = mover(base, id, col, i)
    setKb({ id, board })
    posicao(board)
  }

  return {
    rootRef,
    drag,
    anuncio,
    /** O que mostrar: a previa do teclado, ou o db. */
    board: kb?.board ?? db,
    /** Props do card (o className vai depois de "card "). */
    props: (id: string) => ({
      'data-id': id,
      tabIndex: 0,
      'aria-describedby': 'dica-arrastar',
      className: drag?.id === id ? 'pego voando' : kb?.id === id ? 'pego teclado' : '',
      style: drag?.id === id ? { left: drag.left, top: drag.top, width: drag.width, height: drag.height } : undefined,
      onPointerDown: (e: PointerEvent<HTMLElement>) => aoPegar(e, id),
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => aoTeclar(e, id),
    }),
  }
}
