# Módulo movimento

Como a interface se mexe: quanto dura, com qual curva, o que anima e o que só troca. Movimento bom
é o que a pessoa não percebe: explica o que mudou e some. Fontes: motion-prompt
(showheyohtaki/motion-prompt, MIT, números citados em cada receita), Emil Kowalski e Jakub Krehel.
Código: `codigo/movimento.css` (web) e `codigo/movimento.ts` (JS e React Native). Vitrine:
`teste/movimento/index.html`.

Este módulo guarda os **valores** e as **receitas**. Decidir se anima, mola e gesto fino ficam nas
skills `animate`, `emil-design-eng`, `apple-design` e `gestures` (ver SKILL.md).

## Regras

1. **Tokens por papel, nunca número solto.** Duração e curva vêm de variável. Entrar é mais lento
   que sair (saída a 70%), porque a pessoa já decidiu e não espera.

   | Papel | Entrada | Saída | Usar em |
   |---|---|---|---|
   | `--mov-rapido` | 180 ms | `--mov-sai-rapido` 130 ms | hover, apertar, liga/desliga |
   | `--mov-padrao` | 320 ms | `--mov-sai-padrao` 220 ms | aba, acordeão, aviso, modal |
   | `--mov-lento` | 480 ms | `--mov-sai-lento` 340 ms | painel de baixo, lista para detalhe |

   | Curva | Valor | Usar em |
   |---|---|---|
   | `--curva-move` | `cubic-bezier(.65,0,.35,1)` | padrão: acelera e desacelera gradual, para tudo que já está na tela e muda de lugar ou tamanho |
   | `--curva-entra` | `cubic-bezier(.22,1,.36,1)` | o que chega: modal, painel, aviso |
   | `--curva-sai` | `cubic-bezier(.32,0,.67,0)` | o que vai embora |
   | `--curva-salto` | `cubic-bezier(.34,1.56,.64,1)` | só confirmação pequena (check, like) e a mola do painel |
   | `linear` | | só barra de tempo, skeleton e giro contínuo de spinner |

   Quando usar: sempre. Quando não usar: não inventar duração nova para uma tela. Se nenhum papel
   serve, o papel está errado, não o token. Outros tokens: `--mov-icone` 200 ms, `--mov-contar`
   600 ms, `--mov-cascata` 80 ms, `--veu-modal` (preto a 42%). Valor igual nos dois lados: o teste
   `movimento.test.ts` confere `MOV` e `CURVA` contra o CSS.

2. **Modal: cresce de 0,9 para 1 com fade, fundo a 42%.** Abre em `--mov-padrao` com
   `--curva-entra`, fecha em `--mov-sai-padrao` com `--curva-sai`. Anima só `opacity` e
   `transform`. A visibilidade troca com atraso igual à saída, para o fade terminar antes do
   `visibility: hidden`. Origem do crescimento: o centro (modal) ou o botão que abriu (popover).
   Quando usar: confirmação e formulário curto que interrompem. Quando não usar: aviso que não
   precisa de resposta (use o aviso, regra 4). Fonte: motion-prompt #049.

3. **Painel de baixo (bottom sheet): segue o dedo, tem elástico no topo.**
   - Sobe em `--mov-lento` com `--curva-entra`, sai em `--mov-sai-lento` com `--curva-sai`.
   - Arrastando, acompanha o dedo 1:1 (sem transição enquanto o dedo está na tela).
   - Fecha ao puxar para baixo além de **30% da altura** ou com velocidade acima de ~0,6 px/ms
     (arremesso). Soltou antes: volta.
   - **Puxar para cima, além do topo, tem elástico.** A resistência cresce com a distância
     (`elastico(distancia, limite)`, limite 80 px: puxar 120 anda uns 36) e ao soltar volta com
     mola (`--mov-lento` com `--curva-salto`, passa um pouco e assenta). O fundo do painel se
     prolonga para baixo (`::after` de 200 px) para não abrir vão ao esticar.
   - `touch-action: none` na alça, senão o navegador rouba o gesto para rolar a página.
   - Eventos: `pointerdown`, `pointermove`, `pointerup`, `pointercancel` com
     `setPointerCapture`. Um código só serve mouse e toque.

   ```ts
   sheet.style.transform = `translateY(${dy >= 0 ? dy : -elastico(-dy, 80)}px)`
   ```

   Quando usar: ação secundária no celular (compartilhar, filtros, escolher). Quando não usar:
   fluxo longo (vira tela) e desktop com mouse (vira popover ou modal). Fonte: motion-prompt #051,
   com o elástico pedido pelo Leonardo.

4. **Aviso com barra de tempo.** Sobe 16 px com fade em `--mov-padrao`, e uma barra de **3 px**
   esvazia em `linear` durante o tempo que o aviso fica (3 s). A barra mostra quanto falta para
   sumir, e por isso é o único lugar onde linear é certo. Aviso com Desfazer fica 5 s (módulo
   estados). Quando não usar: erro que a pessoa precisa ler, que fica até ela fechar. Fonte:
   motion-prompt #056.

5. **Indicador de aba e seletor que desliza.** Um indicador só, que anda de uma aba para outra
   (`transform: translateX` e `width` com `--mov-padrao` e `--curva-move`), no lugar de um traço
   que some numa aba e aparece na outra. Medir com `offsetLeft` e `offsetWidth` do botão ativo, e
   no primeiro posicionamento desligar a transição para ele não voar da esquerda. Quando usar:
   abas, segmentado, menu com marcador. Quando não usar: lista de links de navegação entre
   páginas, que troca a tela inteira. Fonte: motion-prompt #057 e #060.

6. **Liga/desliga.** A bolinha anda por `transform: translateX` e o fundo troca de cor, os dois em
   `--mov-rapido` com `--curva-move`. Nunca animar `left`. Quando não usar: opção que só vale
   depois de "Salvar" (isso é checkbox, não interruptor). Fonte: motion-prompt #059.

7. **Acordeão liso.** A reclamação era "meio travado". A causa: o `padding-bottom` do conteúdo
   mudava na hora (sem transição) e o `grid-template-rows` animava com curva curta, então a altura
   andava e o padding dava um tranco no fim. Receita:
   - Corpo com `display: grid`, `grid-template-rows: 0fr` para `1fr`, em `--mov-padrao` com
     `--curva-move`.
   - O filho direto tem `overflow: hidden; min-height: 0`.
   - **O padding fica num filho interno que nunca muda.** Nada de padding no corpo animado.
   - O conteúdo faz fade de `opacity` na mesma duração e curva.
   - A seta gira com a mesma duração e curva (`rotate(45deg)` para `225deg`).

   ```css
   .acd-corpo { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--mov-padrao) var(--curva-move); }
   .acd-item.aberto .acd-corpo { grid-template-rows: 1fr; }
   .acd-miolo { overflow: hidden; min-height: 0; }
   .acd-conteudo { padding: 0 0 12px; opacity: 0; transition: opacity var(--mov-padrao) var(--curva-move); }
   .acd-item.aberto .acd-conteudo { opacity: 1; }
   ```

   Prova: o e2e mede a altura a cada quadro e exige que cresça sem recuar, em mais de 8 quadros
   intermediários, sem salto maior que 40% do total, com o padding do conteúdo igual antes e
   depois. Fonte: motion-prompt #052.

8. **Botão que carrega: a pill fecha até virar círculo.** A demo antiga trocava o `padding` de
   `auto`, e `auto` não anima, então o botão pulava. Receita:
   1. Medir a largura atual (`offsetWidth`) e fixar em px, forçando um reflow antes de animar.
   2. Animar `width` até a altura (círculo) com `--curva-move` em `--mov-padrao`. O rótulo some
      com fade rápido junto.
   3. Só quando a largura termina (`getAnimations()` e `finished`), o spinner entra com fade.
   4. Terminou: o fundo vira verde, o check se desenha (`stroke-dashoffset` de 1 para 0 com
      `pathLength="1"`), depois "Salvo".
   5. A largura volta ao valor original, animada, e o botão limpa o `width` inline.

   `width` é aceitável aqui porque é um único botão e muda o layout em volta de forma mínima. A
   alternativa, `clip-path`, não reflui o texto nem a vizinhança, então o círculo ficaria com o
   espaço da pill. Em lista de botões, animar `transform: scaleX` em vez de `width`.
   Quando não usar: ação que responde em menos de 200 ms (módulo estados, regra 1). Fonte:
   motion-prompt #160.

9. **Número que conta.** Ao mudar o valor, conta do antigo ao novo em 600 ms com ease-out cúbico
   (`contarValor(de, para, t)`), sempre com `font-variant-numeric: tabular-nums` para os dígitos
   não tremerem. Quando usar: total, saldo, contador que o usuário olha mudar. Quando não usar:
   número em tabela ou lista que muda aos montes, e valor que tem que ser lido na hora (preço no
   pagamento). Fonte: motion-prompt #007.

10. **Troca de ícone com desfoque.** Vale para todo ícone clicável de estado (copiar vira check,
    salvar, favoritar, silenciar): dois ícones empilhados na mesma célula. O que sai vai a
    `opacity: 0`, `scale(.25)`, `blur(4px)` e o que entra faz o inverso, 200 ms. Classe
    `.troca-icone` (filho 1 é o repouso, filho 2 é o ativo), ligada por `aria-pressed="true"` no
    botão ou `data-ativo="true"`. Não é para ícone decorativo que nunca muda. Fonte: Jakub Krehel.

11. **Lista para detalhe: a foto viaja, e na volta faz o mesmo ao contrário.** Técnica FLIP: medir
    a miniatura (First), medir a imagem grande já no lugar (Last), animar `transform` da imagem
    grande da posição da miniatura até `none`, em `--mov-lento` com `--curva-move`. Para voltar,
    **a mesma animação ao contrário** (`quadros.reverse()`), terminando na miniatura, e só depois
    esconder o detalhe. A volta pelo botão do sistema ou o gesto também. Miniatura e imagem com a
    mesma proporção (16:9), senão o raio e a imagem deformam. Com suporte, a View Transitions API
    (`document.startViewTransition` e `view-transition-name` igual nos dois lados) faz o mesmo
    nas duas direções, com o FLIP como reserva. Fonte: motion-prompt #161.

12. **Cabeçalho que some ao descer e volta ao subir: só em lista.** Em lista (mensagens, feed,
    cards) o cabeçalho sai ao rolar para baixo (`translateY(-100%)`, `--mov-padrao`,
    `--curva-move`) e volta ao rolar para cima, ignorando movimento menor que 4 px. **Em tabela o
    cabeçalho fica fixo** (`position: sticky; top: 0` nas `th`), para a pessoa não se perder nas
    colunas. Regra do Leonardo, vale para toda tela com colunas. Fonte: motion-prompt #149.

13. **Entrada em cascata com desfoque: só onboarding e tela vazia.** 80 ms entre itens
    (`--mov-cascata`, `animation-delay: calc(var(--i) * var(--mov-cascata))`), subindo 8 px e
    saindo de `blur(8px)`, `--mov-lento` com `--curva-entra`, **no máximo 6 itens**. Quando não
    usar: lista de dados que o usuário abre todo dia, tela de uso repetido, e qualquer lista que
    recarrega (seria espera disfarçada de efeito).

14. **Retorno ao apertar: encolhe para 0,97.** Padrão para todo botão e ícone clicável
    (`.apertavel`, `transform: scale(.97)` em `:active`, `--mov-rapido`). A onda (ripple, círculo
    que cresce do ponto do toque) fica documentada como segunda opção e só entra quando o
    Leonardo pedir: ela pede um elemento a mais por botão e cortar com `overflow: hidden`, que
    some com sombra e anel de foco. Fonte: motion-prompt #158, Emil Kowalski.

15. **Reduced motion: tudo vira troca direta.** `@media (prefers-reduced-motion: reduce)` leva
    todos os `--mov-*` a `0.01ms`, então tudo que usa token troca sem animar e nada quebra (não
    usar `0`, que cancela `transitionend`). Animação que não passa por token (a barra do aviso,
    o giro do spinner) é desligada à mão na mesma media query. Código em JS lê a duração do CSS
    (`getComputedStyle(...).getPropertyValue('--mov-padrao')`) ou de `MOV`, e pula a animação
    quando `matchMedia('(prefers-reduced-motion: reduce)').matches`.

## Provar

- `npm run unit` roda `teste/movimento.test.ts`: `MOV` e `CURVA` iguais ao CSS, saída a ~70% da
  entrada, reduced motion zerando todas as durações, `elastico` e `contarValor`.
- `node teste/e2e-movimento.mjs` abre a vitrine e mede o movimento de verdade: tokens aplicados,
  acordeão sem salto, pill até círculo antes do spinner, painel com elástico e que fecha ao puxar
  60%, foto da lista indo e voltando, cabeçalho some só na lista, reduced motion e 390 px sem
  rolagem lateral.
- Pendente de aparelho real: sensação do elástico e da mola no toque e a velocidade de arremesso
  do painel. Conferir no iPhone antes de dar como aprovado.

## Créditos

motion-prompt (showheyohtaki/motion-prompt, MIT): #049 modal, #051 painel de baixo, #052 acordeão,
#056 aviso, #057 e #060 indicador, #059 liga/desliga, #160 botão, #007 número, #161 lista para
detalhe, #149 cabeçalho, #158 rótulo e retorno ao apertar. Emil Kowalski (curvas, saída mais curta
que entrada, retorno ao apertar) e Jakub Krehel (troca de ícone com desfoque, cascata). Valores
ajustados pelo Leonardo em 10/11/2026: curva padrão mais lenta e gradual, elástico no painel,
cabeçalho fixo em tabela, o mesmo caminho na volta da lista.
