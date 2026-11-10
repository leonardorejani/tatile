---
description: Audita um PWA (manifesto, service worker, instalação, notificações, acabamento nativo e desktop) e lista o que corrigir, com arquivo, linha e a correção.
argument-hint: [pasta do projeto]
---

Audite o PWA em: $ARGUMENTS (sem argumento, a pasta atual)

1. Rode o auditor (sem rede, com cache por arquivo):
   `node "$HOME/.claude/skills/tatile/modulos/pwa/scripts/auditar.mjs" <pasta>`
2. Para cada achado, abra o arquivo na linha e confirme. O auditor casa padrão de texto: descarte o
   falso positivo e diga por quê.
3. Se houver servidor rodando ou URL publicada, confira o que só o render mostra: manifesto servido,
   ícones com 200, service worker ativo, layout em 390 e 1280 px sem estouro
   (`references/verificacao.md`).
4. Entregue uma tabela por severidade: id, arquivo:linha, o problema e a correção
   (`$HOME/.claude/skills/tatile/modulos/pwa/references/regras.md`).

Não corrija nada neste comando; para corrigir, use o fluxo `fluxos/otimizar.md`.
