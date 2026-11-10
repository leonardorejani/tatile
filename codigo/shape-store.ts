// Skeleton adaptativo: guarda a FORMA da ultima tela vista (nunca o conteudo)
// para o skeleton do proximo carregamento repetir o layout real.
// Sem dependencia. Copiar para o projeto e ajustar so o tipo da forma.

export type ShapeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type ShapeOptions<S> = {
  /** Tela, ex.: 'planner'. Vira parte da chave. */
  key: string
  /** Subir quando o formato de S mudar: forma antiga vira fallback. */
  version: number
  /** Sem usuario a forma de um vaza para o outro na troca de conta. */
  userId?: string | null
  /** Forma velha demais nao representa mais a tela. Padrao: 30 dias. */
  maxAgeMs?: number
  /** Confere o JSON lido. Dado corrompido ou editado a mao vira fallback. */
  validate?: (value: unknown) => value is S
  /** Padrao: localStorage. Em RN passar um adaptador sincrono (MMKV). */
  storage?: ShapeStorage | null
}

type Entry<S> = { v: number; t: number; s: S }

const DAY = 24 * 60 * 60 * 1000

export function shapeKey(key: string, userId?: string | null) {
  return `shape:${key}:${userId ?? 'anon'}`
}

/** Puro: serve no cliente (localStorage) e no servidor (cookie do request). */
export function parseShape<S>(
  raw: string | null | undefined,
  opts: Pick<ShapeOptions<S>, 'version' | 'maxAgeMs' | 'validate'>,
  now = Date.now(),
): S | null {
  if (!raw) return null
  try {
    const entry = JSON.parse(raw) as Entry<S>
    if (!entry || entry.v !== opts.version || typeof entry.t !== 'number') return null
    if (now - entry.t > (opts.maxAgeMs ?? 30 * DAY)) return null
    if (opts.validate && !opts.validate(entry.s)) return null
    return entry.s
  } catch {
    return null
  }
}

export function serializeShape<S>(shape: S, version: number, now = Date.now()) {
  return JSON.stringify({ v: version, t: now, s: shape } satisfies Entry<S>)
}

function defaultStorage(): ShapeStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    // Safari privado, iframe sandbox, site data bloqueado
    return null
  }
}

export type ShapeStore<S> = {
  read(): S | null
  /** Devolve true se gravou. Igual ao que ja estava nao regrava. */
  write(shape: S): boolean
  clear(): void
  readonly storageKey: string
}

export function createShapeStore<S>(opts: ShapeOptions<S>): ShapeStore<S> {
  const storageKey = shapeKey(opts.key, opts.userId)
  const storage = () => (opts.storage === undefined ? defaultStorage() : opts.storage)
  let lastShapeJson: string | null = null
  let avisou = false

  return {
    storageKey,
    read() {
      try {
        return parseShape(storage()?.getItem(storageKey), opts)
      } catch {
        return null
      }
    },
    write(shape) {
      const json = JSON.stringify(shape)
      if (json === lastShapeJson) return false
      // Forma que nao passa no validate seria recusada em toda leitura e o skeleton
      // ficaria preso no fallback sem ninguem saber. Ex.: campo undefined (dado da
      // versao anterior) some no JSON. Nao grava e avisa uma vez.
      if (opts.validate && !opts.validate(JSON.parse(json))) {
        if (!avisou) console.warn(`[skeleton-adaptativo] forma "${opts.key}" invalida, nao gravada. A funcao que monta a forma precisa preencher todo campo (ex.: !!dado.campo).`, json)
        avisou = true
        return false
      }
      const target = storage()
      if (!target) return false
      try {
        target.setItem(storageKey, serializeShape(shape, opts.version))
        lastShapeJson = json
        return true
      } catch {
        // cota cheia ou storage bloqueado: o skeleton cai no fallback, nada quebra
        return false
      }
    },
    clear() {
      lastShapeJson = null
      try {
        storage()?.removeItem(storageKey)
      } catch {}
    },
  }
}

/** Lista de 200 itens nao vira skeleton de 200 blocos. */
export function capCount(n: number, max = 6) {
  return Math.max(0, Math.min(n, max))
}

/** O que o AsyncStorage do React Native oferece (getAllKeys + multiGet). */
export type AsyncKeyValue = {
  getAllKeys(): Promise<readonly string[]>
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * React Native com AsyncStorage: o skeleton precisa da forma no PRIMEIRO
 * render, mas AsyncStorage e assincrono. Chamar uma vez na abertura do app
 * (antes de esconder a splash): carrega todas as chaves `shape:` para a
 * memoria e devolve um storage sincrono. Gravacao vai para a memoria na hora
 * e para o disco em segundo plano. Falhou a leitura: storage vazio (fallback).
 * Com MMKV (ja sincrono) isto nao e necessario.
 */
export async function hydrateShapeStorage(async: AsyncKeyValue): Promise<ShapeStorage> {
  const cache = new Map<string, string>()
  try {
    const keys = (await async.getAllKeys()).filter(k => k.startsWith('shape:'))
    for (const [k, v] of await async.multiGet(keys)) if (v != null) cache.set(k, v)
  } catch {}
  return {
    getItem: k => cache.get(k) ?? null,
    setItem(k, v) {
      cache.set(k, v)
      async.setItem(k, v).catch(() => {})
    },
    removeItem(k) {
      cache.delete(k)
      async.removeItem(k).catch(() => {})
    },
  }
}

/**
 * Next com Server Components: o loading.tsx roda no servidor e nao ve
 * localStorage. Gravando a forma tambem em cookie, o servidor le com
 * cookies().get(shapeKey(...)) + parseShape. Cookie tem teto de ~4 KB:
 * manter a forma pequena (contagens e flags, nunca texto).
 */
export function cookieStorage(maxAgeDays = 30): ShapeStorage {
  return {
    getItem(name) {
      const hit = document.cookie.split('; ').find(c => c.startsWith(`${encodeURIComponent(name)}=`))
      return hit ? decodeURIComponent(hit.slice(hit.indexOf('=') + 1)) : null
    },
    setItem(name, value) {
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeDays * 86400}; samesite=lax`
    },
    removeItem(name) {
      document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0`
    },
  }
}
