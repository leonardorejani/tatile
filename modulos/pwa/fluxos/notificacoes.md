---
description: Monta notificações inteligentes de ponta a ponta (VAPID, inscrição por aparelho, teste na hora, disparador que só avisa o que mudou) num PWA.
argument-hint: <o que deve gerar aviso>
---

Monte notificações para: $ARGUMENTS

Siga `$HOME/.claude/skills/tatile/modulos/pwa/references/notificacoes.md`.

1. Chaves: `node $HOME/.claude/skills/tatile/modulos/pwa/templates/scripts/gerar-vapid.mjs <arquivo-de-segredos>`.
   A privada nunca aparece na saída nem no repositório; ponha nas variáveis do servidor pelo nome.
2. Banco: aplique `templates/supabase/push.sql` (ou o equivalente no banco do projeto), com a
   inscrição presa à conta.
3. Service worker com `push` e `notificationclick` (modelo `comum/public/sw.js`).
4. Tela: chave "Ligar notificações" (`CartaoNotificacoes.jsx`) que pede permissão no toque e manda
   o teste; no iPhone sem instalar, aponta para o cartão de instalação.
5. Rota de teste (`next/app/api/push/teste/route.js`).
6. Disparador (`templates/scripts/disparar.mjs`): escreva `decidir` para o caso pedido, com número
   real calculado em código, limiar, uma notificação por pessoa e `tag` por assunto. Primeira
   rodada só grava referência.
7. Agendamento: job que roda o disparador depois que o dado novo foi publicado, nunca antes.

Prove: `--simular` com a lista de quem receberia o quê; a rota de teste com 401 sem login e o 404
ou 410 do serviço de push para endpoint inventado. A notificação no aparelho fica pendente até
alguém ver.
