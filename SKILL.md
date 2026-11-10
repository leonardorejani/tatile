---
name: tatile
description: Template vivo de padroes de design do Leonardo para sistemas, apps, PWA e sites, em versoes (espacamento, tipografia, forma, cor e tema escuro, skeleton adaptativo, estados, formularios, navegacao, movimento, PWA nativo e auditor). Usar ao criar ou revisar qualquer tela (web, desktop, celular, React Native, PWA), quando a tela parece apertada, amadora, "de site" ou "off", quando pula ao carregar (skeleton, loading.tsx, "Carregando...", spinner, CLS), ao definir espacamento, tamanho de fonte, raio, sombra, cor, tema escuro, estado vazio ou de erro, desfazer, formulario, filtro ou aba na URL, ao transformar sistema em PWA (instalar, offline, notificacao, service worker, manifesto) ou quando ele citar "tatile" (nome antigo: template_deskile).
---

# tatile

Pronúncia: ta-TÍ-le (de "tátil": o toque na interface e a sensação de usar).

Padrões de design do Leonardo, montados em módulos. Cada módulo tem origem, regras, código pronto
e teste que prova. A skill evolui por versão (`CHANGELOG.md`): a v1 é a base.

**Versão atual: 1.3.0 (10/11/2026)**

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
| pwa | App web instalável, offline, com notificação, que parece nativo no celular e no desktop | `modulos/pwa/README.md` |
| auditor | Script que acha no código do projeto onde a regra foi quebrada | `auditor/` |

Ler só o módulo que a tarefa toca. Tela nova costuma tocar espaçamento, tipografia, forma, cor e
estados. A vitrine (`teste/vitrine.html`) mostra cada técnica rodando, Antes e Depois, e o protótipo
(`teste/prototipo/`) mostra todas juntas numa tela de app, sem e com a tatile.

## Ordem quando mais de um módulo entra

1. **Casca** (pwa, camada 5): dock no celular, painel lateral a partir de 768px, área segura.
2. **Tokens**: cor, tipografia, espaçamento e forma (`codigo/*.css` na web, `codigo/*.ts` no RN)
   na casca e nas telas. Nada de número nem hex solto.
3. **Estados**: vazio, erro, otimista e o atraso do carregamento.
4. **Skeleton**: só depois dos tokens, porque copia as medidas do card real. Medida mudou, skeleton
   acompanha sozinho se os dois usam o mesmo token.
5. **Formulários e navegação**: campos, erros, estado na URL.
6. **Resto do PWA** (manifesto, service worker, instalação, notificações): independe do visual.
7. **Auditor** no fim: `node ~/.claude/skills/tatile/auditor/auditar.mjs <pasta-do-projeto>`.

## O que a tatile não repete (aponta)

Movimento, gesto e teste de pior caso já têm skill própria. A tatile não copia: quando a tarefa
cair nisso, carregar a skill certa.

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
   10/11/2026: "nunca use esses tipos de ícone e dessa forma".
10. **Rolagem dentro de rolagem não vaza.** Toda área que rola dentro de outra (lista, folha,
    modal, painel, corpo de janela) leva `overscroll-behavior: contain`: chegou no fim dela, a de
    fora não começa a andar. O auditor dá erro (`rolagem-vaza`) em `overflow: auto` ou `scroll` sem
    isso, menos em `html` e `body`. Pedido de 10/11/2026, depois de uma lista de apps no Deck
    arrastar a janela inteira junto.

## Código compartilhado

- `codigo/espaco.css`, `codigo/espaco.ts`: tokens de espaçamento (celular, tablet, desktop).
- `codigo/tipo.css`, `codigo/forma.css`, `codigo/cor.css` e `codigo/tokens.ts`: tipografia, raio,
  sombra e cor (claro e escuro). O `tokens.ts` tem `raioDentro` e `contraste`.
- `codigo/estados.ts`: `useAtrasoDeCarga`, `useEstadoNaUrl` (com núcleos sem React) e
  `trocarTemaSemTransicao`.
- `codigo/formato.ts`: `dinheiro`, `numero`, `tamanho`, `relativo`, `dataHora` em pt-BR, só ASCII nos espaços.
- `codigo/shape-store.ts`, `codigo/use-adaptive-shape.ts`: núcleo e hook do skeleton.
- `modulos/pwa/templates/`, `modulos/pwa/scripts/`: modelos e auditor do PWA.

Copiar para o projeto e ajustar. Não importar direto desta pasta.

## Referências e créditos

Só consulta de comportamento, sem copiar código. Entram quando o módulo não resolve.

- **beUI** (beui.dev, MIT): 157 componentes React e 73 React Native, estilo "menos é mais".
- **ExpoKit** (expokit.in): React Native, referência do lado RN.
- **AffectUI** (affectui.com): padrões de tela de agente de IA (linha do tempo, contexto).
- Ficaram de fora por serem estilo temático: Looseleaf, Sketchbook UI e goopUI.
- Fontes das regras: Rauno Freiberg (interfaces.rauno.me), Emil Kowalski, Vercel Web Interface
  Guidelines, Jakub Krehel, Adam Argyle, Josh Comeau.
- **unslop** (heydamir/unslop, CC BY 4.0): crédito a Damir Sokolovsky (@heydamir).
- **motion-prompt** (showheyohtaki/motion-prompt, MIT): crédito a Shohei Ohtaki.

## Verificar a própria skill

Só na cópia de desenvolvimento: `teste/`, `package.json`, `auditor/testes/` e `modulos/pwa/testes/`
ficam fora do repo público (o repo leva só a skill).

```bash
cd ~/.claude/skills/tatile
npm install          # uma vez
npm run verificar    # build, unidade, auditores, espacamento, vitrine, skeleton (web, celular, RN) e protótipo
npm run demo         # http://localhost:4870/ (no celular: http://<ip-do-mac>:4870/)
```

## Como evoluir (v2 em diante)

1. Módulo novo vira pasta em `modulos/<nome>/` com `README.md` (origem, regras, como aplicar,
   como provar) e um teste em `npm run verificar`.
2. Mudança em módulo existente: atualizar o README do módulo e o teste junto.
3. Registrar no `CHANGELOG.md` e subir a versão aqui: módulo novo ou regra que muda o resultado
   sobe o meio (1.1.0), correção de texto ou teste sobe o fim (1.0.1), mudança que quebra o que
   já foi aplicado em projeto sobe o primeiro (2.0.0).
4. Valor que veio de fonte externa (post, repo, guia) diz a fonte e a data no README do módulo.
