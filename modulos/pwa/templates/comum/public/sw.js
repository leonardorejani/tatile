// Service worker do app: abre sem internet com o que já foi visto e recebe notificações.
// Suba VERSAO a cada mudança de estratégia de cache; o activate apaga os caches da versão anterior.
// Ajuste as listas de caminho ao app (rotas de dados, mídia, origens externas de dados).
const VERSAO = 'v1'
const CASCA = `casca-${VERSAO}`
const DADOS = `dados-${VERSAO}`
const MIDIA = `midia-${VERSAO}`
const ESSENCIAIS = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

// Origens de fora que trazem dado do app (bucket, API pública): rede primeiro, cache se cair
const DADOS_EXTERNOS = []
const PREFIXOS_DADOS = ['/data/', '/api/publico/']
const PREFIXOS_IMUTAVEIS = ['/_next/static/', '/assets/', '/icons/']
const PREFIXOS_MIDIA = ['/fotos/', '/imagens/']

const TITULO_PADRAO = 'Novidade no app'

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CASCA).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', evento => {
  const atuais = [CASCA, DADOS, MIDIA]
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => !atuais.includes(n)).map(n => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

// Rede primeiro: página e dado vêm frescos quando há sinal; sem sinal, o último visto
async function redePrimeiro(pedido, nome) {
  const cache = await caches.open(nome)
  try {
    const resposta = await fetch(pedido)
    if (resposta.ok) cache.put(pedido, resposta.clone())
    return resposta
  } catch {
    return (await cache.match(pedido)) || (await cache.match('/')) || Response.error()
  }
}

// Cache primeiro: arquivo com hash no nome e mídia que não muda
async function cachePrimeiro(pedido, nome) {
  const cache = await caches.open(nome)
  const guardada = await cache.match(pedido)
  if (guardada) return guardada
  const resposta = await fetch(pedido)
  if (resposta.ok) cache.put(pedido, resposta.clone())
  return resposta
}

const comeca = (caminho, prefixos) => prefixos.some(p => caminho.startsWith(p))

self.addEventListener('fetch', evento => {
  const { request } = evento
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (DADOS_EXTERNOS.some(d => request.url.startsWith(d))) return evento.respondWith(redePrimeiro(request, DADOS))
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') return evento.respondWith(redePrimeiro(request, CASCA))
  if (comeca(url.pathname, PREFIXOS_IMUTAVEIS)) return evento.respondWith(cachePrimeiro(request, CASCA))
  if (comeca(url.pathname, PREFIXOS_MIDIA)) return evento.respondWith(cachePrimeiro(request, MIDIA))
  if (comeca(url.pathname, PREFIXOS_DADOS)) return evento.respondWith(redePrimeiro(request, DADOS))
})

// Notificação: o servidor manda { titulo, corpo, url, etiqueta }
self.addEventListener('push', evento => {
  let dados = {}
  try { dados = evento.data ? evento.data.json() : {} } catch { dados = { corpo: evento.data?.text() } }
  evento.waitUntil(self.registration.showNotification(dados.titulo || TITULO_PADRAO, {
    body: dados.corpo || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: dados.etiqueta || 'geral',
    renotify: true,
    data: { url: dados.url || '/' },
    lang: 'pt-BR',
  }))
})

// Clique: foca a janela já aberta do app e leva à tela da notificação; sem janela, abre uma
self.addEventListener('notificationclick', evento => {
  evento.notification.close()
  const destino = new URL(evento.notification.data?.url || '/', self.location.origin).href
  evento.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const aberta = abertas.find(c => c.url.startsWith(self.location.origin))
    if (aberta) {
      await aberta.focus()
      return aberta.navigate(destino)
    }
    return self.clients.openWindow(destino)
  })())
})
