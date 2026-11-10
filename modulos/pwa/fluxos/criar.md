---
description: Cria um PWA do zero com as sete camadas (manifesto, service worker, instalação, notificações, casca nativa, dados, verificação), nativo no celular e de verdade no desktop.
argument-hint: <o que o app faz> [next|vite]
---

Crie um PWA para: $ARGUMENTS

Siga o módulo pwa (leia `$HOME/.claude/skills/tatile/modulos/pwa/README.md` e cada referência
quando chegar na camada dela).

1. Pilha: Next.js (App Router) por padrão; Vite se o pedido disser ou o repositório já usar.
2. Copie os modelos de `$HOME/.claude/skills/tatile/modulos/pwa/templates/` e ajuste nome, cores, rotas de dados e
   prefixos do service worker ao app. Não reescreva do zero o que o modelo resolve.
3. Ícones: `bash $HOME/.claude/skills/tatile/modulos/pwa/templates/scripts/gerar-icones.sh <png-1024> public/icons`.
   Sem PNG de origem, gere um símbolo simples e diga que é provisório.
4. Casca: `Casca.jsx` e `Dock.jsx` com os destinos reais do app; `base-nativa.css` no CSS global.
5. Notificações só se o app tiver algo que mereça aviso; senão deixe a camada desligada e diga.
6. Rode o auditor até sair 0:
   `node "$HOME/.claude/skills/tatile/modulos/pwa/scripts/auditar.mjs" .`
7. Verifique como em `references/verificacao.md` (build, render em 390 e 1280 px, manifesto
   servido, service worker ativo, offline).

Relate: o que foi criado, a saída do auditor, o que foi verificado no render e o que depende de
aparelho (dito como pendente).
