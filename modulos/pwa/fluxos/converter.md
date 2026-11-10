---
description: Transforma um sistema web existente em PWA instalável sem quebrar o que já funciona, com casca nativa no celular e layout de app no desktop.
argument-hint: [pasta do projeto]
---

Converta em PWA o projeto em: $ARGUMENTS (sem argumento, a pasta atual)

Siga o módulo pwa (`$HOME/.claude/skills/tatile/modulos/pwa/README.md`).

1. **Inventário antes de mexer.** Leia `package.json`, o layout raiz e o CSS global. Identifique a
   pilha (Next App Router, Next Pages, Vite, outro), se já existe manifesto, service worker
   (incluindo `next-pwa` ou `vite-plugin-pwa`), push, e onde fica a navegação.
2. **Auditoria inicial**: `node "$HOME/.claude/skills/tatile/modulos/pwa/scripts/auditar.mjs" <pasta>`. Guarde a
   saída como "antes".
3. Corrija na ordem das camadas, uma por vez, rodando o build depois de cada uma:
   manifesto e ícones, service worker, instalação, casca nativa, notificações (se fizer sentido).
4. **Não troque o que funciona.** Se já existe service worker, ajuste-o em vez de substituir; se
   existe biblioteca de PWA, configure-a em vez de remover. Rotas autenticadas e POST nunca entram
   no cache.
5. A casca muda a navegação: preserve as rotas e os links atuais; o dock e o painel apontam para
   elas.
6. Auditoria final até sair 0, e a verificação de `references/verificacao.md`.

Relate o antes e o depois do auditor, o que mudou por arquivo, o que foi verificado e o que ficou
pendente de aparelho.
