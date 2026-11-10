export default function manifest() {
  return {
    name: 'App Bom',
    short_name: 'Bom',
    id: '/',
    start_url: '/?origem=app',
    scope: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#fafafa',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/prints/tela-larga.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide' },
      { src: '/prints/tela-estreita.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
    ],
    shortcuts: [{ name: 'Início', url: '/' }],
  }
}
