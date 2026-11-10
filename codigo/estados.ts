// Estados de tela: atraso do carregamento e estado na URL.
// Nucleo sem React (testavel); os hooks no fim so embrulham.
import { useEffect, useRef, useState } from 'react'

/* ---------- Atraso de carga ----------
 * Resposta rapida nao pisca skeleton: ele so aparece depois de `espera` ms.
 * Se apareceu, fica pelo menos `minimo` ms, para nao sumir num piscar. */
export type Relogio = { agora(): number; agendar(fn: () => void, ms: number): unknown; cancelar(id: unknown): void }
const relogioPadrao: Relogio = { agora: () => Date.now(), agendar: (fn, ms) => setTimeout(fn, ms), cancelar: id => clearTimeout(id as never) }

export function criarAtrasoDeCarga(aoMudar: (visivel: boolean) => void, { espera = 200, minimo = 400, relogio = relogioPadrao } = {}) {
  let visivel = false
  let desde = 0
  let timer: unknown = null
  const mudar = (v: boolean) => {
    if (v === visivel) return
    visivel = v
    if (v) desde = relogio.agora()
    aoMudar(v)
  }
  return {
    get visivel() {
      return visivel
    },
    /** Comecou a carregar. */
    iniciar() {
      if (timer !== null) relogio.cancelar(timer)
      timer = visivel ? null : relogio.agendar(() => ((timer = null), mudar(true)), espera)
    },
    /** Terminou (com dado ou com erro). */
    terminar() {
      if (timer !== null) relogio.cancelar(timer)
      timer = null
      if (!visivel) return
      const falta = minimo - (relogio.agora() - desde)
      if (falta <= 0) mudar(false)
      else timer = relogio.agendar(() => ((timer = null), mudar(false)), falta)
    },
  }
}

/** `carregando` vem da query; devolve se o skeleton deve estar na tela agora. */
export function useAtrasoDeCarga(carregando: boolean, opcoes?: { espera?: number; minimo?: number }) {
  const [visivel, setVisivel] = useState(false)
  const ctl = useRef<ReturnType<typeof criarAtrasoDeCarga> | null>(null)
  if (!ctl.current) ctl.current = criarAtrasoDeCarga(setVisivel, opcoes)
  useEffect(() => {
    if (carregando) ctl.current!.iniciar()
    else ctl.current!.terminar()
  }, [carregando])
  return visivel
}

/* ---------- Estado na URL ----------
 * Aba, filtro, pagina e painel aberto vao para o endereco: recarregar, voltar e
 * compartilhar abrem na mesma tela. Valor igual ao padrao sai da URL (link limpo). */
export function lerDaUrl(busca: string, chave: string, padrao: string) {
  return new URLSearchParams(busca).get(chave) ?? padrao
}

export function urlCom(href: string, chave: string, valor: string, padrao: string) {
  const url = new URL(href)
  if (valor === padrao) url.searchParams.delete(chave)
  else url.searchParams.set(chave, valor)
  return url.pathname + url.search + url.hash
}

/** SPA (Vite). No Next, usar useSearchParams + router.replace com a mesma regra. */
export function useEstadoNaUrl(chave: string, padrao: string) {
  const [valor, setValor] = useState(() => (typeof location === 'undefined' ? padrao : lerDaUrl(location.search, chave, padrao)))
  useEffect(() => {
    const voltar = () => setValor(lerDaUrl(location.search, chave, padrao))
    addEventListener('popstate', voltar)
    return () => removeEventListener('popstate', voltar)
  }, [chave, padrao])
  const mudar = (novo: string) => {
    setValor(novo)
    // replace: trocar aba nao enche o historico; usar push so para navegacao de verdade
    history.replaceState(history.state, '', urlCom(location.href, chave, novo, padrao))
  }
  return [valor, mudar] as const
}

/* ---------- Troca de tema sem tudo deslizando ----------
 * Cada parte da tela tem a sua transicao de cor, entao na troca claro/escuro tudo muda em ritmo
 * diferente e a tela "arrasta". Desliga as transicoes por um quadro: aplica a troca com a classe
 * `sem-transicao` no html (regra em cor.css) e tira depois de 2 requestAnimationFrame. */
export function trocarTemaSemTransicao(aplicar: () => void, doc: Document = document) {
  const raiz = doc.documentElement
  raiz.classList.add('sem-transicao')
  aplicar()
  const raf = doc.defaultView?.requestAnimationFrame ?? ((fn: FrameRequestCallback) => setTimeout(() => fn(0), 16))
  raf(() => raf(() => raiz.classList.remove('sem-transicao')))
}
