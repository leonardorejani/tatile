// Movimento: espelho em TS de movimento.css, para JS e React Native.
// Funcoes puras (sem DOM) para o teste provar a conta sem navegador.

/** Duracoes em ms. Mesmos valores de --mov-* no movimento.css. */
export const MOV = {
  rapido: 180,
  padrao: 320,
  lento: 480,
  saiRapido: 130,
  saiPadrao: 220,
  saiLento: 340,
  icone: 200,
  contar: 600,
  cascata: 80,
} as const

/** Curvas como string CSS. Mesmos valores de --curva-* no movimento.css. */
export const CURVA = {
  move: 'cubic-bezier(.65,0,.35,1)',
  entra: 'cubic-bezier(.22,1,.36,1)',
  sai: 'cubic-bezier(.32,0,.67,0)',
  salto: 'cubic-bezier(.34,1.56,.64,1)',
  linear: 'linear', // so barra de tempo, skeleton e giro continuo
} as const

/** Rubber-band: quanto o elemento anda de verdade ao ser puxado `distancia` alem do limite.
 *  Cresce cada vez menos e nunca passa de `limite`. Sinal preservado (puxar pra baixo da negativo). */
export function elastico(distancia: number, limite: number) {
  if (limite <= 0 || distancia === 0) return 0
  const d = Math.abs(distancia)
  const andou = limite * (1 - 1 / ((d / limite) * 0.55 + 1))
  return distancia < 0 ? -andou : andou
}

/** Valor do numero que conta no instante t (0 a 1), com ease-out cubico: rapido no comeco, assenta no fim. */
export function contarValor(de: number, para: number, t: number) {
  const x = Math.min(1, Math.max(0, t))
  return de + (para - de) * (1 - (1 - x) ** 3)
}
