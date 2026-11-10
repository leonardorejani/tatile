// Núcleo do PWA no navegador, sem framework: registro do service worker, plataforma, instalação e
// notificações. Os hooks de React (templates/react/usePwa.js) e qualquer outra tela usam só isto.
//
// Configure: CHAVE_PUBLICA_VAPID (pública por definição; a privada nunca vem para o navegador) e as
// duas funções de servidor em `servidor`, que guardam a inscrição e mandam a notificação de teste.

export const CHAVE_PUBLICA_VAPID = '' // gerada por templates/scripts/gerar-vapid.mjs

export function registrarServiceWorker(caminho = '/sw.js') {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return
  const registrar = () => navigator.serviceWorker.register(caminho).catch(() => {})
  // Em React e Next o efeito roda depois do load; esperar o evento aí nunca registraria
  if (document.readyState === 'complete') registrar()
  else window.addEventListener('load', registrar, { once: true })
}

const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// O próprio navegador diz o aparelho; cada um instala o app por um caminho diferente
export function plataforma() {
  const ua = navigator.userAgent
  if (ehIphone()) return 'iphone'
  if (/android/i.test(ua)) return 'android'
  if (/macintosh/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|edg|firefox/i.test(ua)) return 'mac-safari'
  if (/firefox/i.test(ua)) return 'firefox'
  return 'computador'
}

export const instalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

// Passos de instalação quando o navegador não oferece o botão (iPhone, Safari no Mac, menu do Android)
export const PASSOS_INSTALAR = {
  iphone: ['Toque no botão Compartilhar do Safari (o quadrado com a seta para cima)', 'Escolha Adicionar à Tela de Início', 'Abra pelo ícone novo'],
  android: ['Toque no menu do navegador (os três pontinhos no canto)', 'Escolha Instalar app ou Adicionar à tela inicial', 'Abra pelo ícone novo'],
  'mac-safari': ['No menu Arquivo do Safari, escolha Adicionar ao Dock', 'Abra pelo ícone no Dock'],
  computador: ['Clique no ícone de instalar na barra de endereço do Chrome ou do Edge', 'Abra pelo atalho criado'],
}

// O convite do Chrome e do Edge (Android e desktop) chega uma vez; guardamos para o botão próprio
let convite = null
const ouvintes = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    convite = e
    ouvintes.forEach(f => f())
  })
  window.addEventListener('appinstalled', () => {
    convite = null
    ouvintes.forEach(f => f())
  })
}

export function ouvirInstalacao(f) {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

export function estadoInstalacao() {
  return { podeInstalar: Boolean(convite), plataforma: plataforma(), jaInstalado: instalado() }
}

export async function instalar() {
  if (!convite) return false
  convite.prompt()
  const { outcome } = await convite.userChoice
  convite = null
  ouvintes.forEach(f => f())
  return outcome === 'accepted'
}

function bytesDaChave(base64) {
  const limpo = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(limpo), c => c.charCodeAt(0))
}

// Situação das notificações neste aparelho. No iPhone elas só existem com o app instalado (iOS 16.4+);
// Android e computador ligam direto no navegador.
export async function estadoNotificacoes() {
  const suportado = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const precisaInstalar = ehIphone() && !instalado()
  if (!suportado) return { suportado: false, precisaInstalar }
  // getRegistration responde na hora; o ready ficaria pendurado para sempre sem service worker registrado
  const registro = await navigator.serviceWorker.getRegistration()
  const inscricao = registro ? await registro.pushManager.getSubscription() : null
  return { suportado: true, precisaInstalar, permissao: Notification.permission, ligado: Boolean(inscricao) && Notification.permission === 'granted' }
}

// Só chame a partir de um toque do usuário (botão, chave): pedido sem gesto é bloqueado e queima
export async function ligarNotificacoes(servidor) {
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error('As notificações estão bloqueadas. Libere nas configurações do aparelho para este app.')
  const registro = await navigator.serviceWorker.ready
  const inscricao = (await registro.pushManager.getSubscription())
    || (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(CHAVE_PUBLICA_VAPID) }))
  await servidor.inscrever(inscricao.toJSON())
  // A notificação de teste prova a cadeia inteira (chave, inscrição, servidor, aparelho) na hora
  await servidor.testar(inscricao.toJSON())
}

export async function mandarTeste(servidor) {
  const registro = await navigator.serviceWorker.ready
  const inscricao = await registro.pushManager.getSubscription()
  if (!inscricao) throw new Error('Ligue as notificações primeiro.')
  await servidor.testar(inscricao.toJSON())
}

export async function desligarNotificacoes(servidor) {
  const registro = await navigator.serviceWorker.ready
  const inscricao = await registro.pushManager.getSubscription()
  if (!inscricao) return
  await servidor.cancelar(inscricao.endpoint).catch(() => {})
  await inscricao.unsubscribe()
}
