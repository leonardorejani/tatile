// Manifesto do app (Next.js app router serve em /manifest.webmanifest). Troque nomes, cores e atalhos.
// id fixo evita que o navegador trate duas instalações como apps diferentes quando start_url muda.
export default function manifest() {
  return {
    name: 'Nome completo do app',
    short_name: 'Nome curto',
    description: 'Uma frase do que o app resolve.',
    id: '/',
    start_url: '/?origem=app',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'any',
    background_color: '#fafafa',
    theme_color: '#fafafa',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Prints reais: o Chrome mostra no convite de instalação (wide no desktop, narrow no celular)
    screenshots: [
      { src: '/prints/tela-larga.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'Tela principal no computador' },
      { src: '/prints/tela-estreita.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: 'Tela principal no celular' },
    ],
    shortcuts: [
      { name: 'Ação mais usada', url: '/?tela=principal', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
