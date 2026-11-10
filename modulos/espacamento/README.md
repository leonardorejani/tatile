# Módulo espaçamento

Origem: post do Michael Filipiuk (designer, ex-lead de design da Wander), 08/11/2026: "se o seu
app mobile parece errado e você não sabe por quê, provavelmente é o espaçamento". O vídeo
ajusta 5 medidas da mesma tela de celular e ela muda de cara. Os valores de tablet e desktop não
estão no post: seguem a mesma lógica, escalada para tela maior e mouse (decisão da v1).

## A regra

**O espaço cresce de dentro pra fora:** ícone-texto < respiro do card < distância entre cards <
margem da tela < distância entre seções. Quando tudo tem o mesmo valor ("12 em tudo"), o olho não
acha os grupos e a tela parece apertada mesmo sobrando espaço.

## Valores por tamanho de tela

| Medida | Sem a regra (celular) | Celular < 640 | Tablet 640 a 1023 | Desktop >= 1024 |
|---|---|---|---|---|
| Margem da tela (`--margem`) | 12 | **20** | 32 | 40 |
| Respiro do card (`--pad`) | 12 | **16** | 20 | 24 |
| Entre seções (`--secao`) | 12 | **32** | 40 | 56 |
| Altura mínima da linha (`--linha`) | 44 | **60** | 56 | 52 |
| Ícone e texto (`--icone`) | 8 | **12** | 12 | 12 |
| Entre cards lado a lado (`--grade`) | 12 | 12 | 16 | 24 |
| Título da seção ao conteúdo (`--item`) | 8 | 8 | 8 | 12 |
| Largura máxima do conteúdo | - | 100% | 100% | 1200 |

Negrito: valor do post. O resto é derivado. No protótipo desktop, o "sem a regra" é 16 em tudo
(linha 44, ícone 8).

- **Linha mais baixa no desktop:** mouse é mais preciso que dedo, a lista pode ser mais densa.
  Nunca abaixo de 44 (área de toque mínima em tela de toque, e tablet é toque).
- **Largura máxima de 1200 no desktop:** em monitor largo, linha de texto e lista esticadas até
  a borda ficam ilegíveis. O conteúdo centraliza e a margem continua 40.
- **Monitor grande (pedido de 10/11/2026):** 3 faixas acima do desktop. A largura que conta é a
  de CSS, que já vem dividida pela escala do sistema: 4K a 150% do Windows vira 2560 e cai na
  faixa do QHD. 4K a 100% (3840) é a única tela em que o pixel fica minúsculo, por isso a última
  faixa sobe espaço e texto juntos.

  | Medida | Full HD >= 1600 | QHD >= 2200 | 4K >= 3000 |
  |---|---|---|---|
  | `--margem` | 48 | 64 | 80 |
  | `--pad` | 24 | 28 | 32 |
  | `--secao` | 64 | 72 | 88 |
  | `--linha` | 52 | 56 | 64 |
  | `--icone` | 12 | 14 | 16 |
  | `--grade` | 24 | 32 | 40 |
  | `--item` | 12 | 16 | 20 |
  | Largura máxima | 1440 | 1760 | 2240 |
  | Texto base / título (`tipo.css`) | 15 / 36 | 16 / 42 | 18 / 48 |

  Nunca deixar o conteúdo esticar até a borda (lista de 3800 px ninguém lê) nem ficar preso em
  1200 no meio de um monitor de 2560 (vira uma tira). No protótipo, Aparelho tem Full HD, QHD e 4K.
- **Menu:** dock embaixo no celular, painel lateral a partir de **768px** (mesmo corte do módulo
  pwa, regra 7 dele). O corte do menu não precisa ser o mesmo dos espaçamentos.

## Onde está o valor

Nunca copiar número solto em tela. Os valores moram em dois arquivos, que o teste mantém iguais:

- `codigo/espaco.css`: custom properties com os 3 cortes (640 e 1024). Web, Next, Vite, PWA.
- `codigo/espaco.ts`: `ESPACO.celular | tablet | desktop` e `espacoPara(largura)`. React Native
  (`espacoPara(useWindowDimensions().width)`) e JS que precisa do número.

Tailwind (v3 ou v4), mapear para as variáveis em vez de usar `px-5`, `gap-8` soltos:

```js
// tailwind.config: theme.extend.spacing
{ margem: 'var(--margem)', pad: 'var(--pad)', secao: 'var(--secao)', linha: 'var(--linha)',
  icone: 'var(--icone)', grade: 'var(--grade)', item: 'var(--item)' }
// uso: px-margem, p-pad, mt-secao, min-h-linha, gap-icone, gap-grade
```

## Como aplicar num projeto

1. Achar onde cada medida vive hoje (token de tema, classes Tailwind, `StyleSheet`). Trocar no
   token, nunca tela por tela.
2. Seção é o grupo com título ("Setlist", "Equipe"). Título ao conteúdo: `--item`. Entre seções:
   `--secao`.
3. `--linha` é altura **mínima**. Texto em duas linhas cresce (com título e subtítulo a linha já
   pede ~44).
4. Mudar espaçamento de tela que o dono já aprovou é mudança de visual: só com pedido dele
   (princípio 6). Tela nova já nasce com os tokens.
5. Conferir com print em 390 e 1280, sem rolagem lateral e nada embaixo do notch.

## Conflito com a regra global

A regra global do Leonardo (ui-ux-pro-max, 20/10/2026) fala em "8 dentro do bloco, 16 a 24 entre
blocos". Aqui "bloco" é o card ou item dentro da seção (`--grade`, 12 a 24) e "seção" é o grupo
com título (`--secao`, 32 a 56). Se numa tela real os dois brigarem, perguntar qual ele quer.

## Ver e provar

- `teste/espacamento/celular.html`: um celular, e o Sem/Com anima os 5 espaçamentos no lugar (o
  mesmo comportamento do desktop). Chips marcam cada medida e mostram o px atual.
- `teste/espacamento/tablet.html`: moldura de tablet (820 x 1180) com a tela responsiva dentro.
  Retrato usa os tokens de tablet, paisagem (1180) os de desktop. Sem/Com animado e chips com o px.
- `teste/espacamento/desktop.html`: tela responsiva lendo o `espaco.css` de verdade. Arrastar a
  janela mostra celular, tablet e desktop. Chips marcam cada medida e mostram o px atual.
- `npm run espaco`: mede no Chromium a distância real entre os elementos em 390, 800, 1280 e
  1600 px e compara com `espaco.ts`. Também confere o menu em 767/768, o "sem a regra" e o
  protótipo do celular nas duas versões, inclusive um valor intermediário no meio da animação.
