// Mesmos valores do espaco.css, para React Native e para JS que precisa do
// numero (ex.: altura fixa de card no skeleton). Mudou um, muda o outro: o
// teste e2e-espaco compara os dois.

export type Espaco = {
  margem: number
  pad: number
  secao: number
  linha: number
  icone: number
  grade: number
  item: number
  conteudoMax: number | null
  /** Zoom da pagina inteira (monitor grande). RN multiplica as medidas por ele. */
  escala: number
}

export const ESPACO = {
  celular: { margem: 20, pad: 16, secao: 32, linha: 60, icone: 12, grade: 12, item: 8, conteudoMax: null, escala: 1 },
  tablet: { margem: 32, pad: 20, secao: 40, linha: 56, icone: 12, grade: 16, item: 8, conteudoMax: null, escala: 1 },
  desktop: { margem: 40, pad: 24, secao: 56, linha: 52, icone: 12, grade: 24, item: 12, conteudoMax: 1200, escala: 1 },
  amplo: { margem: 48, pad: 24, secao: 64, linha: 52, icone: 12, grade: 24, item: 12, conteudoMax: 1440, escala: 1.15 },
  grande: { margem: 48, pad: 24, secao: 64, linha: 52, icone: 12, grade: 24, item: 12, conteudoMax: 1440, escala: 1.4 },
  gigante: { margem: 48, pad: 24, secao: 64, linha: 52, icone: 12, grade: 24, item: 12, conteudoMax: 1440, escala: 2 },
} as const satisfies Record<string, Espaco>

/** Mesmos cortes do CSS: 640, 1024, 1600, 2200 e 3000. No RN, passar useWindowDimensions().width. */
export function espacoPara(largura: number): Espaco {
  if (largura >= 3000) return ESPACO.gigante
  if (largura >= 2200) return ESPACO.grande
  if (largura >= 1600) return ESPACO.amplo
  if (largura >= 1024) return ESPACO.desktop
  if (largura >= 640) return ESPACO.tablet
  return ESPACO.celular
}
