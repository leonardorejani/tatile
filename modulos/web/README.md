# Módulo web

Regras de toque, rolagem e borda da tela que valem para **toda tela web**, seja site, sistema,
protótipo ou PWA. Até a 1.3 elas moravam no módulo pwa, e quem fazia tela que não era PWA nunca
lia. Saíram de lá na 1.4.0 (10/11/2026). Código: `codigo/rolagem.css`. A base completa de casca de
app continua em `modulos/pwa/templates/css/base-nativa.css`.

Fontes: Rauno Freiberg (interfaces.rauno.me), Vercel Web Interface Guidelines, MDN
(`overscroll-behavior`, `scrollbar-color`, `scrollbar-gutter`).

## Regras

1. **Rolagem dentro de rolagem não vaza** (regra geral 10). Toda área que rola dentro de outra
   (lista, folha, modal, painel, corpo de janela) leva `overscroll-behavior: contain`. No `html`,
   `overscroll-behavior: none` só dentro de `@media (pointer: fine)`, para o celular manter o
   puxar-pra-atualizar. O auditor dá erro (`rolagem-vaza`).

   ```css
   .modal, .painel, .lista { overflow: auto; overscroll-behavior: contain }
   @media (pointer: fine) { html { overscroll-behavior: none } }
   ```
2. **Barra de rolagem fina, sem trilho, que só aparece com o mouse em cima**, como no macOS. A
   barra padrão do Windows e do Chrome é grossa, tem trilho cinza e fica sempre lá (o Leonardo
   achou "horrível", 10/11/2026). Classe `.rolagem` do `rolagem.css`:
   - `scrollbar-width: thin` e `scrollbar-color: transparent transparent`, que vira
     `var(--barra) transparent` no `:hover`. Para o Safari, o mesmo em `::-webkit-scrollbar`.
   - Tudo dentro de `@media (hover: hover) and (pointer: fine)`: no toque fica a barra do sistema,
     que já é fina e some sozinha. `:hover` fora dessa media fica preso no celular.
   - `scrollbar-gutter: stable` (classe `.rolagem-estavel`) onde a largura não pode pular quando a
     barra aparece: duas listas lado a lado, tabela com coluna alinhada, conteúdo centralizado.
   - O tema escuro vem junto: `--barra` sai do `--texto`, e o `color-scheme` do `cor.css` cuida
     das barras que não usam a classe.
3. **Controle não seleciona texto e não espera no toque.** Em `button`, `a`, `[role=button]`,
   `[role=tab]` e `[role=switch]`: `touch-action: manipulation` (sem a espera do toque duplo) e
   `user-select: none` (segurar o botão não seleciona o rótulo). Conteúdo, campo e texto que a
   pessoa possa querer copiar continuam selecionáveis. Sem o flash cinza do toque:
   `-webkit-tap-highlight-color: transparent` no `html`, com o `:active` dando o retorno.
4. **Gesto próprio tira o do navegador só onde precisa.** `touch-action: none` só na alça que
   arrasta (módulo movimento), nunca na área inteira, senão a página para de rolar.
5. **Nada embaixo do notch nem da barra de início.** Com `viewport-fit=cover`, compense com
   `env(safe-area-inset-*)`: `padding-bottom: env(safe-area-inset-bottom, 0px)` no que encosta
   embaixo (dock, folha, botão fixo) e `env(safe-area-inset-top)` no topo fixo. Sem
   `viewport-fit=cover`, o navegador já deixa a margem e não precisa de nada.

## Como aplicar

1. Copiar `codigo/rolagem.css` para o projeto (junto do `cor.css`, que define `--texto`).
2. Toda área que rola ganha a classe `.rolagem`, em vez de `overflow: auto` solto.
3. A regra 3 já vem pronta no `base-nativa.css` do pwa. Num projeto que não é PWA, copiar só o
   bloco de `button, a, [role=...]`.

## Como provar

- Auditor: `rolagem-vaza` sai sem erro.
- `npm run rolagem` (cópia de desenvolvimento): abre o Chrome **sem** a flag `--hide-scrollbars`
  (`ignoreDefaultArgs: ['--hide-scrollbars']`) e compara os pixels da faixa da barra, com o mouse
  fora e em cima. O Playwright sem janela esconde as barras por padrão, e aí nenhum print prova
  como ela ficou: todo teste que precisa ver a barra abre assim.
- No aparelho: lista no fim e arrastar mais um pouco, a tela de fora não anda.
