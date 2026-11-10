// Regras do auditor. Cada regra por arquivo olha um texto e devolve achados com linha; cada regra
// global olha os fatos somados de todos os arquivos. Severidade: erro (quebra instalação, push ou
// acessibilidade), aviso (o app funciona, mas não parece nativo), dica (melhora o desktop ou a loja).

const linhaDe = (texto, indice) => texto.slice(0, indice).split('\n').length

function todas(texto, regex) {
  const achados = []
  for (const m of texto.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))) {
    achados.push(linhaDe(texto, m.index))
  }
  return achados
}

const ehCss = caminho => /\.(css|scss|sass|less)$/.test(caminho)
const ehServidor = caminho => /(^|\/)(api|server|scripts|supabase|functions)\//.test(caminho) || /\.server\.|route\.(js|ts)$/.test(caminho)
const ehCliente = (caminho, texto) => /^public\//.test(caminho) || /['"]use client['"]/.test(texto)

// Fatos: o que cada arquivo prova sobre o app. As regras globais só leem fatos.
export const FATOS = {
  registraSW: { regex: /navigator\.serviceWorker\.register\s*\(/ },
  temFetchSW: { regex: /addEventListener\(\s*['"]fetch['"]/ },
  limpaCacheVelho: { regex: /caches\.delete\s*\(/ },
  navegacaoOffline: { regex: /mode\s*===\s*['"]navigate['"]/ },
  assumeControle: { regex: /skipWaiting\s*\(|clients\.claim\s*\(/ },
  ouvePush: { regex: /addEventListener\(\s*['"]push['"]/ },
  cliqueNotificacao: { regex: /addEventListener\(\s*['"]notificationclick['"]/ },
  conviteInstalacao: { regex: /beforeinstallprompt/ },
  detectaInstalado: { regex: /display-mode:\s*standalone|navigator\.standalone/ },
  viewportCover: { regex: /viewport-fit\s*=\s*cover|viewportFit\s*:\s*['"]cover['"]/ },
  themeColor: { regex: /name=["']theme-color["']|themeColor\s*:/ },
  appleTouchIcon: { regex: /apple-touch-icon|apple\s*:\s*['"`[{]/ },
  tapHighlight: { regex: /-webkit-tap-highlight-color/ },
  areaSegura: { regex: /safe-area-inset/ },
  overscroll: { regex: /overscroll-behavior|overscroll-(none|contain)/ },
  layoutDesktop: { regex: /@media[^{]*min-width|\b(md|lg|xl):[a-z]/ },
  pedePermissao: { regex: /Notification\.requestPermission\s*\(/ },
  linkManifesto: { regex: /rel=["']manifest["']|app\/manifest\.(js|ts)/ },
}

export const REGRAS_ARQUIVO = [
  {
    id: 'N06', sev: 'erro', titulo: 'Zoom bloqueado (user-scalable=no ou maximum-scale=1): falha de acessibilidade; corrija o tamanho da fonte do campo',
    aplica: () => true,
    linhas: texto => todas(texto, /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(?![.\d])|userScalable\s*:\s*false|maximumScale\s*:\s*1(?![.\d])/),
  },
  {
    id: 'N05', sev: 'aviso', titulo: '100vh no layout: no celular estoura com a barra do navegador; use 100dvh (app) ou 100svh (tela de abertura)',
    aplica: () => true,
    linhas: texto => todas(texto, /100vh|\bh-screen\b|\bmin-h-screen\b/),
  },
  {
    id: 'N07', sev: 'aviso', titulo: 'Campo com fonte menor que 16 px: o iPhone dá zoom ao focar',
    aplica: () => true,
    linhas: texto => [
      ...todas(texto, /<(input|textarea|select)\b[^>]*className=["'`][^"'`]*\btext-(xs|sm)\b/),
      ...todas(texto, /(input|textarea|select)[^{]*\{[^}]*font-size\s*:\s*(1[0-5]|[0-9])px/),
    ],
  },
  {
    id: 'N08', sev: 'aviso', titulo: ':hover fora de @media (hover: hover): o toque deixa o estado preso',
    aplica: caminho => ehCss(caminho),
    linhas: texto => hoverSemMedia(texto),
  },
  {
    id: 'P02', sev: 'erro', titulo: 'Chave privada de push no código do navegador: quem abrir o app pode mandar notificação em nome dele',
    aplica: (caminho, texto) => ehCliente(caminho, texto) && !ehServidor(caminho),
    linhas: texto => todas(texto, /VAPID_PRIVA\w*|vapidPrivateKey|privateKey\s*[:=]\s*['"][A-Za-z0-9_-]{30,}/),
  },
  {
    id: 'P03', sev: 'aviso', titulo: 'Pedido de permissão de notificação sem gesto do usuário: o navegador bloqueia e o pedido queima',
    aplica: () => true,
    linhas: texto => todas(texto, /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]{0,300}requestPermission|onMounted\s*\([^)]*\)[^}]{0,300}requestPermission|DOMContentLoaded[^}]{0,300}requestPermission/),
  },
]

// :hover só vale dentro de @media (hover: hover); varre profundidade de chave para saber onde está
function hoverSemMedia(texto) {
  const achados = []
  const pilha = []
  let i = 0
  while (i < texto.length) {
    const c = texto[i]
    if (c === '{') {
      const cabecalho = texto.slice(texto.lastIndexOf('}', i - 1) + 1, i)
      pilha.push(/@media[^{]*hover\s*:\s*hover/.test(cabecalho))
      if (/:hover/.test(cabecalho) && !pilha.slice(0, -1).some(Boolean)) achados.push(linhaDe(texto, i))
    } else if (c === '}') {
      pilha.pop()
    }
    i++
  }
  return achados
}

export function analisarArquivo(caminho, texto) {
  const fatos = Object.keys(FATOS).filter(nome => FATOS[nome].regex.test(texto))
  const achados = []
  for (const regra of REGRAS_ARQUIVO) {
    if (!regra.aplica(caminho, texto)) continue
    for (const linha of [...new Set(regra.linhas(texto))]) achados.push({ id: regra.id, sev: regra.sev, arquivo: caminho, linha, regra: regra.titulo })
  }
  return { fatos, achados }
}

// Regras globais: { id, sev, titulo, falha(contexto) }. contexto = { fatos:Set, manifesto, icones }
export const REGRAS_GLOBAIS = [
  { id: 'M01', sev: 'erro', titulo: 'Sem manifesto: o app não instala', falha: c => !c.manifesto },
  { id: 'M02', sev: 'erro', titulo: 'Manifesto sem name e short_name', falha: c => c.manifesto && !(c.manifesto.name && c.manifesto.short_name) },
  { id: 'M03', sev: 'erro', titulo: 'display precisa ser standalone, fullscreen ou minimal-ui', falha: c => c.manifesto && !['standalone', 'fullscreen', 'minimal-ui'].includes(c.manifesto.display) },
  { id: 'M04', sev: 'aviso', titulo: 'Manifesto sem id, start_url ou scope: o navegador pode tratar duas instalações como apps diferentes', falha: c => c.manifesto && !(c.manifesto.id && c.manifesto.start_url && c.manifesto.scope) },
  { id: 'M05', sev: 'erro', titulo: 'Faltam ícones 192x192 e 512x512', falha: c => c.manifesto && !(temTamanho(c.manifesto, '192x192') && temTamanho(c.manifesto, '512x512')) },
  { id: 'M06', sev: 'aviso', titulo: 'Sem ícone maskable: o Android corta o ícone em círculo', falha: c => c.manifesto && !(c.manifesto.icons || []).some(i => /maskable/.test(i.purpose || '')) },
  { id: 'M07', sev: 'aviso', titulo: 'Manifesto sem theme_color e background_color: a tela de abertura sai branca e a barra fora da cor', falha: c => c.manifesto && !(c.manifesto.theme_color && c.manifesto.background_color) },
  { id: 'M08', sev: 'erro', titulo: 'Arquivo citado no manifesto (ícone ou print) não existe no disco', falha: c => c.manifesto && c.iconesFaltando.length > 0, detalhe: c => c.iconesFaltando.join(', ') },
  { id: 'D01', sev: 'dica', titulo: 'Sem screenshots com form_factor wide e narrow: o convite de instalação fica pobre no desktop e no Android', falha: c => c.manifesto && !temScreenshots(c.manifesto) },
  { id: 'D02', sev: 'dica', titulo: 'Sem shortcuts no manifesto: o ícone instalado não oferece atalhos', falha: c => c.manifesto && !(c.manifesto.shortcuts || []).length },
  { id: 'S01', sev: 'erro', titulo: 'Service worker não é registrado em lugar nenhum', falha: c => !c.fatos.has('registraSW') },
  { id: 'S02', sev: 'erro', titulo: 'Service worker sem fetch: não abre sem internet', falha: c => c.fatos.has('registraSW') && !c.fatos.has('temFetchSW') },
  { id: 'S03', sev: 'aviso', titulo: 'Service worker não apaga cache de versão antiga no activate', falha: c => c.fatos.has('temFetchSW') && !c.fatos.has('limpaCacheVelho') },
  { id: 'S04', sev: 'aviso', titulo: 'Sem resposta offline para navegação (request.mode === "navigate")', falha: c => c.fatos.has('temFetchSW') && !c.fatos.has('navegacaoOffline') },
  { id: 'S05', sev: 'dica', titulo: 'Sem skipWaiting ou clients.claim: versão nova só vale depois de fechar todas as abas', falha: c => c.fatos.has('temFetchSW') && !c.fatos.has('assumeControle') },
  { id: 'P01', sev: 'erro', titulo: 'Recebe push mas não trata o clique na notificação', falha: c => c.fatos.has('ouvePush') && !c.fatos.has('cliqueNotificacao') },
  { id: 'P04', sev: 'aviso', titulo: 'Pede permissão de notificação mas o service worker não ouve push', falha: c => c.fatos.has('pedePermissao') && !c.fatos.has('ouvePush') },
  { id: 'I01', sev: 'aviso', titulo: 'Sem botão próprio de instalar (beforeinstallprompt): Android e desktop dependem do menu do navegador', falha: c => c.manifesto && !c.fatos.has('conviteInstalacao') },
  { id: 'I02', sev: 'aviso', titulo: 'Não detecta app instalado: o convite aparece até para quem já instalou, e o iPhone fica sem instrução', falha: c => c.manifesto && !c.fatos.has('detectaInstalado') },
  { id: 'N01', sev: 'aviso', titulo: 'Sem viewport-fit=cover: o app não pinta sob o notch', falha: c => !c.fatos.has('viewportCover') },
  { id: 'N02', sev: 'aviso', titulo: 'Sem theme-color: a barra de status não acompanha o app', falha: c => !c.fatos.has('themeColor') },
  { id: 'N03', sev: 'aviso', titulo: 'Sem apple-touch-icon: o iPhone usa um print da página como ícone', falha: c => !c.fatos.has('appleTouchIcon') },
  { id: 'N04', sev: 'aviso', titulo: 'Sem -webkit-tap-highlight-color: o toque pisca cinza', falha: c => !c.fatos.has('tapHighlight') },
  { id: 'N09', sev: 'aviso', titulo: 'viewport-fit=cover sem env(safe-area-inset-*): conteúdo fica sob o notch e a barra de início', falha: c => c.fatos.has('viewportCover') && !c.fatos.has('areaSegura') },
  { id: 'N10', sev: 'dica', titulo: 'Sem overscroll-behavior: puxar para atualizar sequestra a rolagem de folhas e listas', falha: c => !c.fatos.has('overscroll') },
  { id: 'D03', sev: 'aviso', titulo: 'Nenhum layout para tela larga (@media min-width ou md:/lg:): no desktop vira um celular esticado', falha: c => !c.fatos.has('layoutDesktop') },
]

const temTamanho = (m, tamanho) => (m.icons || []).some(i => String(i.sizes || '').split(/\s+/).includes(tamanho))
const temScreenshots = m => {
  const formas = new Set((m.screenshots || []).map(s => s.form_factor))
  return formas.has('wide') && formas.has('narrow')
}
