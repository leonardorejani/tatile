import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { ShapeStore } from './shape-store'

const noopSubscribe = () => () => {}

/**
 * Le a ultima forma salva (para o skeleton) e grava a forma atual sempre
 * que ela muda, inclusive em update otimista (arrastar card, recolher menu).
 *
 * - `current`: forma derivada do dado real; null/undefined enquanto carrega.
 * - No servidor e na hidratacao devolve `fallback` (sem mismatch); logo
 *   depois troca para a forma salva. No Next, para o skeleton ja sair certo
 *   do servidor, usar cookieStorage + parseShape no loading.tsx.
 */
export function useAdaptiveShape<S>(store: ShapeStore<S>, fallback: S, current: S | null | undefined): S {
  const fallbackRef = useRef(fallback)
  const cache = useRef<{ store: ShapeStore<S>; shape: S } | null>(null)

  const getSnapshot = () => {
    // Le uma vez por store: o skeleton nao muda enquanto esta na tela
    if (cache.current?.store !== store) cache.current = { store, shape: store.read() ?? fallbackRef.current }
    return cache.current.shape
  }
  const shape = useSyncExternalStore(noopSubscribe, getSnapshot, () => fallbackRef.current)

  const json = current == null ? null : JSON.stringify(current)
  useEffect(() => {
    if (current != null) store.write(current)
    // json cobre o conteudo de current, evita regravar a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, json])

  return shape
}
