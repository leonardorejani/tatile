# Notificações inteligentes

## A cadeia

1. `gerar-vapid.mjs` cria o par VAPID e o segredo do disparador num arquivo fora do repo (chmod 600).
   A pública vai no código (`CHAVE_PUBLICA_VAPID`); a privada nas variáveis do servidor.
2. `supabase/push.sql`: tabela de inscrições por aparelho, presa à conta, acessada só por funções.
   O disparador lê com um segredo cujo sha256 fica no banco.
3. No app, a chave "Ligar notificações" (clique do usuário) pede permissão, inscreve o aparelho,
   grava no servidor e chama a rota de teste (`next/app/api/push/teste/route.js`).
4. O service worker mostra a notificação e trata o clique (foca a janela e abre a tela certa).
5. `disparar.mjs` roda em job: decide o aviso de cada conta em código, junta numa notificação só,
   envia e descarta o aparelho que respondeu 404 ou 410.

## O que torna a notificação inteligente

- **Só o que mudou desde o último aviso.** O disparador guarda a referência (preço avisado, status
  visto) e só avisa de novo quando passa de um limiar ("baixou 5 centavos ou mais").
- **Uma por pessoa por rodada.** Vários motivos viram uma notificação com o mais forte no título e o
  resto no corpo ("3 postos favoritos baixaram; a maior queda foi no Posto X").
- **Número de verdade, calculado em código.** "Agora R$ 6,89 o litro, antes R$ 7,01", nunca "confira".
- **Clique leva à tela do assunto** (`url` com `?tela=`), não à home.
- **`tag` por assunto**: aviso novo do mesmo assunto substitui o anterior em vez de empilhar.
- **TTL coerente**: aviso de preço vale 24 h; teste vale 10 min.
- **Primeira rodada só grava referência** para não disparar aviso velho em quem acabou de ligar.
- **Só para quem tem conta**: a inscrição é presa à conta, e a conta decide o que quer receber.

## Por plataforma

- Android e computador: notificação no navegador, sem instalar.
- iPhone: só com o app na tela de início (iOS 16.4+). Fora disso, a tela diz isso e aponta para instalar.
- Permissão negada não volta por código: a tela explica onde liberar nas configurações.

## Provas

- `disparar.mjs --simular` mostra o que mandaria sem enviar; `--teste` manda o teste a todos.
- A rota de teste responde 401 sem login, 400 sem inscrição e 502 quando o serviço de push recusa;
  com um endpoint inventado, a resposta 404 ou 410 do serviço prova que a assinatura VAPID saiu certa.
- A notificação aparecendo no aparelho é prova de pessoa, com o celular na mão; diga que está pendente
  até alguém ver.
