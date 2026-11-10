# Módulo navegação

Fontes: Vercel, Rauno Freiberg, Emil Kowalski, Adam Argyle e @a1x45h. Aprovado na 1.1 (09/11/2026), regras 5 a 10 na 1.2 (10/11/2026). Código: `codigo/estados.ts`
(estado na URL) e `codigo/forma.css` (área de toque).

## Regras

1. **Estado da tela na URL.** Aba, filtro, busca, página e painel aberto vão pro endereço.
   Recarregar, voltar e compartilhar abrem na mesma tela. Valor igual ao padrão sai da URL, pra
   o link ficar limpo.
   - SPA: `const [aba, setAba] = useEstadoNaUrl('aba', 'todos')` (usa `replaceState`: trocar aba
     não enche o histórico).
   - Next: `useSearchParams` + `router.replace` com a mesma regra (`urlCom` monta o endereço).
   - Combina com o skeleton: a forma lembra o layout, a URL lembra onde a pessoa estava.
2. **Área de toque maior que o ícone:** 44px no toque, 24px com mouse, mesmo com o ícone de 16.
   Classe `.alvo` do `forma.css`. Entre dois alvos, no mínimo 8px.
3. **Item de menu pisca uma vez ao ser escolhido**, na cor de destaque do app (`--destaque`),
   e só então o menu fecha. Confirma a escolha. Uma piscada só: piscar várias vezes incomoda
   (decisão do Leonardo).

   ```css
   .menu-item.escolhido { animation: escolhido .32s ease-out 1 }
   @keyframes escolhido { 0%, 55% { background: var(--destaque); color: var(--destaque-texto) } 100% { background: transparent } }
   ```
4. **O que se repete muito abre sem animação** (menu de comando, menu de contexto). Animar o que a
   pessoa usa 50 vezes por dia cansa. Movimento em geral: skill `emil-design-eng`.

5. **Lista no teclado troca a seleção em 0 ms.** Menu de comando, paleta e lista de busca:
   setas movem o destaque sem transição, porque animar ali deixa tudo arrastado. O mouse só move a
   seleção em `pointermove` (não em `mouseenter`), senão a lista que rola sob o ponteiro rouba a
   seleção do teclado.
6. **Foco nunca fica coberto.** Com cabeçalho fixo, o campo focado pelo Tab para atrás dele.
   `html { scroll-padding-top: <altura do cabeçalho> }` (em token, ex.: `var(--altura-cabecalho)`).
   O anel de foco é `box-shadow` (não `outline`), para não ser cortado por `overflow: hidden`.
7. **Tabela larga mostra que dá pra rolar de lado.** Sombra na borda onde há coluna escondida, e
   some quando chega no fim. Primeira escolha: scroll-state container query
   (`container-type: scroll-state` no rolável e `@container scroll-state(scrollable: right)`).
   Fallback em JS onde não houver suporte: ouvir `scroll` e `resize`, ligar `data-sombra-dir` e
   `data-sombra-esq` conforme `scrollLeft` e `scrollWidth - clientWidth`.
8. **Cabeçalho que some ao rolar só em lista.** Rolando pra baixo ele sai em 300 ms e devolve
   espaço, qualquer subida traz de volta (tempo: `--mov-padrao`). Em tabela o cabeçalho fica
   fixo (decisão do Leonardo): a pessoa precisa ver a qual coluna o valor pertence.
9. **Submenu com triângulo de intenção.** Indo na diagonal até o submenu, o mouse passa por outro
   item e o submenu fecharia. Medir o triângulo entre o ponteiro e as bordas do submenu: dentro
   dele, o item aberto fica por ~150 ms de tolerância. Umas 40 linhas de JS. Só vale quando houver
   menu aninhado.
10. **Receita de arrastar (reordenar, kanban).** Resumo, o detalhe de gesto está na skill `gestures`.
    - Pegou: `scale(1.03)` com sombra. Limiar de 4px antes de começar (clique não vira arraste).
    - Vizinhos deslizam por FLIP em 200 ms para abrir espaço. Soltou: assenta em 250 ms.
    - Teclado: espaço pega, setas movem, espaço solta, Esc cancela. Cada passo anunciado em
      `aria-live="polite"` ("Card 3 movido para a posição 2 de 5").
    - Aplicado na demo kanban. Fontes: @a1x45h e a Vercel Web Interface Guidelines. Tempos
      citam `--mov-rapido`, `--mov-padrao` e `--curva-move` (`modulos/movimento/README.md`).

## Provar

`npm run unit` testa `lerDaUrl` e `urlCom`. A vitrine mostra a aba indo pra URL, a área de toque
e o menu piscando uma vez (o e2e confere que a animação roda 1 vez, na cor de destaque).
