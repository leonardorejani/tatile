# Casca nativa: celular e desktop

## Celular (até 767 px)

- **Dock embaixo** com até cinco destinos (`templates/react/Dock.jsx`), 64 px mais a área segura.
  É o padrão de app: o polegar alcança, o item ativo tem ícone mais forte e rótulo em negrito.
- **Folha ou coluna única** acima do dock; nada fica escondido atrás dele (`bottom` = 64 px + área segura).
- **Altura em `dvh`**: `h-dvh` na casca, nunca `100vh` (a barra do navegador corta o fundo).
- Base mobile-native (`templates/css/base-nativa.css`): sem flash no toque, `touch-action:
  manipulation`, `:active` para retorno, campo com 16 px, `overscroll-behavior`, `user-select: none`
  só em controle.
- Área segura: `viewport-fit=cover` mais `env(safe-area-inset-*)` no topo, no dock e nas folhas.

## Desktop (a partir de 768 px)

- **Painel lateral** fixo à esquerda (`--painel: clamp(360px, 40vw, 480px)`) e o conteúdo principal
  ao lado (`templates/react/Casca.jsx`). O dock some (`md:hidden`).
- Navegação vai para atalhos no topo; busca fica no canto superior direito.
- Hover só com `@media (hover: hover) and (pointer: fine)`.
- Atalhos de teclado nas ações frequentes, sem animação nelas.
- Instalado, abre em janela própria; `display_override` com `window-controls-overlay` deixa usar a
  barra de título.

## Tablet

A faixa de 768 a 1100 px usa o layout de desktop com o painel em `clamp`, não o de celular esticado.
Meça em 768, 1024 e 1280 px: nada pode estourar a largura (`scrollWidth === innerWidth`).
