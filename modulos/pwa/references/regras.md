# Regras do auditor e como corrigir cada uma

Severidade: **erro** quebra instalação, notificação ou acessibilidade; **aviso** funciona, mas não
parece app; **dica** melhora o convite de instalação e o desktop. Modelos em `templates/`.

## Manifesto (M)

| Id | Sev | Correção |
|---|---|---|
| M00 | aviso | O auditor achou o manifesto mas não leu o objeto (manifesto montado por função ou import). Confira à mão ou passe o objeto literal. |
| M01 | erro | Crie o manifesto: `templates/next/app/manifest.js` (Next) ou `public/manifest.webmanifest` com `<link rel="manifest">` (Vite). |
| M02 | erro | `name` (nome completo, convite de instalação) e `short_name` (até 12 caracteres, embaixo do ícone). |
| M03 | erro | `display: 'standalone'`. `browser` não instala como app. |
| M04 | aviso | `id: '/'`, `start_url` (pode levar `?origem=app` para medir uso instalado) e `scope: '/'`. O `id` fixo segura a identidade do app se o `start_url` mudar. |
| M05 | erro | Ícones 192x192 e 512x512 com `purpose: 'any'`. `templates/scripts/gerar-icones.sh` gera do PNG de 1024. |
| M06 | aviso | Ícone maskable com o símbolo em 80% da área (zona segura). O mesmo script gera. |
| M07 | aviso | `theme_color` (barra) e `background_color` (tela de abertura) iguais ao fundo do topo do app. |
| M08 | erro | O arquivo do ícone ou print citado no manifesto não existe em `public/`. Gere ou corrija o caminho. |

## Service worker (S)

| Id | Sev | Correção |
|---|---|---|
| S01 | erro | Registre: `registrarServiceWorker('/sw.js')` de `templates/comum/lib/pwa.js` (no Next, `RegistrarSW.jsx` no layout). Só registra em contexto seguro (https ou localhost). |
| S02 | erro | O service worker precisa do `fetch`; use `templates/comum/public/sw.js`. |
| S03 | aviso | No `activate`, apague os caches cujo nome não é da `VERSAO` atual. Sem isso, cada versão empilha cache no aparelho. |
| S04 | aviso | Responda `request.mode === 'navigate'` com rede primeiro e a casca em cache como reserva: o app abre sem sinal. |
| S05 | dica | `self.skipWaiting()` no install e `clients.claim()` no activate: a versão nova vale no próximo carregamento. |

## Notificações (P)

| Id | Sev | Correção |
|---|---|---|
| P01 | erro | Trate `notificationclick`: feche, foque a janela aberta e navegue para `data.url`; sem janela, `openWindow`. |
| P02 | erro | Chave privada VAPID no código do navegador. Tire do código, gere um par novo (`gerar-vapid.mjs`), ponha a privada só no servidor. O par antigo está comprometido: as inscrições feitas com ele precisam ser refeitas. |
| P03 | aviso | Pedido de permissão em `useEffect` ou no carregamento. Mova para o clique de um botão ou chave que diga o que o usuário ganha. |
| P04 | aviso | Pede permissão mas o service worker não tem `push`: a permissão é pedida e nada chega. |

## Instalação (I)

| Id | Sev | Correção |
|---|---|---|
| I01 | aviso | Ouça `beforeinstallprompt`, guarde o evento e mostre botão próprio (`CartaoInstalar.jsx`). Vale para Android e para Chrome e Edge no desktop. |
| I02 | aviso | Detecte `display-mode: standalone` (e `navigator.standalone` no iPhone) para esconder o convite de quem já instalou e mostrar os passos certos no iPhone e no Safari do Mac. |

## Acabamento nativo (N)

| Id | Sev | Correção |
|---|---|---|
| N01 | aviso | `viewport-fit=cover` (Next: `viewport.viewportFit = 'cover'`). |
| N02 | aviso | `theme-color`, um por esquema de cor, igual ao fundo do topo. |
| N03 | aviso | `apple-touch-icon` de 180 px; sem ele o iPhone usa um print da página. |
| N04 | aviso | `html { -webkit-tap-highlight-color: transparent }` e retorno próprio no `:active` (`base-nativa.css`). |
| N05 | aviso | Troque `100vh`/`h-screen` por `100dvh`/`h-dvh` na casca do app; `100svh` em tela de abertura. |
| N06 | erro | Tire `maximum-scale=1` e `user-scalable=no`. Para o zoom ao focar, fonte de 16 px no campo (N07). |
| N07 | aviso | Campo com 16 px no mínimo (`text-base` no Tailwind). No desktop pode ser menor com `@media (pointer: fine)`. |
| N08 | aviso | Ponha cada `:hover` dentro de `@media (hover: hover) and (pointer: fine)`. Tailwind 4 já faz isso no `hover:`. |
| N09 | aviso | Com `viewport-fit=cover`, compense a área segura: `padding-bottom: env(safe-area-inset-bottom, 0px)` no dock e nas folhas, `env(safe-area-inset-top)` no topo. |
| N10 | dica | `overscroll-behavior: none` no `html` e `contain` em cada área que rola dentro do app. |

## Desktop e loja (D)

| Id | Sev | Correção |
|---|---|---|
| D01 | dica | `screenshots` com um print `form_factor: 'wide'` (1280x800) e um `narrow` (390x844): o Chrome mostra no convite de instalação. |
| D02 | dica | `shortcuts` com as 2 ou 3 ações mais usadas: aparecem ao segurar o ícone (Android) ou com clique direito (desktop). |
| D03 | aviso | Layout para tela larga: a partir de 768 px, painel lateral ou navegação no topo (`Casca.jsx`). Celular esticado no monitor não é PWA de desktop. |
