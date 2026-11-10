# Manifesto e ícones

O manifesto decide se o app instala, que nome e ícone aparecem e que cor pinta a abertura. Modelo:
`templates/next/app/manifest.js` (Next serve em `/manifest.webmanifest`).

- `id: '/'` fixo. Sem ele o navegador usa o `start_url` como identidade; mudar o `start_url` vira
  "outro app" para quem já instalou.
- `start_url: '/?origem=app'` mede quem abre pelo ícone. Atalhos (`shortcuts`) usam a mesma ideia
  com `?tela=` e o app abre direto na tela certa.
- `display: 'standalone'` e `display_override: ['window-controls-overlay', 'standalone']`: no
  desktop o app pode usar a barra de título como área própria.
- `theme_color` e `background_color` iguais ao fundo do topo do app, não à cor da marca.
- Ícones: 192 e 512 `any`, 192 e 512 `maskable` com o símbolo em 80% da área, `apple-touch-icon`
  de 180 e favicon de 32. `templates/scripts/gerar-icones.sh <png-1024> public/icons` gera todos.
- `screenshots` wide e narrow com print real: o convite de instalação do Chrome fica rico no desktop
  e no Android em vez de uma linha de texto.
- `orientation`: `portrait` só se o app quebra em paisagem; o padrão é `any`, porque no desktop e no
  tablet a orientação fixa atrapalha.
