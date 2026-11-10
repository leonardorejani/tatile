// Formato brasileiro (pt-BR) para dinheiro, numero, tamanho, tempo relativo e data.
// O Intl poe espaco que nao quebra (U+00A0 e U+202F) depois de "R$", antes de "%" e de unidade.
// Decisao do Leonardo: sai ASCII, espaco comum. O numero nao quebra de linha por CSS
// (`white-space: nowrap` em `.numero`), nao pelo caractere.

const ESPECIAIS = /[\u00A0\u202F]/g
const comum = (s: string) => s.replace(ESPECIAIS, ' ')

// O formato curto do Intl termina em "min." com ponto: sai, para ficar "há 3 min"
const semPonto = (s: string) => comum(s).replace(/\.$/, '')

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const relativoFmt = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto', style: 'short' })

/** 1000.5 -> "R$ 1.000,50" */
export const dinheiro = (valor: number) => comum(moeda.format(valor))

/** numero(1234.5, 1) -> "1.234,5". Sem `casas`, mostra as que o numero tem (ate 3). */
export const numero = (valor: number, casas?: number) =>
  comum(
    new Intl.NumberFormat('pt-BR', casas === undefined ? {} : { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor),
  )

/** tamanho(10 * 1024 * 1024) -> "10 MB" (base 1024, ate 1 casa, sem ",0") */
export function tamanho(bytes: number) {
  const un = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = Math.abs(bytes)
  let i = 0
  while (v >= 1024 && i < un.length - 1) (v /= 1024), i++
  const n = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: i === 0 ? 0 : 1 }).format(bytes < 0 ? -v : v)
  return comum(`${n} ${un[i]}`)
}

/** relativo(data, agora) -> "ha 3 min", "ontem", "amanha", "em 2 h". Acima de 30 dias cai na data. */
export function relativo(data: Date | number, agora: Date | number = Date.now()) {
  const seg = Math.round((+data - +agora) / 1000)
  const abs = Math.abs(seg)
  if (abs < 45) return 'agora'
  const dias = (d: Date | number) => Math.floor(+new Date(d).setHours(0, 0, 0, 0) / 86_400_000)
  if (abs >= 86_400 / 2) {
    const d = dias(data) - dias(agora)
    if (Math.abs(d) <= 30) return semPonto(relativoFmt.format(d, 'day'))
    return comum(new Intl.DateTimeFormat('pt-BR').format(data))
  }
  if (abs < 3600) return semPonto(relativoFmt.format(Math.round(seg / 60), 'minute'))
  return semPonto(relativoFmt.format(Math.round(seg / 3600), 'hour'))
}

/** dataHora(data) -> "09/11/2026 18:21" (use no `title` do elemento com tempo relativo) */
export function dataHora(data: Date | number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(data)
      .map(x => [x.type, x.value]),
  )
  return comum(`${p.day}/${p.month}/${p.year} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`)
}
