// Ponte do protótipo (HTML puro) com o skeleton adaptativo de verdade da tatile.
import { capCount, createShapeStore, type ShapeStore } from '../../codigo/shape-store'

type Forma = { linhas: number }
const valida = (v: unknown): v is Forma => !!v && Number.isInteger((v as Forma).linhas) && (v as Forma).linhas >= 0
const lojas = new Map<string, ShapeStore<Forma>>()
const loja = (aba: string) => {
  if (!lojas.has(aba)) lojas.set(aba, createShapeStore<Forma>({ key: `prototipo-pedidos-${aba}`, version: 1, validate: valida }))
  return lojas.get(aba)!
}

;(window as unknown as { tatileForma: unknown }).tatileForma = {
  /** Quantas linhas a aba tinha da última vez, ou null (nunca viu: fallback). */
  ler: (aba: string) => loja(aba).read()?.linhas ?? null,
  gravar: (aba: string, n: number) => loja(aba).write({ linhas: capCount(n) }),
}
