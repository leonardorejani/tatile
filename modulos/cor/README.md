# Módulo cor

Cor por papel, claro e escuro. Fontes: Vercel e Steve Schoger (dica do cinza sobre fundo
colorido, lida por resumo). Aprovado na 1.1 (09/11/2026), regra 9 na 1.2 (10/11/2026, Josh Comeau e Emil Kowalski). Código: `codigo/cor.css` e `COR` em
`codigo/tokens.ts`.

## Regras

1. **Componente nunca usa hex.** Usa o papel: `--fundo`, `--superficie`, `--superficie-2`,
   `--borda`, `--texto`, `--texto-2`, `--texto-3`, `--destaque`, `--destaque-texto`,
   `--destaque-suave`, `--perigo`, `--sucesso`, `--aviso` (e os `-suave`). Trocar o tema muda só
   os tokens.
2. **Neutros sem matiz** (R=G=B). O escuro é cinza escuro (#1C1C1C), nunca azulado. Regra do
   Leonardo.
3. **Tema:** segue o sistema. `data-tema="claro"` ou `data-tema="escuro"` no `<html>` força um
   dos dois.
4. **`color-scheme` e `theme-color` certos.** O `cor.css` já põe `color-scheme: dark` no escuro,
   então barra de rolagem, lista do select e campos nativos ficam escuros. No `<head>`, um
   `theme-color` pra cada tema (barra do celular e janela do PWA):

   ```html
   <meta name="theme-color" content="#F7F7F7" media="(prefers-color-scheme: light)">
   <meta name="theme-color" content="#1C1C1C" media="(prefers-color-scheme: dark)">
   ```

   No Windows o `select` perde contraste no escuro sem cor explícita: o `cor.css` já define.
5. **Cinza tingido sobre fundo colorido.** Texto de apoio em cima de `--destaque` usa
   `--destaque-texto-2`, que puxa o matiz do fundo. Cinza puro sobre azul fica sujo.
6. **Contraste mínimo:** 4,5 em todo texto, 3 só em texto grande (`--texto-3`). O teste confere
   cada par nos dois temas.
7. **Destaque é por projeto.** Troque `--destaque` e `--destaque-texto` pela cor da marca e rode
   `npm run unit`: se o contraste cair, o teste avisa.
8. **Área grande de cor usa `--destaque-bloco`, não `--destaque`.** No escuro o `--destaque` fica
   claro (azul 400 com texto escuro) porque é feito pra botão, link e texto. Num banner ou card
   inteiro esse azul claro acende a tela. O `--destaque-bloco` fica fundo nos dois temas, com
   `--destaque-bloco-texto` branco e `--destaque-bloco-texto-2` para o texto de apoio.

9. **Troca de tema sem tudo deslizando.** Cada parte da tela tem a sua transição de cor, e na
   troca claro/escuro tudo muda em ritmo diferente. Desliga as transições por um quadro: classe
   `sem-transicao` no `<html>`, aplica o tema e tira a classe depois de dois `requestAnimationFrame`.
   Regra CSS em `codigo/cor.css` e função `trocarTemaSemTransicao(aplicar)` em `codigo/estados.ts`.

## Provar

`npm run unit` confere `cor.css` contra `COR` (claro, escuro do sistema e escuro forçado) e o
contraste de 10 pares por tema.
