// Tipografia, forma e cor em TS, para React Native e para JS que precisa do valor.
// Espelho de tipo.css, forma.css e cor.css: o teste tokens.test compara os dois lados.

export const TIPO = {
  celular: { xs: 12, sm: 13, base: 15, md: 17, lg: 20, xl: 24, '2xl': 28 },
  tablet: { xs: 12, sm: 13, base: 15, md: 17, lg: 20, xl: 26, '2xl': 32 },
  desktop: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, '2xl': 36 },
  amplo: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, '2xl': 36 },
  // grande e gigante: mesmo texto do desktop, o zoom da pagina (ESPACO.escala) amplia
  grande: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, '2xl': 36 },
  gigante: { xs: 12, sm: 13, base: 15, md: 17, lg: 22, xl: 28, '2xl': 36 },
  alturaTexto: 1.5,
  alturaTitulo: 1.2,
} as const

export const RAIO = { sm: 8, padrao: 12, card: 20, pilula: 9999 } as const

/** Raio concentrico: o de dentro e o de fora menos o padding (minimo 4). */
export function raioDentro(raioFora: number, padding: number) {
  return Math.max(4, raioFora - padding)
}

export const COR = {
  claro: {
    fundo: '#F7F7F7', superficie: '#FFFFFF', superficie2: '#EFEFEF', borda: '#E2E2E2',
    texto: '#161616', texto2: '#5E5E5E', texto3: '#8A8A8A',
    destaque: '#2563EB', destaqueTexto: '#FFFFFF', destaqueSuave: '#E8EFFD',
    destaqueBloco: '#2563EB', destaqueBlocoTexto: '#FFFFFF',
    perigo: '#B42318', perigoSuave: '#FDECEA', sucesso: '#1F7A4D', sucessoSuave: '#E6F4EC', aviso: '#A15C00',
  },
  escuro: {
    fundo: '#1C1C1C', superficie: '#242424', superficie2: '#2E2E2E', borda: '#383838',
    texto: '#EDEDED', texto2: '#A3A3A3', texto3: '#7A7A7A',
    destaque: '#60A5FA', destaqueTexto: '#0B1220', destaqueSuave: '#1A2740',
    destaqueBloco: '#1D4ED8', destaqueBlocoTexto: '#FFFFFF',
    perigo: '#F09090', perigoSuave: '#3A1D1B', sucesso: '#5FD49B', sucessoSuave: '#16291F', aviso: '#E8B95B',
  },
} as const

export type Tema = keyof typeof COR

/** Contraste WCAG entre duas cores #RRGGBB. Texto normal pede 4,5, texto grande 3. */
export function contraste(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
