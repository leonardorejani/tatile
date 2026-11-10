# Módulo tipografia

Fontes: Jakub Krehel ("Details that make interfaces feel better") e Vercel Web Interface
Guidelines, mais Adam Argyle (`text-box`). Aprovado na 1.1 (09/11/2026), regras 6 a 8 na 1.2 (10/11/2026). Código: `codigo/formato.ts`.

## Regras

1. **Tamanho só da escala.** `codigo/tipo.css` (web) e `TIPO` em `codigo/tokens.ts` (RN). Título
   cresce com a tela, texto de leitura fica em 15.

   | Token | Celular | Tablet | Desktop | Uso |
   |---|---|---|---|---|
   | `--texto-xs` | 12 | 12 | 12 | selo, legenda |
   | `--texto-sm` | 13 | 13 | 13 | apoio, metadado |
   | `--texto-base` | 15 | 15 | 15 | leitura |
   | `--texto-md` | 17 | 17 | 17 | título de card e de seção |
   | `--texto-lg` | 20 | 20 | 22 | título de bloco |
   | `--texto-xl` | 24 | 26 | 28 | título de página |
   | `--texto-2xl` | 28 | 32 | 36 | título principal |

   Altura de linha: 1.5 no texto, 1.2 no título. Título com tracking de -0.02em.
2. **Número que muda ou fica em coluna usa `tabular-nums`.** Preço, contador, relógio, placar,
   tabela. Todo dígito com a mesma largura, então nada treme quando o valor muda. O `tipo.css`
   já aplica em `.numero`, `time`, `td`, `[data-numero]` e `input[type=number]`. No RN:
   `fontVariant: ['tabular-nums']`.
3. **Título com `text-wrap: balance`, parágrafo com `text-wrap: pretty`.** O título quebra em
   linhas do mesmo tamanho. O parágrafo não deixa uma palavra sozinha na última linha. Balance só
   em título: em bloco grande ele deixa as linhas desiguais.
4. **Texto nítido no macOS:** `-webkit-font-smoothing: antialiased` no `html` (já no `tipo.css`).
5. **Caracteres na interface: ASCII** (decisão do Leonardo, 09/11/2026). "..." no lugar de "…", e
   aspas retas. A regra global de escrita dele vence a recomendação da Vercel.

6. **Formato brasileiro com `Intl`, nunca à mão.**
   `new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` dá "R$ 1.000,50".
   `new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })` dá "ontem", "há 3 min". Tempo
   relativo vem sempre com a data exata no `title` ("09/11/2026 18:21").
   - O `Intl` põe espaço especial (U+00A0 e U+202F) depois de "R$" e antes de unidade.
     Decisão do Leonardo: trocar por espaço comum. Quem faz isso é `codigo/formato.ts`
     (`dinheiro`, `numero`, `tamanho`, `relativo`, `dataHora`).
   - O número não quebra de linha por CSS, não pelo caractere: `.numero { white-space: nowrap }`.
7. **Texto no centro exato de pílula, botão e chip.** `text-box: trim-both cap alphabetic` corta
   o espaço vazio de cima e de baixo da letra. Sem isso o texto fica 1 a 2px abaixo do meio. Com
   `@supports`, e o padding vertical sobe 2px para compensar:

   ```css
   @supports (text-box: trim-both cap alphabetic) {
     .pilula, .botao, .chip { text-box: trim-both cap alphabetic; padding-block: 8px }
   }
   ```
8. **Aguentar texto ampliado em 200%.** Cerca de 1 em cada 3 pessoas aumenta a letra no celular.
   Caixa com texto usa `min-height`, nunca `height` fixa. Testar a tela com a fonte do navegador
   em 200% (e o zoom do texto do sistema no celular): nada cortado, nada sobreposto.

## Provar

`npm run unit` confere `tipo.css` contra `TIPO` nas três telas. A vitrine (`teste/vitrine.html`)
mostra escala, `tabular-nums` e balance rodando.

`npm run unit` roda também `teste/formato.test.ts`: cada função do `codigo/formato.ts`, inclusive
que a saída não tem U+00A0 nem U+202F. O resto (`text-box`, 200%) é revisão na tela.
