# Exemplo real: Deck (10/11/2026)

Protótipo do painel do Deck (`~/Projetos/leos_enterprise/deck`, `prototipo/mac.css`), commit
`99de86e`. As linhas abaixo são as de verdade, antes e depois. Daqui saíram a regra geral 10, o
módulo web e a seção Telas de passo e de escolha.

## 1. Rolagem que vazava

A lista de apps dentro dos Ajustes chegava no fim e a janela inteira andava junto.

```css
/* antes */
.j-corpo { overflow: auto; padding: var(--item) var(--margem) var(--margem); display: grid; align-content: start; gap: var(--secao); scrollbar-width: thin }
.lista-busca { max-height: 236px; overflow: auto; display: grid; gap: var(--item); align-content: start; padding-right: var(--micro); scrollbar-width: thin }

/* depois */
.j-corpo { overflow: auto; overscroll-behavior: contain; padding: var(--item) var(--margem) var(--margem); display: grid; align-content: start; gap: var(--secao); scrollbar-width: thin }
.lista-busca { max-height: 300px; overflow: auto; overscroll-behavior: contain; display: grid; gap: var(--item); align-content: start; padding-right: var(--micro); scrollbar-width: thin }
```

Hoje o auditor pega o "antes" sozinho (`rolagem-vaza`, erro), e o jeito curto é a classe `.rolagem`
do `codigo/rolagem.css`, que já traz a barra fina que só aparece com o mouse em cima.

## 2. Configuração inicial: tela de passos

Antes, o conteúdo começava no topo e alinhado à esquerda. Depois, centralizado na largura e na
altura. A lista numerada fica no centro, mas o texto de cada passo alinha à esquerda, junto do
número:

```css
/* antes */
.ini-corpo { padding: var(--secao) var(--secao) var(--pad); overflow: auto; display: grid; align-content: start; gap: var(--pad) }

/* depois */
.ini-corpo { padding: var(--secao) var(--secao) var(--pad); overflow: auto; overscroll-behavior: contain; display: grid; align-content: center; justify-items: center; text-align: center; gap: var(--pad) }
.ini-corpo > h2 { margin: 0; font-size: var(--texto-xl); text-wrap: balance }

/* lista numerada: número numa coluna, texto na outra, alinhado à esquerda */
.passos-c li { display: grid; grid-template-columns: var(--selo) minmax(0, 1fr); column-gap: var(--icone); row-gap: var(--item); counter-increment: passo }
.passos-c li::before { content: counter(passo); grid-row: span 3; width: var(--selo); height: var(--selo); border-radius: 50%; background: var(--superficie-2); color: var(--texto-2); font-size: var(--texto-xs); font-weight: 700; display: grid; place-items: center; font-variant-numeric: tabular-nums }
.passos-c li > * { grid-column: 2 }
```

No mesmo commit, também pedidos por ele:

- **Escolha de composição com prévia real:** `prototipo/previas/comp-a.jpg` e `comp-b.jpg` (print da
  tela), no lugar do desenho abstrato.
- **Pronto sem a lista de checks** de resumo.
- **Acessos pelo nome do macOS** (Automação, Acesso Total ao Disco), com o motivo na legenda, num
  passo próprio.

## 3. Auditor no projeto com aviso acumulado

```bash
node ~/.claude/skills/tatile/auditor/auditar.mjs ~/Projetos/leos_enterprise/deck
# 24 arquivos, 0 erros, 49 avisos

node ~/.claude/skills/tatile/auditor/auditar.mjs ~/Projetos/leos_enterprise/deck --desde HEAD
# 24 arquivos, 0 erros, 0 avisos novos desde HEAD (49 antigos fora da lista)
```

No `verificar.sh` do projeto: `--desde origin/main --estrito`, e aí só o aviso que o PR trouxe
derruba a verificação.
