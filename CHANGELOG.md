# Changelog

## 1.4.0 (10/11/2026)

- **módulo web novo:** rolagem que não vaza, barra de rolagem, `touch-action`, `user-select` e área
  segura saíram do módulo pwa. Valem para toda tela web e o SKILL.md manda ler o módulo em qualquer
  tela no navegador. A N10 do pwa passa a cobrir só o `html` e aponta para a `rolagem-vaza`.
- **barra de rolagem:** `codigo/rolagem.css`, fina, sem trilho, só aparece com o mouse em cima, com
  `:hover` dentro de `(hover: hover)` e `scrollbar-gutter: stable` em `.rolagem-estavel`. Teste
  `npm run rolagem` abre o Chrome sem `--hide-scrollbars` e compara os pixels da barra.
- **auditor:** `--desde <ref do git>` mostra só o achado novo, casando pela regra e pelo texto da
  linha; `--estrito` sai com 1 em aviso novo. No Deck: 49 avisos antigos, 0 novos.
- **auditor:** `cor-solta` deixa de apontar `theme-color` (meta, manifesto, `themeColor` do Next),
  que não aceita `var()`. O próprio template Next da skill caía no aviso.
- **testes dos auditores no repo:** `auditor/testes/` e `modulos/pwa/testes/` rodam em qualquer
  clone com `node --test`. O teste do CLI troca o total fixo da fixture ruim pela contagem de
  cada regra.
- **SKILL.md:** protótipo que vai virar PWA conta como PWA, seção de telas de passo e de escolha
  (centralizar, prévia real, sem checks no fim, permissão pelo nome do sistema), checklist de
  entrega e tabela de problemas comuns.
- **skill-updater, 3 rodadas (nota de 13 para 23 de 25):** a manutenção da própria skill (verificar,
  como evoluir, créditos) saiu para `docs/manutencao.md`. O checklist virou 17 itens marcáveis.
  Entraram "Quando usar", uma tabela de anti-padrões e `exemplos/deck.md`, com o antes e depois real
  do Deck. O SKILL.md fica abaixo de 2000 palavras.

## 1.3.0 (10/11/2026)

- **auditor:** regra nova `rolagem-vaza` (erro). `overflow: auto` ou `scroll` sem
  `overscroll-behavior` na mesma regra, ou no mesmo `style="..."`, é apontado em todo CSS. Antes só o
  auditor do PWA lembrava disso (N10, como dica), e uma lista que rola dentro dos Ajustes do Deck
  arrastava a janela inteira. `html` e `body` ficam de fora. Teste com os casos de linha única, de
  bloco em várias linhas, de `style` em linha e de duas regras na mesma linha.
- **regra geral 10** no SKILL.md: rolagem dentro de rolagem não vaza.
- **demos:** as 7 áreas que rolam na vitrine, no protótipo e nas telas de espaçamento ganharam
  `overscroll-behavior: contain`.

## 1.2.2 (10/11/2026)

Teste exploratório clicando em tudo (pedido do Leonardo): 12 falhas reais, todas corrigidas, cada
uma com caso que falha antes e passa depois.

- **regras novas:** estados 11 (um clique, uma ação), 12 (Desfazer volta ao estado anterior) e 13
  (segurar pra confirmar com teclado). Navegação 11 (URL validada), 12 (modal e painel com Esc,
  foco preso e fundo parado) e 13 (abas com papel certo). Regra geral 9 do SKILL.md: botão com texto
  não leva ícone de enfeite do lado.
- **código:** `lerDaUrl` e `useEstadoNaUrl` aceitam a lista de valores válidos. `--destaque-bloco`
  claro passou para `#1D4ED8` e `--destaque-texto-2` para 92%: o texto de apoio tingido dava 3,8 de
  contraste. Teste novo confere esse texto nos dois temas.
- **protótipo:** duplo clique em Arquivar quebrava a página, `?aba=` desconhecido travava a tela,
  Desfazer do cancelamento voltava sempre "Pago", painel sem Esc e com fundo rolando, erro de e-mail
  que não sumia, rótulo cortando o título, linha espremida em 360 e 320, contraste das pílulas,
  spinner girando parado, Criar pedido que não criava e abas sem papel. Ícone de seta do Atualizar
  removido.
- **kanban:** card criado durante o arrasto pelo teclado sumia (a prévia era uma cópia velha do
  banco). Agora a prévia é o movimento aplicado sobre o banco atual, e sair do card cancela.
- **movimento e vitrine:** Esc e foco no modal e no painel, movimento reduzido na barra e no
  spinner, número que conta seguindo do valor exibido, sombra do painel fechado, contraste do lado
  Depois, aba padrão fora da URL, Desfazer de verdade no "segure" e teclado no segurar.

## 1.2.1 (10/11/2026)

Ajustes que o Leonardo apontou depois de testar a 1.2, cada um com caso no e2e:

- **monitor grande:** a partir de 1600 px a tela de 1440 amplia inteira por `zoom` no html
  (`--escala` 1.15 no Full HD, 1.4 no QHD, 2 no 4K). Antes só espaço e texto cresciam, e no 4K o
  resto ficava pequeno. `ESPACO` ganhou `escala` para JS e React Native. Os testes de monitor
  grande mudaram para a regra nova, a pedido dele.
- **movimento:** o check do Salvar ficava fora do centro do círculo (a grade do botão crescia pelo
  texto escondido) e a cor misturava azul e verde. O detalhe da lista escondia o Voltar (foto alta
  demais).
- **protótipo:** abas cortadas viraram esmaecimento na borda onde há mais conteúdo. O Atualizar usa
  o mesmo botão do Salvar (fecha em círculo, carrega, check, volta). A troca de tema no Com é direta,
  sem tudo deslizando. O Sem não recebe o zoom do monitor grande.

## 1.2.0 (10/11/2026)

Aprovado pelo Leonardo na página de novidades de 10/11/2026. Fontes: motion-prompt (tweet do
@ChatGptAstra), arrastar fluido (tweet do @a1x45h), unslop (tweet do @stellargent_lab) e varredura
de Rauno Freiberg, Emil Kowalski, Vercel, Jakub Krehel, Adam Argyle e Josh Comeau.

- **movimento** (módulo novo): tokens de duração e curva por papel em `movimento.css` e
  `movimento.ts` (curva padrão com aceleração e desaceleração gradual, a pedido dele). Receitas de
  modal, painel de baixo com elástico ao puxar pra cima, aviso com barra de tempo, indicador de aba,
  liga e desliga, acordeão sem tranco, botão que fecha em círculo e vira carregando, número que
  conta, troca de ícone com desfoque (para todo ícone clicável do mesmo tipo), lista para detalhe
  indo e voltando, cabeçalho que some só em lista (em tabela fica fixo), entrada em cascata e
  encolher ao apertar (a onda fica como segunda opção). Página `teste/movimento/` e
  `e2e-movimento` com 15 casos.
- **estados, navegacao, formularios, tipografia, cor, pwa:** regras novas de hover só com mouse,
  dica em grupo, lista sem vão, menu no pointerdown, card de número sem enfeite, lista no teclado
  sem animação, foco nunca coberto, sombra em tabela larga, submenu com triângulo, receita de
  arrastar, texto de botão que diz a ação, rótulo que sobe, check de campo válido, desabilitado com
  motivo, formato brasileiro (`formato.ts`, só espaço comum), texto centrado em pílula, texto em
  200%, troca de tema sem transição e overscroll contido.
- **auditor:** 7 regras novas vindas do unslop e da varredura: gradiente colorido, brilho colorido,
  emoji na interface, rótulo em caixa alta (só o rótulo, decisão dele), movimento barato, texto de
  propaganda e hover sem mouse.
- **demo kanban:** arrastar card com mouse, toque (pela alça) e teclado, entre colunas, com o
  skeleton adaptativo acompanhando a nova contagem.
- **SKILL.md:** roteiro de revisão de tela (unslop), referências beUI, ExpoKit e AffectUI, créditos.
- **repo público:** README, LICENSE (MIT) e créditos de terceiros. Levantamento por projeto saiu
  para um arquivo local fora do repo.

## 1.1.2 (10/11/2026)

Ajustes que o Leonardo apontou no protótipo, cada um com caso no `e2e-prototipo`:

- **monitor grande** (espacamento e tipografia): faixas Full HD (>= 1600), QHD (>= 2200) e 4K
  (>= 3000) em `espaco.css`, `espaco.ts`, `tipo.css` e `TIPO`. O conteúdo cresce de 1200 para
  1440, 1760 e 2240, e no 4K a 100% o texto sobe junto. O teste antigo "conteúdo para em 1200
  em 1600px" mudou para as faixas novas, a pedido dele. O protótipo ganhou Full HD, QHD e 4K.
- **cor:** token `--destaque-bloco` (com `-texto` e `-texto-2`) para área grande de cor. No escuro
  o `--destaque` fica claro, que é certo para botão e link, mas acendia o banner inteiro.
- **protótipo:** o skeleton agora usa o `createShapeStore` da skill (estava fixo em 3 linhas). Os
  números do resumo não quebram no tablet (o resumo olha a largura do conteúdo, por container
  query). As pílulas têm largura fixa, ponto e contorno. O Atualizar tem ícone que gira enquanto
  carrega.

## 1.1.1 (09/11/2026)

- **protótipo** (novo): `teste/prototipo/` mostra uma tela de app inteira (pedidos) sem e com a
  tatile 1.1, com a troca animada no lugar. Controles de aparelho (celular, tablet, desktop), tema
  e velocidade do servidor, e um roteiro do que testar. Coberto por `teste/e2e-prototipo.mjs` (13
  casos), que entrou no `npm run verificar`.

## 1.1.0 (09/11/2026)

Incrementos aprovados na vitrine de 09/11/2026 (fontes: Vercel Web Interface Guidelines, Jakub
Krehel, Rauno Freiberg, Steve Schoger por resumo).

- **tipografia** (módulo novo): escala em tokens por tela (`tipo.css`, `TIPO`), `tabular-nums` em
  número que muda, `text-wrap: balance` em título e `pretty` em parágrafo, antialiased. Caracteres
  da interface ficam em ASCII (decisão do Leonardo).
- **forma** (módulo novo): raio concêntrico (`--raio-dentro`, `raioDentro`), sombra em camadas,
  contorno de imagem, alinhamento óptico como regra de revisão, área de toque `.alvo`.
- **cor** (módulo novo): tokens por papel em claro e escuro (`cor.css`, `COR`), neutros sem matiz,
  `color-scheme` e `theme-color`, cinza tingido sobre destaque, contraste mínimo testado.
- **estados** (módulo novo): `useAtrasoDeCarga` (espera 200 ms, mínimo 400 ms), UI otimista com
  Desfazer, ação perigosa com segurar, vazio e erro com próxima ação.
- **formularios** e **navegacao** (módulos novos): colar liberado, teclado certo, erro do lado do
  campo, `useEstadoNaUrl`, área de toque, menu que pisca uma vez na cor de destaque.
- **auditor** (novo): `auditor/auditar.mjs` com 8 regras (espaço, cor e raio soltos, zoom
  travado, colar bloqueado, foco removido, número sem tabular, campo com fonte pequena).
- **SKILL.md**: tabela de 9 módulos, ordem nova, e a seção que aponta pras skills de movimento,
  gesto, celular e pior caso em vez de copiar.
- **vitrine** (`teste/vitrine.html`): as 20 técnicas rodando, Antes e Depois.
- **teste**: `tokens.test` (CSS contra TS e contraste nos dois temas), `estados.test` (atraso com
  relógio falso e URL), `e2e-vitrine` (14 casos em 1280 e 390), auditor (14 testes).

## 1.0.5 (09/11/2026)

- Skill renomeada de `template_deskile` para `tatile` (de "tátil": o toque na interface e a
  sensação de usar). Pasta, `name`, caminhos e página de teste atualizados.

## 1.0.4 (09/11/2026)

- **espacamento**: protótipo novo `tablet.html`, com moldura de tablet e a tela responsiva dentro.
  Retrato (820 px) mostra os tokens de tablet e paisagem (1180 px) os de desktop, com Sem/Com
  animado e chips com o px atual. O `desktop.html` ganhou o modo embutido (`?embed=1`), sem os
  próprios controles e sem barra de rolagem.
- **conteúdo**: os exemplos de um cliente saíram. Protótipos e demos usam conteúdo genérico (empresa
  fictícia "Acme", pedidos, equipe, kanban de projetos), e as cores voltaram ao azul neutro.
- **celular**: sem barra de rolagem dentro do aparelho do protótipo.
- **skeleton**: o README explica o que é o MMKV.
- **teste**: `npm run espaco` mede o tablet nas duas orientações e no "sem a regra". O teste achou
  dois bugs no protótipo antes de você ver: a moldura escalada cobria os botões, e o modo embutido
  dava erro no console.

## 1.0.3 (09/11/2026)

- **espacamento**: o protótipo do celular virou um aparelho só, e o Sem/Com anima os 5
  espaçamentos no lugar, como no desktop (antes eram dois celulares lado a lado). Chips mostram o
  px atual.
- **conteúdo**: protótipos e demos trocaram os exemplos de igreja por exemplos comerciais de um
  cliente (metas, leads de hoje, funil de vendas, time comercial). Nomes de clientes inventados.
- **teste**: `npm run espaco` mede o protótipo do celular em 390 e 1280 px nas duas versões e
  confere que a troca anima (valor intermediário no meio da transição).

## 1.0.2 (09/11/2026)

- **skeleton (bug)**: para quem já tinha usado a demo, o skeleton ficava preso no padrão (1/1/1)
  na web e no app. Causa: na 1.0.1 a forma ganhou `menuRecolhido` e `painelFechado` sem subir a
  `version`, e o quadro antigo não tinha esses campos. A forma era gravada sem eles, o `validate`
  recusava toda leitura e nada avisava.
- **núcleo**: `createShapeStore.write` agora roda o `validate` antes de gravar. Forma inválida não
  é gravada e gera um aviso `[skeleton-adaptativo]` no console.
- **regras**: forma completa (`!!dado.campo`), `version + 1` a cada mudança de formato, e testar com
  o dado da versão anterior (módulo skeleton e regra 8 do SKILL.md).
- **demos**: forma completa, quadro antigo ganha os campos novos, `version` 2.
- **teste**: e2e com dado e forma da 1.0.0 no storage, e nenhum aviso `[skeleton-adaptativo]` em
  nenhum caso. Unidade da gravação recusada. Os dois falharam antes do conserto.

## 1.0.1 (09/11/2026)

- **skeleton**: as demos web e React Native não aplicavam os tokens de espaçamento (card e coluna
  com 8 px fixo, RN preso nos valores de celular) e não mudavam de layout com a largura. Refeitas
  com o mesmo desenho: tokens em tudo, menu lateral recolhível a partir de 768, colunas lado a lado
  a partir de 1024, resumo recolhível. O skeleton agora também lembra menu recolhido e resumo
  fechado.
- **teste**: e2e roda em matriz (web e RN em 1280, 800 e 390 px) e ganhou o caso "a demo aplica os
  tokens daquela largura e muda o layout", que teria pegado o problema acima. Ele achou mais um:
  no RN a borda de 1 px fica dentro do card e somava no respiro (17 em vez de 16).

## 1.0.0 (09/11/2026)

Primeira versão, base do template.

- **espacamento**: os 5 valores do post do Michael Filipiuk (08/11/2026) para celular, mais
  `--grade` e `--item`, com tablet (640) e desktop (1024) derivados pela mesma lógica. Tokens em
  `codigo/espaco.css` e `codigo/espaco.ts`. Protótipos `celular.html` (sem e com lado a lado) e
  `desktop.html` (responsivo). Teste `npm run espaco` mede a distância real em 390, 800, 1280 e
  1600 px.
- **skeleton**: skeleton adaptativo (ideia do post do André Valentim, 08/11/2026). Núcleo sem
  dependência, hook React com `useSyncExternalStore`, variante cookie para `loading.tsx` do Next e
  `hydrateShapeStorage` para AsyncStorage no React Native. Demos web e RN usam os tokens de
  espaçamento. Medido: CLS 0,0000 contra 0,1242 (web desktop), 0,3363 (web celular) e 0,2723 (RN)
  do skeleton fixo.
- **pwa**: método do repo `leonardocandiani/pwa-nativo` (commit 8159c5a). Sete camadas, nove
  regras, auditor de 32 regras com 11 testes, modelos de Next, Vite, React e Supabase. Comandos do
  plugin viraram `modulos/pwa/fluxos/`.
- Corte do menu lateral em 768 px, alinhado com o pwa-nativo.

Não verificado na v1: app React Native nativo (simulador ou aparelho), adaptador MMKV, valores
de tablet e desktop com usuário real (são derivação, não medida).
