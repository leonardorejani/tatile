---
description: Ajusta e refatora um PWA existente para parecer app nativo no celular, funcionar bem no desktop e carregar rápido, corrigindo o que o auditor e o render apontam.
argument-hint: [pasta do projeto] [foco opcional]
---

Otimize o PWA em: $ARGUMENTS (sem argumento, a pasta atual)

1. Rode o auditor e guarde como "antes":
   `node "$HOME/.claude/skills/tatile/modulos/pwa/scripts/auditar.mjs" <pasta>`
2. Corrija erros primeiro, depois avisos, depois dicas, com as correções de
   `$HOME/.claude/skills/tatile/modulos/pwa/references/regras.md`. Mudança mínima por achado; não
   reformate arquivo que não tem achado.
3. Desktop: se o layout a partir de 768 px é o do celular esticado, aplique a casca com painel
   lateral (`references/casca-nativa.md`).
4. Carregamento: confira o que entra no cache do service worker (nada pessoal, nada de POST), o
   tamanho dos ícones e se as imagens grandes têm `loading="lazy"` e tamanho declarado.
5. Rode o auditor de novo e a verificação de `references/verificacao.md`.

Relate o antes e o depois do auditor (contagem por severidade), as mudanças por arquivo e o que
precisa de aparelho para confirmar.
