import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { capCount, createShapeStore, hydrateShapeStorage, parseShape, serializeShape, shapeKey } from '../codigo/shape-store.ts'
import { useAdaptiveShape } from '../codigo/use-adaptive-shape.ts'

type Shape = { n: number }
const isShape = (x: unknown): x is Shape => typeof (x as Shape)?.n === 'number'

function memStorage() {
  const m = new Map<string, string>()
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

test('grava e le a forma', () => {
  const storage = memStorage()
  const store = createShapeStore<Shape>({ key: 'x', version: 1, userId: 'u1', storage })
  assert.equal(store.read(), null)
  assert.equal(store.write({ n: 3 }), true)
  assert.deepEqual(store.read(), { n: 3 })
})

test('nao regrava forma igual', () => {
  const storage = memStorage()
  const store = createShapeStore<Shape>({ key: 'x', version: 1, storage })
  assert.equal(store.write({ n: 1 }), true)
  assert.equal(store.write({ n: 1 }), false)
  assert.equal(store.write({ n: 2 }), true)
})

test('usuario diferente nao herda a forma', () => {
  const storage = memStorage()
  createShapeStore<Shape>({ key: 'x', version: 1, userId: 'a', storage }).write({ n: 5 })
  assert.equal(createShapeStore<Shape>({ key: 'x', version: 1, userId: 'b', storage }).read(), null)
  assert.equal(shapeKey('x', null), 'shape:x:anon')
})

test('versao nova descarta forma antiga', () => {
  const storage = memStorage()
  createShapeStore<Shape>({ key: 'x', version: 1, storage }).write({ n: 5 })
  assert.equal(createShapeStore<Shape>({ key: 'x', version: 2, storage }).read(), null)
})

test('forma vencida, corrompida ou invalida vira null', () => {
  const now = 1_000_000_000
  assert.equal(parseShape(serializeShape({ n: 1 }, 1, now - 31 * 864e5), { version: 1 }, now), null)
  assert.deepEqual(parseShape(serializeShape({ n: 1 }, 1, now - 29 * 864e5), { version: 1 }, now), { n: 1 })
  assert.equal(parseShape('{nao e json', { version: 1 }), null)
  assert.equal(parseShape(serializeShape({ n: 'x' }, 1), { version: 1, validate: isShape }), null)
  assert.equal(parseShape(undefined, { version: 1 }), null)
})

test('storage que explode nao quebra nada', () => {
  const boom = () => {
    throw new Error('SecurityError')
  }
  const store = createShapeStore<Shape>({ key: 'x', version: 1, storage: { getItem: boom, setItem: boom, removeItem: boom } })
  assert.equal(store.read(), null)
  assert.equal(store.write({ n: 1 }), false)
  store.clear()
})

test('sem window (servidor) usa null e nao explode', () => {
  const store = createShapeStore<Shape>({ key: 'x', version: 1 })
  assert.equal(store.read(), null)
  assert.equal(store.write({ n: 1 }), false)
})

test('capCount limita o tamanho do skeleton', () => {
  assert.equal(capCount(200), 6)
  assert.equal(capCount(2), 2)
  assert.equal(capCount(-1), 0)
  assert.equal(capCount(9, 8), 8)
})

test('hook no servidor (SSR) devolve o fallback, sem ler storage', () => {
  const storage = memStorage()
  const store = createShapeStore<Shape>({ key: 'x', version: 1, storage })
  store.write({ n: 9 })
  const fallback = { n: 1 }
  function C() {
    const s = useAdaptiveShape(store, fallback, null)
    return createElement('i', null, String(s.n))
  }
  assert.equal(renderToString(createElement(C)), '<i>1</i>')
})

// AsyncStorage em memoria com a mesma interface (getAllKeys/multiGet sao async)
function asyncKV(inicial: Record<string, string> = {}, falhar = false) {
  const m = new Map(Object.entries(inicial))
  const atraso = () => new Promise(r => setTimeout(r, 1))
  return {
    m,
    async getAllKeys() { await atraso(); if (falhar) throw new Error('disco'); return [...m.keys()] },
    async multiGet(keys: readonly string[]) { await atraso(); return keys.map(k => [k, m.get(k) ?? null] as const) },
    async setItem(k: string, v: string) { await atraso(); if (falhar) throw new Error('disco'); m.set(k, v) },
    async removeItem(k: string) { await atraso(); m.delete(k) },
  }
}

test('RN: hidrata so as chaves shape: e le de forma sincrona', async () => {
  const kv = asyncKV({ [shapeKey('x', 'a')]: serializeShape({ n: 4 }, 1), 'outra:coisa': 'grande' })
  const storage = await hydrateShapeStorage(kv)
  assert.deepEqual(createShapeStore<Shape>({ key: 'x', version: 1, userId: 'a', storage }).read(), { n: 4 })
  assert.equal(storage.getItem('outra:coisa'), null)
})

test('RN: gravacao vale na hora e chega no disco depois', async () => {
  const kv = asyncKV()
  const storage = await hydrateShapeStorage(kv)
  const store = createShapeStore<Shape>({ key: 'x', version: 1, userId: 'a', storage })
  store.write({ n: 7 })
  assert.deepEqual(store.read(), { n: 7 })
  await new Promise(r => setTimeout(r, 10))
  assert.ok(kv.m.get(shapeKey('x', 'a'))?.includes('"n":7'))
  // reabrir o app: hidrata de novo a partir do disco
  const reaberto = await hydrateShapeStorage(kv)
  assert.deepEqual(createShapeStore<Shape>({ key: 'x', version: 1, userId: 'a', storage: reaberto }).read(), { n: 7 })
})

test('RN: disco com erro vira storage vazio, sem rejeicao solta', async () => {
  const soltas: unknown[] = []
  const pegar = (e: unknown) => soltas.push(e)
  process.on('unhandledRejection', pegar)
  const storage = await hydrateShapeStorage(asyncKV({}, true))
  const store = createShapeStore<Shape>({ key: 'x', version: 1, storage })
  assert.equal(store.read(), null)
  store.write({ n: 1 })
  await new Promise(r => setTimeout(r, 10))
  process.off('unhandledRejection', pegar)
  assert.deepEqual(soltas, [])
})

test('forma que nao passa no validate nao e gravada, e avisa uma vez', () => {
  const storage = memStorage()
  const avisos: unknown[] = []
  const warn = console.warn
  console.warn = (...a: unknown[]) => void avisos.push(a)
  try {
    const store = createShapeStore<Shape>({ key: 'x', version: 1, storage, validate: isShape })
    // campo undefined some no JSON: o caso do dado da versao anterior
    assert.equal(store.write({ n: undefined } as unknown as Shape), false)
    assert.equal(store.write({ m: 1 } as unknown as Shape), false)
    assert.equal(storage.m.size, 0)
    assert.equal(avisos.length, 1)
    assert.equal(store.write({ n: 2 }), true)
    assert.deepEqual(store.read(), { n: 2 })
  } finally {
    console.warn = warn
  }
})
