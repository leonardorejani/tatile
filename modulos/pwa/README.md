# Módulo PWA nativo

> Origem: repo `leonardocandiani/pwa-nativo` (commit 8159c5a, 26/10/2026), MIT. Os comandos do plugin viraram fluxos em `fluxos/`. Para atualizar, ver `ORIGEM.md`.

Um PWA bom não parece site dentro de um navegador. Ele instala com o ícone certo em cada aparelho,
abre sem internet com o que já foi visto, avisa no momento que importa e se ajusta à tela: dock ao
alcance do polegar no celular, painel lateral e janela própria no computador. Este método saiu do
precodiesel.com.br (Next.js 14, Supabase, Vercel), onde cada peça abaixo está em produção.

## As sete camadas

Trabalhe nesta ordem. Cada camada tem a referência com o porquê e o código.

| # | Camada | O que entrega | Referência |
|---|---|---|---|
| 1 | Manifesto e ícones | instala, ícone certo, cor na abertura, atalhos, prints no convite | `references/manifesto-e-icones.md` |
| 2 | Service worker | abre sem sinal; dado fresco com sinal; versão nova sem fechar abas | `references/service-worker.md` |
| 3 | Instalação | botão próprio onde o navegador deixa, passos certos onde não deixa | `references/instalacao.md` |
| 4 | Notificações | inscrição por aparelho, teste na hora, disparador que só avisa o que mudou | `references/notificacoes.md` |
| 5 | Casca nativa | dock no celular, painel lateral no desktop, área segura, toque sem atraso | `references/casca-nativa.md` |
| 6 | Dados e offline | dado que muda sem deploy, com reserva embutida e sanidade antes de publicar | `references/dados-sem-deploy.md` |
| 7 | Verificação | auditor sem rede, render real em 390 e 1280 px, prova no aparelho | `references/verificacao.md` |

O caso completo, com o que deu errado e como foi corrigido: `references/caso-precodiesel.md`.

## Regras que não se negociam

1. **Nunca trave o zoom.** `maximum-scale=1` e `user-scalable=no` são falha de acessibilidade. O
   zoom ao focar campo se resolve com fonte de 16 px no campo.
2. **Permissão de notificação só a partir de toque do usuário**, num botão que explica o ganho. Pedir
   no carregamento é bloqueado pelo navegador e queima o pedido para sempre naquele aparelho.
3. **Ligou, testou.** Ao ligar notificações, o servidor manda uma de teste na hora. Ela prova chave,
   inscrição, servidor e aparelho de uma vez; sem ela, ninguém sabe se o aviso de verdade vai chegar.
4. **A chave privada VAPID nunca vai ao navegador nem ao repositório.** A pública vai no código;
   a privada fica nas variáveis do servidor e num arquivo de segredos com chmod 600.
5. **iPhone só recebe notificação com o app instalado** (iOS 16.4+). Android e computador recebem
   direto no navegador. A tela diz isso no aparelho certo, em vez de esconder a opção.
6. **Capacidade, não aparelho, para estilo**: `(hover: hover)`, `(pointer: fine)`, `env()`, `dvh`.
   O user agent só decide uma coisa: qual instrução de instalação mostrar.
7. **Desktop é cidadão de primeira.** A partir de 768 px a navegação sai do dock e vai para o topo ou
   para um painel lateral; o manifesto traz `screenshots` wide e `display_override`. Os espaçamentos
   de cada tamanho de tela vêm do módulo `espacamento` (`codigo/espaco.css`).
8. **Nenhum número inventado na notificação.** O disparador calcula em código o que mudou e diz o
   número ("baixou R$ 0,12 o litro"), uma notificação por pessoa por rodada, juntando os avisos.
9. **Nada irreversível em cron.** Atualizar dado não exige deploy: dado semanal vai para um bucket
   com manifest por último, e o app lê de lá com a versão do build como reserva.

## Fluxos (eram os comandos do plugin)

Ler o arquivo e seguir os passos:

- `fluxos/criar.md`: PWA do zero, com as sete camadas.
- `fluxos/converter.md`: leva um sistema web existente a PWA sem quebrar o que funciona.
- `fluxos/auditar.md`: roda o auditor, confere no render real e lista o que corrigir.
- `fluxos/notificacoes.md`: notificações inteligentes de ponta a ponta.
- `fluxos/otimizar.md`: ajusta e refatora um PWA existente para parecer nativo e carregar rápido.
- `fluxos/auditor-pwa.md`: prompt de um subagente somente leitura que audita (era o agente do plugin).

## Auditor

`node "$HOME/.claude/skills/tatile/modulos/pwa/scripts/auditar.mjs" <pasta>` confere 32 regras sem rede e sem
dependência, em TOON. Saída 0 sem erro, 1 com erro, 2 uso errado. Guarda a análise por arquivo em
`.pwa-nativo/cache.json` (ponha no `.gitignore`); só relê o que mudou. Cada id tem a correção em
`references/regras.md`. O auditor prova o código; o render e o aparelho provam o resto.

## Modelos de código

Em `$HOME/.claude/skills/tatile/modulos/pwa/templates/`, todos tirados de produção:

- `comum/public/sw.js`: service worker com rede primeiro, cache primeiro, versão, push e clique.
- `comum/lib/pwa.js`: registro, plataforma, instalação, notificações (sem framework).
- `react/`: `usePwa.js`, `CartaoInstalar.jsx`, `CartaoNotificacoes.jsx`, `Dock.jsx`, `Casca.jsx`.
- `next/app/`: `manifest.js`, `layout.js`, `RegistrarSW.jsx`, `api/push/teste/route.js`.
- `vite/manifest-e-head.md`: o mesmo em Vite, com ou sem `vite-plugin-pwa`.
- `css/base-nativa.css`: a base mobile-native, cada linha com o porquê.
- `supabase/push.sql`: inscrições por aparelho, funções e segredo do disparador por hash.
- `scripts/gerar-vapid.mjs`, `scripts/disparar.mjs`, `scripts/gerar-icones.sh`.

Copie o modelo e ajuste ao app; não reescreva do zero o que o modelo já resolve.

## Pronto é

O auditor sai 0, o app instala e abre sem internet no Chrome headless (prova em script), as telas
principais renderizam sem estouro em 390 e 1280 px, e a notificação de teste foi pedida ao servidor
e aceita pelo serviço de push. O que só um aparelho prova (notificação aparecendo no iPhone, gesto,
teclado) é dito como pendente, nunca como feito.

## Regra 1.2: rolagem que não vaza

`overscroll-behavior: contain` em modal, painel e lista rolável: chegou no fim da lista e a página
de trás não começa a rolar. `overscroll-behavior: none` no `html` só dentro de
`@media (pointer: fine)`, para manter o puxar-pra-atualizar no celular.

```css
.modal, .painel, .lista-rolavel { overscroll-behavior: contain }
@media (pointer: fine) { html { overscroll-behavior: none } }
```
