# Módulo forma

Raio, sombra, contorno, alinhamento óptico e área de toque. Fontes: Jakub Krehel e Vercel.
Aprovado na 1.1 (09/11/2026). Código: `codigo/forma.css` e `RAIO` / `raioDentro` em
`codigo/tokens.ts`.

## Regras

1. **Raio concêntrico.** O raio de dentro é o de fora menos o padding, nunca menor que 4.
   Raio igual por dentro e por fora é o que mais faz a tela parecer "off".
   - Web: `--raio-dentro: max(4px, calc(var(--raio-card) - var(--pad)))`. Como `--pad` muda com a
     tela, o raio de dentro acompanha sozinho.
   - RN: `raioDentro(RAIO.card, E.pad)`.
   - Escala: `--raio-sm` 8 (selo, campo), `--raio` 12 (botão), `--raio-card` 20 (card, folha,
     modal), `--raio-pilula`.
2. **Sombra em camadas no lugar de borda.** `--sombra-1` (card parado), `--sombra-2` (card que
   se destaca), `--sombra-3` (menu, popover, modal). Anel fino + contato + difusa: se ajusta a
   qualquer fundo. No escuro vira anel claro, que lê como borda.
3. **Contorno sutil em imagem:** 1px a 10% (preto no claro, branco no escuro), por dentro. Já
   aplicado em `img`, `video` e `.imagem`.
4. **Alinhamento óptico** (regra de revisão, não token). Quando a geometria diz centralizado e o
   olho vê torto, ajusta 1 ou 2px:
   - triângulo de play dentro de círculo: 2px pra direita
   - ícone ao lado de texto: alinhar pela altura das letras minúsculas, não pela caixa
   - texto com ícone à direita em botão: padding do lado do ícone 2px menor
5. **Área de toque maior que o ícone:** classe `.alvo`. O desenho fica pequeno, a área que recebe
   o toque tem 44px no toque e 24px com mouse.

## Provar

`npm run unit` confere os valores de raio e a conta concêntrica. A vitrine mostra canto torto
contra concêntrico, borda contra sombra, play geométrico contra óptico e a área de toque.
