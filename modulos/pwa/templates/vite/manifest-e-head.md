# PWA em Vite (React, Vue, Svelte) sem plugin

1. `public/manifest.webmanifest`: o mesmo objeto de `templates/next/app/manifest.js`, em JSON.
2. `public/sw.js`: `templates/comum/public/sw.js`, trocando `PREFIXOS_IMUTAVEIS` por `['/assets/', '/icons/']`.
3. `src/lib/pwa.js`: `templates/comum/lib/pwa.js`; chame `registrarServiceWorker()` no `main`.
4. No `index.html`, dentro do `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafafa" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Nome curto" />
```

Com `vite-plugin-pwa`, o manifesto vai em `VitePWA({ manifest: {...} })` (o auditor lê de lá) e o
service worker fica em `strategies: 'injectManifest'` apontando para o `sw.js` acima, para manter o
push e o clique na notificação.
