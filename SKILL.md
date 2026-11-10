---
name: tatile
description: Template vivo de padroes de design do Leonardo para sistemas, apps, PWA e sites, em versoes (espacamento, tipografia, forma, cor e tema escuro, skeleton adaptativo, estados, formularios, navegacao, movimento, PWA nativo e auditor). Usar ao criar ou revisar qualquer tela (web, desktop, celular, React Native, PWA), quando a tela parece apertada, amadora, "de site" ou "off", quando pula ao carregar (skeleton, loading.tsx, "Carregando...", spinner, CLS), ao definir espacamento, tamanho de fonte, raio, sombra, cor, tema escuro, estado vazio ou de erro, desfazer, formulario, filtro ou aba na URL, ao transformar sistema em PWA (instalar, offline, notificacao, service worker, manifesto) ou quando ele citar "tatile" (nome antigo: template_deskile).
---

# tatile

Pronúncia: ta-TÍ-le (de "tátil": o toque na interface e a sensação de usar).

Padrões de design do Leonardo, montados em módulos. Cada módulo tem origem, regras, código pronto
e teste que prova. A skill evolui por versão (`CHANGELOG.md`): a v1 é a base.

**Versão atual: 1.4.0 (10/11/2026)**

## Quando usar

- Criar ou revisar tela em qualquer plataforma (web, desktop, celular, React Native, PWA), inclusive
  protótipo que vai virar PWA.
- Tela que parece apertada, amadora, "de site", ou que pula ao carregar.
- Rodar o auditor num projeto.

## Módulos

| Módulo | Para quê | Ler |
|---|---|---|
| espacamento | Tela que parece "certa": margem, respiro, seções, linha, ícone e grade por tamanho de tela | `modulos/espacamento/README.md` |
| skeleton | Carregamento que repete a forma da última visita, sem a tela pular (web e React Native) | `modulos/skeleton/README.md` |
| tipografia | Escala de tamanhos, `tabular-nums` em número que muda, título equilibrado | `modulos/tipografia/README.md` |
| forma | Raio concêntrico, sombra em camadas, contorno de imagem, alinhamento óptico, área de toque | `modulos/forma/README.md` |
| cor | Cor por papel em claro e escuro, `color-scheme`, `theme-color`, contraste | `modulos/cor/README.md` |
| estados | Atraso do carregamento, UI otimista com Desfazer, ação perigosa, vazio e erro | `modulos/estados/README.md` |
| formularios | Colar liberado, teclado certo, erro do lado do campo, foco | `modulos/formularios/README.md` |
| navegacao | Estado na URL, área de toque, menu que pisca ao escolher | `modulos/navegacao/README.md` |
| movimento | Tempos, curvas e tokens de movimento (`--mov-rapido`, `--mov-padrao`, `--mov-lento`, `--curva-move`) | `modulos/movimento/README.md` |
| web | Toque, rolagem que não vaza, barra de rolagem, área segura: vale para toda tela web | `modulos/web/README.md` |
| pwa | App web instalável, offline, com notificação, que parece nativo no celular e no desktop | `modulos/pwa/README.md` |
| auditor | Script que acha no código do projeto onde a regra foi quebrada | `auditor/` |

Ler só o módulo que a tarefa toca. Tela nova costuma tocar espaçamento, tipografia, forma, cor e
estados. **Tela web (site, sistema, protótipo ou PWA) lê também o módulo web**: as regras de toque e
rolagem dele valem para qualquer tela no navegador. **Protótipo que vai virar PWA conta como PWA**:
lê o módulo pwa desde o protótipo (o painel do Deck nasceu sem ele e teve que voltar). A vitrine (`teste/vitrine.html`) mostra cada técnica rodando, Antes e Depois, e o protótipo
(`teste/prototipo/`) mostra todas juntas numa tela de app, sem e com a tatile.

## Ordem quando mais de um módulo entra

1. **Casca** (pwa, camada 5): dock no celular, painel lateral a partir de 768px, área segura.
2. **Tokens**: cor, tipografia, espaçamento e forma (`codigo/*.css` na web, `codigo/*.ts` no RN)
   na casca e nas telas. Nada de número nem hex solto. Na web, junto: `rolagem.css` e as regras de
   toque do módulo web.
3. **Estados**: vazio, erro, otimista e o atraso do carregamento.
4. **Skeleton**: só depois dos tokens, porque copia as medidas do card real. Medida mudou, skeleton
   acompanha sozinho se os dois usam o mesmo token.
5. **Formulários e navegação**: campos, erros, estado na URL.
6. **Resto do PWA** (manifesto, service worker, instalação, notificações): independe do visual.
7. **Auditor** no fim: `node ~/.claude/skills/tatile/auditor/auditar.mjs <pasta-do-projeto>`.
   Aviso acumulado: `--desde <ref>` mostra só o novo, `--estrito` falha com aviso novo.

## O que a tatile não repete (aponta)

Movimento, gesto e pior caso têm skill própria: carregar a certa.

| Assunto | Skill |
|---|---|
| Animação: decidir se anima, curva, duração, interrupção | `emil-design-eng`, `animate` |
| Mola, gesto, arraste, folha, movimento estilo Apple | `apple-design`, `gestures` |
| Web que parece app no celular (100vh, toque, zoom, teclado) | `mobile-native` |
| React Native e Expo: animação e gesto | `animate-expo` |
| Testar tela com dado de pior caso (nome longo, lista vazia, número gigante) | `break-ui` |
| Toast (aviso com Desfazer) | `ask-sonner` |

## Revisar uma tela (roteiro)

Vem do unslop. Serve para tela que já existe e "parece de template".

1. **Direção primeiro, em 5 linhas, e esperar o Leonardo aprovar** antes de mexer:
   produto (o que é e para quem), caráter em 2 ou 3 palavras concretas (proibido "limpo, moderno,
   premium"), mundo (de onde vem a referência visual), 1 ou 2 momentos ricos e 1 assinatura só
   daquele produto.
2. **Nove passes, nesta ordem**, cada um na tela inteira antes do próximo: espaço, cor, ícone,
   texto, tipo, layout, detalhe, imagem, movimento.
3. **No fim, o auditor.**
4. Tela que já está boa: no máximo 2 ou 3 refinos, sem redesenho (princípio 6).
5. Lembrar: tela limpa, no mesmo cinza, com Inter, também é template.

## Anti-padrões

| Em vez de | Fazer |
|---|---|
| Número ou hex direto na tela | token (`var(--pad)`, `var(--texto)`) |
| `overflow: auto` solto (vaza no fim, barra grossa com trilho) | classe `.rolagem` (contida, barra fina) |
| Ler só os módulos de visual numa tela web | ler o web junto, e o pwa se vai virar PWA |
| Spinner ou "Carregando..." no lugar do conteúdo | skeleton com a forma da última visita |
| Redesenhar tela que já foi aprovada | 2 ou 3 refinos, e só com pedido |
| Tela de passos, escolha ou permissão do jeito "de sempre" | seção Telas de passo e de escolha |

## Regras que valem para todos os módulos

1. **Um valor, um lugar.** Espaçamento, cor, tamanho de fonte e raio em token, forma do skeleton
   no store, regra no auditor. Copiar número para dentro de tela é o que faz o sistema desalinhar.
2. **Celular e desktop são cidadãos de primeira.** Toda tela é conferida em 390 e 1280 px, sem
   rolagem lateral, nada embaixo do notch.
3. **Capacidade, não aparelho:** `(hover: hover)`, `(pointer: fine)`, largura, `env()`, `dvh`.
4. **Nunca travar o zoom.** Campo com fonte de 16 px resolve o zoom do iPhone.
5. **Movimento reduzido respeitado** em toda animação, inclusive o pulso do skeleton.
6. **Tela aprovada não muda de visual sem pedido** (princípio 6). Tela nova já nasce no padrão.
7. **Pronto é provado:** o teste do módulo verde, print em 390 e 1280, e o que só o aparelho prova
   (notificação no iPhone, gesto) dito como pendente.
8. **Testar também quem já usava.** Tudo que fica guardado no aparelho (forma do skeleton,
   preferência, cache do service worker) é testado com o dado da versão anterior no storage, não
   só em navegador limpo. Mudou o formato do que fica guardado: sobe a versão dele.
9. **Botão com texto não leva ícone de enfeite do lado** (seta circular de atualizar, seta de
   "ir", faísca, check decorativo). O rótulo já diz a ação. Ícone só quando o botão é só ícone
   (com `aria-label`) ou quando o ícone é o estado (carregando, salvo). Decisão do Leonardo,
   10/11/2026: "nunca use esses tipos de ícone e dessa forma". O mesmo vale para lista de checks
   de enfeite: tela final não resume o que foi feito em itens com check ("remove esses 3 checks").
10. **Rolagem dentro de rolagem não vaza.** Toda área que rola dentro de outra (lista, folha,
    modal, painel, corpo de janela) leva `overscroll-behavior: contain`: chegou no fim dela, a de
    fora não começa a andar. O auditor dá erro (`rolagem-vaza`) em `overflow: auto` ou `scroll` sem
    isso, menos em `html` e `body`. Detalhe e barra de rolagem: módulo web. Pedido de 10/11/2026, depois de uma lista de apps no Deck
    arrastar a janela inteira junto.

## Telas de passo e de escolha

Preferências do Leonardo (10/11/2026, configuração inicial do Deck):

1. **Tela de passos (onboarding, wizard) fica no centro**, na largura e na altura. Lista numerada
   também fica no centro, mas o texto alinha à esquerda, junto do número.
2. **Escolha de layout mostra prévia de verdade** (print da tela naquele layout), nunca desenho
   abstrato: "não tem como o usuário adivinhar".
3. **Tela final sem lista de checks de resumo** (regra 9): diz o que vem agora e tem um botão.
4. **Permissão do sistema pelo nome que o sistema usa** (Automação, Acesso Total ao Disco,
   Acessibilidade), com o motivo na legenda. Nome amigável inventado parece invasivo e a pessoa
   não acha o item nos Ajustes.

## Checklist de entrega

Antes de dizer que a tela está pronta:

**Leitura**
- [ ] Módulos que a tela toca lidos, o web em toda tela no navegador, o pwa se ela vai virar PWA.
- [ ] Tela que já existe: roteiro de revisão, com a direção aprovada antes de mexer.

**Valores e forma**
- [ ] Espaço, cor, fonte, raio e sombra em token. Nenhum hex nem px solto.
- [ ] Botão com texto sem ícone de enfeite, tela final sem checks de resumo.
- [ ] Tela de passos no centro, prévia real em escolha de layout, permissão pelo nome do sistema.

**Rolagem e toque**
- [ ] Toda área que rola usa `.rolagem` (contida, barra fina só com o mouse em cima).
- [ ] Largura que não pode pular tem `scrollbar-gutter: stable`.
- [ ] Área de toque de 44 px no celular, hover dentro de `(hover: hover)`.
- [ ] Campo com 16 px e zoom liberado. Nada embaixo do notch.

**Estados, tema e movimento**
- [ ] Carregando com skeleton na forma certa, sem a tela pular.
- [ ] Vazio, erro e desfazer no que apaga.
- [ ] Claro e escuro conferidos, `theme-color` dos dois.
- [ ] Movimento reduzido respeitado, nada animando no que se repete muito.

**Prova**
- [ ] Auditor sem erro, e sem aviso novo com `--desde`.
- [ ] Print em 390 e 1280 px.
- [ ] Quem já usava testado com o dado da versão anterior no storage.
- [ ] O que só o aparelho prova (notificação no iPhone, gesto) dito como pendente.

## Problemas comuns

| Sintoma | Causa | O que fazer |
|---|---|---|
| Print do teste não mostra a barra de rolagem | Playwright sem janela usa `--hide-scrollbars` | `chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] })` |
| Auditor com dezenas de avisos e ninguém olha | aviso antigo acumulado | `--desde <ref>`, e `--estrito` no `verificar.sh` |
| Cor que precisa ser literal aparece como `cor-solta` | lugar que não aceita `var()` | `theme-color` já fica de fora; outro caso, `tatile-ignorar` na linha |
| Hover fica preso depois do toque no celular | `:hover` fora de `(hover: hover)` | regra `hover-sem-mouse` do auditor |
| iPhone dá zoom ao focar o campo | fonte do campo menor que 16 px | 16 px no campo, nunca travar o zoom |
| Tela pula ao carregar | skeleton com medida diferente do card | os dois usam o mesmo token (módulo skeleton) |
| Regra nova no auditor quebra o teste dele | falta a linha dela em `POR_REGRA` | acrescentar a contagem dela na fixture ruim |

## Código compartilhado

Código pronto em `codigo/` e modelos do PWA em `modulos/pwa/templates/`. Cada módulo diz qual
arquivo usa. Copiar para o projeto e ajustar, não importar desta pasta.

## Manutenção da skill

Referências externas para quando o módulo não resolve (beUI, ExpoKit, AffectUI), créditos, como
verificar a própria skill e como subir versão: `docs/manutencao.md`. Os testes dos auditores rodam em qualquer clone:
`node --test auditor/testes/auditar.test.mjs modulos/pwa/testes/auditar.test.mjs`.
