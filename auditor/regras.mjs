// Regras do auditor de código do tatile. Cada regra olha UMA linha (já sem comentários) mais o
// contexto do arquivo e diz se ela quebra o sistema de tokens. Severidade: erro (quebra
// acessibilidade ou o uso do app), aviso (valor solto: o app funciona, mas o sistema não segura).
//
// testar(linha, ctx) devolve false (sem achado), true (achado) ou uma string (o trecho que falhou,
// que entra na mensagem). ctx: { arquivo, ext, indice, linhas, texto, seletor, css, marcacao, emSvg }.
// unicaPorArquivo: só o primeiro achado do arquivo vale (regras de "o arquivo inteiro nunca faz X").

// Palavras de propaganda que a regra texto-de-propaganda procura em texto de interface. Lista
// configurável: acrescente ou tire aqui. A busca ignora acento e caixa.
export const PALAVRAS_DE_PROPAGANDA = [
  'turbine', 'turbinar', 'revolucione', 'revolucionar', 'mágica', 'mágico', 'incrível', 'sem esforço',
  'supercharge', 'seamless', 'unlock', 'magic', 'revolutionize', 'game-changing', 'AI-powered',
  'potencializado por IA',
]

const CHAVE_ESPACO = '(?:padding|margin|gap|row-gap|column-gap|rowGap|columnGap|inset|top|right|bottom|left)' +
  '(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?|(?:Top|Right|Bottom|Left|Horizontal|Vertical|Inline|Block)(?:Start|End)?)?'
const CHAVE_RAIO = '(?:border-radius|borderRadius|border-(?:top|bottom)-(?:left|right)-radius|border(?:Top|Bottom)(?:Left|Right)Radius)'

// Pares chave: valor de uma linha, em CSS (13px;) ou em objeto JS (13, '13px'). O lookbehind evita
// pegar "top" dentro de "border-top" ou "scroll-padding".
function declaracoes(linha, chave) {
  const re = new RegExp(`(?<![\\w-])(${chave})['"]?\\s*:\\s*(?:(['"\`])(.*?)\\2|([^;,}"'\`\\n]+))`, 'g')
  return [...linha.matchAll(re)].map(m => ({ chave: m[1], valor: (m[3] ?? m[4]).trim() }))
}

// Valor que já passa por token (ou por função que o resolve) nunca é solto
const usaToken = valor => /var\(|calc\(|env\(|theme\(|clamp\(|\$\{/.test(valor)

const SO_NUMERO = /^-?\d+(\.\d+)?$/

// px/rem soltos de um valor. 0 e 1px são permitidos: zero não é medida, 1px é fio de borda.
function medidasSoltas(valor, { permiteUmPx = true } = {}) {
  const achados = []
  for (const m of valor.matchAll(/(?<![\w.])(-?\d*\.?\d+)(px|rem)\b/g)) {
    const n = Math.abs(parseFloat(m[1]))
    if (n === 0 || (permiteUmPx && m[2] === 'px' && n === 1)) continue
    achados.push(m[0])
  }
  return achados
}

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
const FUNCAO_COR = /\b(?:rgba?|hsla?)\(\s*[\d.]/
// Hex que é âncora, id ou seletor e não cor: href="#abc", url(#grad), querySelector('#add')
const NAO_E_COR = /(?:href|src|id|for|to|name|htmlFor|target|hash|aria-[\w-]+)\s*[=:]\s*\{?['"`]$|url\(\s*['"]?$|(?:querySelector(?:All)?|getElementById|closest|matches)\(\s*['"`]$/

function corSolta(linha) {
  for (const m of linha.matchAll(HEX)) {
    const antes = linha.slice(0, m.index)
    const depois = linha.slice(m.index + m[0].length)
    if (NAO_E_COR.test(antes) || /^\s*\{/.test(depois) || /&$/.test(antes)) continue
    // Cor de verdade aparece entre aspas (JS/atributo) ou depois de "propriedade:" (CSS). Texto de
    // JSX como "Pedido #123" tem hex válido mas não é cor.
    const entreAspas = /['"`]$/.test(antes)
    const emDeclaracao = /[\w-]+\s*:\s*[^;{]*[\s(,:]$/.test(antes)
    if (entreAspas || emDeclaracao) return m[0]
  }
  const f = linha.match(FUNCAO_COR)
  return f ? linha.slice(f.index).match(/^[^)]*\)?/)[0] : false
}

// theme-color (meta, manifesto, viewport do Next) não aceita var(): a cor tem que ser literal, e o
// módulo cor manda ter uma por tema. Na lista do themeColor, a cor fica nas linhas de baixo.
function ehThemeColor(linha, ctx) {
  if (/<meta\b[^>]*\bname\s*=\s*["']theme-color["']/i.test(linha)) return true
  if (/\b(?:theme_color|background_color|themeColor)\s*:/.test(linha)) return true
  if (!/\bcolor\s*:/.test(linha)) return false
  for (let i = ctx.indice - 1; i >= Math.max(0, ctx.indice - 8); i--) {
    const l = ctx.linhas[i]
    if (/\]/.test(l)) return false
    if (/\bthemeColor\s*:\s*\[/.test(l)) return true
  }
  return false
}

// ---- cor (matiz, saturação) para gradiente e brilho ----

// Só os nomes que carregam matiz: neutros (white, black, gray, transparent) nunca viram achado
const NOMES_DE_COR = {
  red: [255, 0, 0], orange: [255, 165, 0], yellow: [255, 255, 0], gold: [255, 215, 0], lime: [0, 255, 0],
  green: [0, 128, 0], teal: [0, 128, 128], cyan: [0, 255, 255], aqua: [0, 255, 255], blue: [0, 0, 255],
  indigo: [75, 0, 130], purple: [128, 0, 128], violet: [238, 130, 238], magenta: [255, 0, 255],
  fuchsia: [255, 0, 255], pink: [255, 192, 203], crimson: [220, 20, 60], coral: [255, 127, 80], tomato: [255, 99, 71],
}
// Matiz médio de cada cor da paleta do Tailwind (neutros ficam de fora de propósito)
const MATIZ_TAILWIND = {
  red: 0, orange: 25, amber: 38, yellow: 48, lime: 84, green: 142, emerald: 160, teal: 173, cyan: 188,
  sky: 199, blue: 217, indigo: 239, violet: 258, purple: 271, fuchsia: 292, pink: 330, rose: 347,
}
const TAILWIND_COR = Object.keys(MATIZ_TAILWIND).join('|')

const SEM_VAR = /var\((?:[^()]|\([^()]*\))*\)/g
const COR_EM_TEXTO = new RegExp(
  `#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b|(?:rgba?|hsla?|oklch)\\([^)]*\\)|(?<![\\w-])(?:${Object.keys(NOMES_DE_COR).join('|')})(?![\\w-])`, 'gi')

function emHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}

const canal = v => (v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v))
const alfa = v => (v == null ? 1 : v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v))

// Cor em texto para { h, s, l, a }, ou null quando não dá para saber (var(), currentColor, nome neutro)
function lerCor(c) {
  let m
  if (c[0] === '#') {
    let hex = c.slice(1)
    if (hex.length <= 4) hex = [...hex].map(x => x + x).join('')
    const n = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
    return { ...emHsl(...n), a: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1 }
  }
  if ((m = c.match(/^rgba?\(\s*([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i))) {
    return { ...emHsl(canal(m[1]), canal(m[2]), canal(m[3])), a: alfa(m[4]) }
  }
  if ((m = c.match(/^hsla?\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i))) {
    return { h: parseFloat(m[1]), s: parseFloat(m[2]) / 100, l: parseFloat(m[3]) / 100, a: alfa(m[4]) }
  }
  if ((m = c.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)/i))) {
    const l = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1])
    const croma = m[2].endsWith('%') ? parseFloat(m[2]) / 100 * 0.4 : parseFloat(m[2])
    return { h: parseFloat(m[3]), s: croma >= 0.06 ? 1 : 0, l, a: 1 }
  }
  const nome = NOMES_DE_COR[c.toLowerCase()]
  return nome ? { ...emHsl(...nome), a: 1 } : null
}

// Cores conhecidas de um trecho (cor com var() fica de fora: não dá para saber)
const coresDe = trecho => (trecho.replace(SEM_VAR, ' ').match(COR_EM_TEXTO) ?? []).map(c => ({ texto: c, cor: lerCor(c) })).filter(c => c.cor)
// Tem matiz que o olho percebe (não é branco, preto nem cinza) e aparece de fato
const comMatiz = c => c.a > 0.05 && c.s >= 0.25 && c.l > 0.06 && c.l < 0.96
// Saturada a ponto de brilhar: cinza azulado de sombra (slate) e preto quase puro ficam de fora
const saturada = c => c.a > 0.05 && c.s >= 0.45 && c.l >= 0.2 && c.l <= 0.9
const distMatiz = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
const MATIZ_MINIMO = 30

function matizesDiferentes(matizes) {
  return matizes.some((a, i) => matizes.slice(i + 1).some(b => distMatiz(a, b) > MATIZ_MINIMO))
}

// Trecho entre parênteses balanceados que começa em `abre` (índice do "("), podendo passar para as
// próximas linhas (gradiente costuma quebrar linha)
function entreParenteses(linhas, i, abre) {
  let resto = linhas[i].slice(abre)
  for (let k = i + 1; k < linhas.length && k <= i + 8; k++) {
    if (contar(resto, '(') <= contar(resto, ')')) break
    resto += '\n' + linhas[k]
  }
  let nivel = 0
  for (let j = 0; j < resto.length; j++) {
    if (resto[j] === '(') nivel++
    else if (resto[j] === ')' && --nivel === 0) return resto.slice(1, j)
  }
  return resto.slice(1)
}
const contar = (s, ch) => s.split(ch).length - 1

// Divide por vírgula fora de parênteses (várias sombras, várias cores)
function dividirVirgulas(valor) {
  const partes = []
  let nivel = 0, atual = ''
  for (const ch of valor) {
    if (ch === '(') nivel++
    else if (ch === ')') nivel--
    if (ch === ',' && nivel === 0) { partes.push(atual); atual = '' } else atual += ch
  }
  partes.push(atual)
  return partes
}

// Uma sombra é brilho quando não desloca (0 0), desfoca e tem cor saturada
function sombraBrilha(sombra) {
  const tokens = []
  let nivel = 0, atual = ''
  for (const ch of sombra.trim()) {
    if (ch === '(') nivel++
    else if (ch === ')') nivel--
    if (/\s/.test(ch) && nivel === 0) { if (atual) tokens.push(atual); atual = '' } else atual += ch
  }
  if (atual) tokens.push(atual)
  const medidas = tokens.map(t => t.replace(/^['"`]+|[;'"`}]+$/g, '')).filter(t => /^-?\d*\.?\d+(px|rem|em)?$/.test(t)).map(parseFloat)
  if (medidas.length < 3 || medidas[0] !== 0 || medidas[1] !== 0 || !(medidas[2] > 0)) return false
  return coresDe(sombra).find(c => saturada(c.cor))?.texto ?? false
}

function brilhoDe(valor) {
  for (const sombra of dividirVirgulas(valor)) {
    const cor = sombraBrilha(sombra)
    if (cor) return cor
  }
  return false
}

// ---- texto de interface (JSX/HTML) ----

const semAcento = s => s.normalize('NFD').replace(/\p{M}/gu, '')
const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const RE_PROPAGANDA = new RegExp(
  `(?<![\\p{L}\\p{N}_])(${[...PALAVRAS_DE_PROPAGANDA.map(p => escapar(semAcento(p)).replace(/ /g, '\\s+')), 'bem[- ]vind[oa]s?\\s+de\\s+volta', 'welcome\\s+back'].join('|')})(?![\\p{L}\\p{N}_])`, 'iu')
const TAG_DE_ROTULO = /^(?:button|h[1-6]|label|legend|summary|a|th|title|\w*(?:button|title|heading|label))$/i
const ATRIBUTO_DE_TEXTO = /(?<![\w-])(label|aria-label|title|placeholder|aria-placeholder|alt|aria-description)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

// Textos que o usuário lê numa linha de marcação: o que fica entre tags, o valor de atributo de
// texto e a linha que é só texto (JSX quebrado em várias linhas). Código ({...}, =>) fica de fora.
function textosDeUi(linha, ctx) {
  if (!ctx.marcacao) return []
  const limpa = linha.replace(/=>/g, '  ')
  const textos = []
  for (const m of limpa.matchAll(/<(\/?)([A-Za-z][\w.:-]*)?(\s[^<>]*)?>([^<>]*)/g)) {
    const texto = m[4].replace(/\{[^}]*(?:\}|$)/g, ' ').trim()
    if (!/\p{L}/u.test(texto)) continue
    const abrindo = !m[1] && m[2] && !/\/\s*$/.test(m[3] ?? '')
    textos.push({ texto, tag: abrindo ? m[2] : null })
  }
  for (const m of limpa.matchAll(ATRIBUTO_DE_TEXTO)) textos.push({ texto: m[2] ?? m[3], atributo: m[1] })
  const pura = !textos.length && /\p{L}/u.test(limpa) && !/[<>{}=;()`]/.test(limpa) &&
    !/^\s*(?:return|import|export|const|let|var|if|else|case|break|default|function)\b/.test(limpa)
  if (pura) textos.push({ texto: limpa.trim(), pura: true })
  return textos
}

// ---- emoji ----

const EMOJI = /\p{Extended_Pictographic}/gu
const TESTE_OU_STORY = /(?:^|\/)(?:__tests__|tests?|e2e)\/|\.(?:test|spec|stories)\.[cm]?[jt]sx?$/
// Símbolos que a faixa Extended_Pictographic traz mas que são tipografia, não emoji: © ® ™ ℹ ‼ ⁉,
// setas (↔), formas geométricas (▶ ▪) e teclas (⌘ ⌫). Ficam os emoji de relógio e de player.
function eEmoji(c) {
  const p = c.codePointAt(0)
  if ([0xA9, 0xAE, 0x2122, 0x2139, 0x203C, 0x2049].includes(p)) return false
  if ((p >= 0x2190 && p <= 0x21FF) || (p >= 0x25A0 && p <= 0x25FF)) return false
  if (p >= 0x2300 && p <= 0x23FF) return [0x231A, 0x231B].includes(p) || (p >= 0x23E9 && p <= 0x23F3) || (p >= 0x23F8 && p <= 0x23FA)
  return true
}

// Contexto de bloco: as linhas do bloco {} em que a linha está (regra de "mesmo seletor")
function blocoDa(ctx) {
  let ini = ctx.indice, fim = ctx.indice
  while (ini > 0 && !ctx.linhas[ini].includes('{')) ini--
  while (fim < ctx.linhas.length - 1 && !ctx.linhas[fim].includes('}')) fim++
  return ctx.linhas.slice(ini, fim + 1).join('\n')
}
const TRACKING_POSITIVO = /letter-?spacing['"]?\s*:\s*['"]?(?!-)\+?(\d*\.?\d+)/i
const trackingPositivo = trecho => { const m = trecho.match(TRACKING_POSITIVO); return !!m && parseFloat(m[1]) > 0 }
const ESTADO_AO_VIVO = /skeleton|(?<![a-z])sk(?![a-z])|ao-vivo|aovivo|live|loading|carregando/i

export const REGRAS = [
  {
    // Espaço fora da escala some do ritmo: o mesmo vão vira 12, 13 e 14 conforme quem digitou
    id: 'espaco-solto', severidade: 'aviso',
    descricao: 'Espaçamento com valor solto',
    correcao: 'use var(--pad), var(--margem), var(--grade), var(--linha) ou outro token de espaço',
    testar(linha) {
      for (const { chave, valor } of declaracoes(linha, CHAVE_ESPACO)) {
        if (!valor || usaToken(valor)) continue
        const solto = medidasSoltas(valor)[0]
        if (solto) return `${chave}: ${solto}`
        // Número cru só vale em padding/margin/gap/inset (RN e style de JS). top/left com número é posição.
        if (SO_NUMERO.test(valor) && /^(padding|margin|gap|row|column|inset)/.test(chave) && Number(valor) > 1) return `${chave}: ${valor}`
      }
      return false
    },
  },
  {
    // Cor literal no componente quebra o tema escuro e o contraste: a cor mora em token
    id: 'cor-solta', severidade: 'aviso',
    descricao: 'Cor literal no componente',
    correcao: 'use var(--texto), var(--fundo), var(--superficie), var(--borda) ou var(--destaque)',
    testar(linha, ctx) {
      if (ctx.emSvg || ehThemeColor(linha, ctx)) return false
      return corSolta(linha)
    },
  },
  {
    // Raio solto não fecha a conta de cantos concêntricos (interno = externo - padding)
    id: 'raio-solto', severidade: 'aviso',
    descricao: 'Raio de borda com valor solto',
    correcao: 'use var(--raio-*) e a regra concêntrica (raio interno = raio externo - padding)',
    testar(linha) {
      for (const { chave, valor } of declaracoes(linha, CHAVE_RAIO)) {
        if (!valor || usaToken(valor)) continue
        const solto = medidasSoltas(valor, { permiteUmPx: false })
          .find(v => !['9999px', '999px'].includes(v) && Math.abs(parseFloat(v)) !== 0)
        if (solto) return `${chave}: ${solto}`
        if (SO_NUMERO.test(valor) && Number(valor) > 0 && Number(valor) < 999) return `${chave}: ${valor}`
      }
      return false
    },
  },
  {
    // Travar o zoom impede quem enxerga mal de ampliar a tela: falha de acessibilidade (WCAG 1.4.4)
    id: 'zoom-travado', severidade: 'erro',
    descricao: 'Zoom da página travado',
    correcao: 'tire maximum-scale/user-scalable do viewport; se o iPhone dá zoom no campo, suba a fonte dele para 16px',
    testar(linha) {
      const m = linha.match(/maximum-scale\s*=\s*1(?:\.0+)?(?![.\d])|user-scalable\s*=\s*(?:no|0)\b|maximumScale\s*:\s*1(?:\.0+)?(?![.\d])|userScalable\s*:\s*(?:false|0|['"]no['"])/)
      return m ? m[0] : false
    },
  },
  {
    // preventDefault no paste sem olhar imagem rouba o colar de print e de arquivo
    id: 'colar-bloqueado', severidade: 'erro',
    descricao: 'Colar bloqueado sem tratar imagem',
    correcao: 'só chame preventDefault depois de checar clipboardData (type "image/...") ou deixe o colar nativo',
    testar(linha, ctx) {
      if (!/onPaste|['"]paste['"]/.test(linha)) return false
      const i = ctx.indice
      if (!/preventDefault/.test(ctx.linhas.slice(i, i + 4).join('\n'))) return false
      return !/image\//.test(ctx.linhas.slice(Math.max(0, i - 3), i + 7).join('\n'))
    },
  },
  {
    // Sem :focus-visible, quem navega por teclado perde onde está
    id: 'foco-removido', severidade: 'aviso',
    descricao: 'Contorno de foco removido sem substituto',
    correcao: 'troque por :focus-visible com anel próprio (ex.: outline: 2px solid var(--destaque))',
    testar(linha, ctx) {
      if (/focus-visible/.test(ctx.texto)) return false
      const m = linha.match(/outline['"]?\s*:\s*['"]?(?:none|0)(?![\d.%\w])|(?<![\w-])outline-none\b/)
      return m ? m[0] : false
    },
  },
  {
    // Número que muda (preço, contador, timer) com dígito proporcional faz a coluna dançar
    id: 'numero-sem-tabular', severidade: 'aviso', unicaPorArquivo: true,
    descricao: 'Número dinâmico sem algarismos tabulares',
    correcao: 'aplique font-variant-numeric: tabular-nums (ou a classe tabular-nums / fontVariant: ["tabular-nums"])',
    testar(linha, ctx) {
      if (!ctx.marcacao) return false
      if (/tabular-nums|tabularNums|fontVariant|tabular|font-variant-numeric/.test(ctx.texto)) return false
      const m = linha.match(/toLocaleString\(|Intl\.NumberFormat|\.toFixed\(|formatarMoeda|R\$\s?(?!\{)/)
      return m ? m[0] : false
    },
  },
  {
    // Fonte menor que 16px no campo faz o iPhone dar zoom ao focar
    id: 'input-fonte-pequena', severidade: 'aviso',
    descricao: 'Campo com fonte menor que 16px',
    correcao: 'use font-size: 16px (ou var(--texto-md)) em input, select e textarea',
    testar(linha, ctx) {
      if (!ctx.css) return false
      const m = linha.match(/font-size\s*:\s*(\d*\.?\d+)(px|rem|em)\b/)
      if (!m) return false
      const px = parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16)
      if (px >= 16) return false
      const emCampo = /(^|[\s,>+~])(?:input|select|textarea)\b(?![-\w])/.test(ctx.seletor)
      const inline = /<(?:input|select|textarea)\b[^>]*style\s*=/.test(linha.slice(0, m.index))
      return emCampo || inline ? m[0] : false
    },
  },
  {
    // Gradiente entre matizes diferentes (roxo para azul) é a assinatura de interface genérica, e
    // texto em gradiente também. Matiz igual (branco para transparente, sombra de rolagem) passa.
    id: 'gradiente-colorido', severidade: 'aviso',
    descricao: 'Gradiente colorido',
    correcao: 'use cor chapada do token (var(--destaque), var(--superficie)) ou gradiente do mesmo matiz',
    testar(linha, ctx) {
      const clip = linha.match(/(?<![\w-])(?:-webkit-)?background-clip\s*:\s*text|(?:WebkitBackgroundClip|backgroundClip)['"]?\s*:\s*['"]text/)
      if (clip) return `texto em gradiente: ${clip[0]}`
      if (/(?<![\w-])bg-clip-text(?![\w-])/.test(linha) && /(?<![\w-])(?:bg-(?:gradient|linear|radial|conic)|from-|via-|to-)/.test(linha)) return 'texto em gradiente: bg-clip-text'
      for (const m of linha.matchAll(/(?:repeating-)?(?:linear|radial|conic)-gradient\(/g)) {
        if (/(?:mask(?:-image)?|border-image)['"]?\s*:[^;]*$/i.test(linha.slice(0, m.index))) continue
        const cores = coresDe(entreParenteses(ctx.linhas, ctx.indice, m.index + m[0].length - 1)).filter(c => comMatiz(c.cor))
        if (matizesDiferentes(cores.map(c => c.cor.h))) return `${m[0].slice(0, -1)} com ${cores.slice(0, 3).map(c => c.texto).join(' e ')}`
      }
      if (/(?<![\w-])bg-(?:gradient-to-|linear-|radial-|conic-)/.test(linha)) {
        const re = new RegExp(`(?<![\\w-])(?:from|via|to)-(?:(${TAILWIND_COR})-\\d{2,3}|\\[(#[0-9a-fA-F]{3,8})\\])`, 'g')
        const matizes = [...linha.matchAll(re)].map(m => m[1] ? MATIZ_TAILWIND[m[1]] : (c => c && comMatiz(c) ? c.h : null)(lerCor(m[2]))).filter(h => h != null)
        if (matizesDiferentes(matizes)) return 'bg-gradient com cores de matizes diferentes'
      }
      return false
    },
  },
  {
    // Sombra colorida sem deslocamento é brilho neon: sombra de verdade é neutra e deslocada
    id: 'brilho-colorido', severidade: 'aviso',
    descricao: 'Brilho colorido (sombra sem deslocamento e com cor saturada)',
    correcao: 'use sombra neutra com deslocamento (var(--sombra-*)) ou tire o brilho',
    testar(linha) {
      for (const m of linha.matchAll(/(?<![\w-])(?:box-shadow|boxShadow)['"]?\s*:\s*(.*)/g)) {
        const cor = brilhoDe(m[1])
        if (cor) return `box-shadow com ${cor}`
      }
      for (const m of linha.matchAll(/drop-shadow\(/g)) {
        const cor = brilhoDe(entreParenteses([linha], 0, m.index + m[0].length - 1))
        if (cor) return `drop-shadow com ${cor}`
      }
      for (const m of linha.matchAll(/(?<![\w-])(?:drop-)?shadow-\[([^\]]+)\]/g)) {
        const cor = brilhoDe(m[1].replace(/_/g, ' '))
        if (cor) return `${m[0].slice(0, 40)} com ${cor}`
      }
      const tw = linha.match(new RegExp(`(?<![\\w-])(?:drop-)?shadow-(?:${TAILWIND_COR})-\\d{2,3}(?:/\\d+)?`))
      return tw ? tw[0] : false
    },
  },
  {
    // Emoji no lugar de ícone ou de texto vira rosto genérico: o ícone é do sistema (SVG de traço)
    id: 'emoji-na-interface', severidade: 'aviso',
    descricao: 'Emoji em texto de interface',
    correcao: 'troque por ícone do sistema (SVG) ou tire, a palavra já diz. Se o emoji é o assunto, use tatile-ignorar',
    testar(linha, ctx) {
      if (!ctx.marcacao || ctx.emSvg || TESTE_OU_STORY.test(ctx.arquivo)) return false
      const emoji = [...linha.matchAll(EMOJI)].map(m => m[0]).find(eEmoji)
      return emoji ?? false
    },
  },
  {
    // Caixa alta com espaçamento entre letras é o rótulo pequeno de seção: o único uso aprovado
    // dela já tem token. Título em caixa alta com peso pesado não entra aqui.
    id: 'rotulo-caixa-alta', severidade: 'aviso',
    descricao: 'Rótulo em caixa alta com letter-spacing',
    correcao: 'use o estilo de rótulo do tipo (var(--tipo-rotulo)) em vez de uppercase com espaçamento solto',
    testar(linha, ctx) {
      if (/(?:text-transform|textTransform)['"]?\s*:\s*['"]?uppercase/.test(linha)) {
        if (trackingPositivo(blocoDa(ctx))) return 'text-transform: uppercase com letter-spacing'
      }
      const tw = linha.match(/(?<![\w-])tracking-(?:wide|wider|widest|\[\d*\.?\d+(?:em|px|rem)\])(?![\w-])/)
      return tw && /(?<![\w-])uppercase(?![\w-])/.test(linha) ? `uppercase ${tw[0]}` : false
    },
  },
  {
    // Movimento que custa layout ou que não diz nada: anima transform e opacity, e só o que muda
    // de estado. Exceção documentada: grid-template-rows pode animar (acordeão sem height).
    id: 'movimento-barato', severidade: 'aviso',
    descricao: 'Movimento caro ou sem função',
    correcao: 'liste a propriedade (transition: opacity, transform), anime transform e opacity no lugar de width/height/top/left, e deixe pulse/ping só para status ao vivo e skeleton',
    testar(linha, ctx) {
      const todas = linha.match(/(?<![\w-])transition(?:-property)?['"]?\s*:\s*['"]?all\b/) ?? linha.match(/(?<![\w-])transition-all(?![\w-])/)
      if (todas) return `${todas[0].trim()}`
      const pulso = linha.match(/(?<![\w-])animate-(?:pulse|ping)(?![\w-])|(?<![\w-])animation(?:-name)?['"]?\s*:\s*['"]?(?:pulse|ping)\b/)
      if (pulso) {
        const perto = [ctx.seletor, ...ctx.linhas.slice(Math.max(0, ctx.indice - 3), ctx.indice + 1)].join(' ')
        if (!ESTADO_AO_VIVO.test(perto)) return `${pulso[0].trim()} fora de skeleton e status ao vivo`
      }
      // Duração 0s não anima (é o "sem transição" de quem reseta): fica de fora. Corta em ; e } para
      // CSS minificado não emprestar a propriedade do vizinho.
      const trans = linha.match(/(?<![\w-])transition(?:-property)?['"]?\s*:\s*([^;}]*)/)
      const geometria = /(?<![\w-])(?:width|height|top|left)(?![\w-])/
      const item = trans && dividirVirgulas(trans[1]).find(i => geometria.test(i) && !/(?<![\w.-])0(?:ms|s)\b/.test(i))
      if (item) return `transition de ${item.match(geometria)[0]}`
      const arbitrario = linha.match(/(?<![\w-])transition-\[[^\]]*(?<![\w-])(width|height|top|left)(?![\w-])/)
      if (arbitrario) return `transition de ${arbitrario[1]}`
      if (ctx.pilha.some(b => /^@(?:-webkit-)?keyframes/.test(b))) {
        const k = linha.match(/(?<![\w-])(width|height|top|left)\s*:/)
        if (k) return `animação de ${k[1]}`
      }
      return false
    },
  },
  {
    // Copy de propaganda (turbine, mágico, incrível) e exclamação em rótulo soam anúncio, não produto
    id: 'texto-de-propaganda', severidade: 'aviso',
    descricao: 'Texto de propaganda na interface',
    correcao: 'diga o que a coisa faz, no tom calmo do produto, sem adjetivo de anúncio nem exclamação',
    testar(linha, ctx) {
      for (const t of textosDeUi(linha, ctx)) {
        const m = semAcento(t.texto).match(RE_PROPAGANDA)
        if (m) return `"${m[1]}"`
        if (t.pura) continue
        if (/!!/.test(t.texto)) return '"!!"'
        const rotulo = t.atributo ? /^(?:label|aria-label|title)$/.test(t.atributo) : TAG_DE_ROTULO.test(t.tag ?? '')
        if (rotulo && /!\s*$/.test(t.texto)) return 'exclamação no fim do rótulo'
        if (/placeholder/.test(t.atributo ?? '') && /(?:qualquer coisa|anything)/i.test(t.texto) && /(?:\.\.\.|…)\s*$/.test(t.texto)) return 'placeholder "qualquer coisa..."'
      }
      return false
    },
  },
  {
    // No celular o toque deixa o :hover grudado até o próximo toque. Só vale onde há mouse.
    id: 'hover-sem-mouse', severidade: 'aviso', unicaPorArquivo: true,
    descricao: 'Hover sem proteção para toque (no celular o hover gruda depois do toque)',
    correcao: 'envolva em @media (hover: hover) (ou (hover: hover) and (pointer: fine)) e, no Tailwind v3, ligue future.hoverOnlyWhenSupported',
    testar(linha, ctx) {
      const comHover = /@media[^{]*\(\s*(?:any-)?hover\s*:\s*hover\s*\)/i
      if (ctx.css && !comHover.test(linha) && !ctx.pilha.some(b => comHover.test(b))) {
        const m = linha.replace(/:not\(\s*:hover\s*\)/g, '').match(/:hover\b/)
        if (m) return ':hover fora de @media (hover: hover)'
      }
      if (ctx.projeto?.tailwindHoverSemMouse && (ctx.marcacao || /@apply/.test(linha))) {
        const tw = linha.match(/(?<![\w-])(?:group-|peer-)?hover:(?=[\w\[!-])\S*/)
        if (tw) return `${tw[0]} sem future.hoverOnlyWhenSupported`
      }
      return false
    },
  },
  {
    // Lista que rola dentro de outra área que rola: no fim dela a rolagem passa para a de fora
    // (scroll chaining) e a tela inteira anda junto. Regra do módulo pwa (N10), valendo para todo CSS.
    id: 'rolagem-vaza', severidade: 'erro',
    descricao: 'Área que rola sem overscroll-behavior (no fim dela, a rolagem passa para a área de fora)',
    correcao: 'acrescente overscroll-behavior: contain na mesma regra (modulos/pwa, N10)',
    testar(linha, ctx) {
      if (!ctx.css) return false
      for (const m of linha.matchAll(/(?<![\w-])overflow(?:-[xy])?\s*:\s*(?:auto|scroll)\b/g)) {
        // style="..." em linha: o bloco é o próprio atributo
        const attr = linha.lastIndexOf('style=', m.index), q = attr >= 0 ? linha[attr + 6] : ''
        if ((q === '"' || q === "'") && linha.indexOf(q, attr + 7) >= m.index) {
          const dentro = linha.slice(attr + 7, linha.indexOf(q, attr + 7))
          if (!/overscroll-behavior(?:-[xy])?\s*:/.test(dentro)) return m[0]
          continue
        }
        // o bloco desta declaração: na mesma linha quando a regra cabe nela, senão as linhas do bloco
        const abre = linha.lastIndexOf('{', m.index), fecha = linha.indexOf('}', m.index)
        let bloco, seletor
        if (abre >= 0) { seletor = linha.slice(Math.max(0, linha.lastIndexOf('}', abre) + 1), abre); bloco = linha.slice(abre, fecha >= 0 ? fecha : undefined) }
        else seletor = ctx.seletor ?? ''
        if (abre < 0 || fecha < 0) {
          let ini = ctx.indice, fim = ctx.indice
          while (ini > 0 && !ctx.linhas[ini].includes('{')) ini--
          while (fim < ctx.linhas.length - 1 && !ctx.linhas[fim].includes('}')) fim++
          bloco = ctx.linhas.slice(ini, fim + 1).join('\n')
        }
        if (/(?:^|[\s,>])(?:html|body|:root)\s*$/.test(seletor.trim()) || /^(?:html|body|:root)$/.test(seletor.trim())) continue
        if (!/overscroll-behavior(?:-[xy])?\s*:/.test(bloco)) return m[0]
      }
      return false
    },
  },
]
