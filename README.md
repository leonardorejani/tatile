<!-- readme-padrao:header -->
<div align="center">
  <img src="docs/readme/banner.svg" alt="tatile: padrões de interface para sistemas, apps e PWA" width="100%" />
</div>

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=20&duration=2800&pause=900&color=60A5FA&center=true&vCenter=true&width=820&lines=Espa%C3%A7o+que+cresce+de+dentro+pra+fora;Skeleton+que+lembra+a+forma+da+tela;Movimento+com+prop%C3%B3sito;Auditor+que+acha+o+que+quebrou" alt="Espaço que cresce de dentro pra fora" />
</div>

<div align="center">

  <p><strong>Uma skill do Claude Code que ensina o agente a fazer tela que parece feita por designer.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/vers%C3%A3o-1.4.0-1A2740?style=for-the-badge&labelColor=0B1220" alt="versão 1.4.0" />
    <img src="https://img.shields.io/badge/Claude_Code-skill-0B1220?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude Code skill" />
    <img src="https://img.shields.io/badge/TypeScript-CSS-0B1220?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript e CSS" />
      <img src="https://img.shields.io/badge/licen%C3%A7a-MIT-1A2740?style=for-the-badge&labelColor=0B1220" alt="licença MIT" />
  </p>

  <p>
    <a href="#por-que-existe">Por que existe</a> •
    <a href="#o-que-faz">O que faz</a> •
    <a href="#como-funciona">Como funciona</a> •
    <a href="#stack">Stack</a> •
    <a href="#rodar-local">Rodar local</a> •
    <a href="#documentação">Documentação</a> •
    <a href="#licença">Licença</a>
  </p>
</div>

<br>

<div align="center">
  <img src="docs/readme/demo.gif" alt="A mesma tela de pedidos sem e com a tatile, trocando aparelho e tema" width="100%" />
</div>

## O que é

```yaml
produto:   skill do Claude Code com padrões de interface em módulos, cada um com regras, valores e código pronto
quem_usa:  quem constrói sistema, app ou PWA com o Claude Code e quer tela com acabamento
estado:    1.4.0, usada nos projetos do autor e evoluindo por versão
```

<!-- /readme-padrao:header -->

## Por que existe

Tela feita por IA costuma sair com a mesma cara: espaço igual em tudo, gradiente roxo, skeleton que
não bate com o conteúdo, número que treme, animação que não diz nada. Corrigir isso tela por tela,
em cada projeto, é repetir as mesmas conversas. A tatile junta essas decisões num lugar só, com os
valores e o código pronto, cada módulo testado antes de entrar. O agente lê o módulo que a tarefa toca e
aplica.

O nome vem de "tátil": a sensação de usar a interface. Pronúncia: ta-TÍ-le.

## O que faz

- **Espaçamento por tamanho de tela.** O espaço cresce de dentro pra fora (ícone, card, grade,
  margem, seção), com tokens para celular, tablet, desktop, Full HD, QHD e 4K.
- **Skeleton adaptativo.** O carregamento repete a forma que a tela tinha na última visita (quantos
  cards, menu aberto ou fechado), na web e no React Native, sem a tela pular.
- **Tipografia, forma e cor.** Escala em tokens, `tabular-nums`, raio concêntrico, sombra em
  camadas, cor por papel em claro e escuro com contraste testado, formato brasileiro de dinheiro e
  data.
- **Estados.** Carregamento que só aparece se demorar, ação otimista com Desfazer, segurar pra
  confirmar, vazio e erro com próxima ação.
- **Movimento.** Tempos e curvas por papel, modal, painel de baixo com elástico, botão que vira
  carregando, troca de ícone, lista para detalhe, tudo respeitando "reduzir movimento".
- **Formulários e navegação.** Colar liberado, erro do lado do campo, estado na URL, foco que nunca
  fica escondido, arrastar card com mouse, toque e teclado.
- **Web.** Rolagem que não vaza para a área de fora, barra de rolagem fina que só aparece com o
  mouse em cima, toque sem espera e nada embaixo do notch, em qualquer tela no navegador.
- **PWA nativo.** Instalar, offline, notificação e casca que parece app no celular e no desktop.
- **Auditor.** Script que lê o código do projeto e aponta valor solto, zoom travado, colar bloqueado,
  gradiente colorido, emoji na interface, hover que gruda no celular, rolagem que vaza e outros
  sinais. Com `--desde <ref>` mostra só o que é novo.

## Como funciona

```
SKILL.md                 o agente lê primeiro: módulos, ordem de aplicação, regras gerais
modulos/<nome>/README.md origem, regras numeradas com valores, como aplicar, como provar
codigo/                  tokens (CSS e TS espelhados), skeleton, estados, movimento, formato
auditor/                 node auditor/auditar.mjs <pasta-do-projeto>
```

Cada regra está numerada no README do módulo dela, com o valor e o porquê. A lista inteira vem
logo abaixo.

## As regras

São **13 grupos de regras** e uma **fase de teste e verificação** da aplicação. Clique no grupo
para abrir.

<details>
<summary><b>1. Princípios gerais</b> (valem para tudo)</summary>

1. Um valor, um lugar: tudo em token, nada de número ou cor solta na tela.
2. Celular e desktop são cidadãos de primeira: toda tela conferida em 390 e 1280 px.
3. Capacidade, não aparelho: decidir por hover, ponteiro e largura, não por "é celular".
4. Nunca travar o zoom.
5. Movimento reduzido sempre respeitado.
6. Tela aprovada não muda de visual sem pedido.
7. Pronto é provado: teste verde e print, e o que só o aparelho prova é dito como pendente.
8. Testar também quem já usava, com o dado da versão anterior guardado no aparelho.
9. Botão com texto não leva ícone de enfeite, e tela final não tem lista de checks de resumo.
10. Rolagem dentro de rolagem não vaza para a área de fora.

</details>

<details>
<summary><b>2. Telas de passo e de escolha</b></summary>

1. Tela de passos (onboarding, wizard) fica no centro. A lista numerada tem o texto alinhado à
   esquerda, junto do número.
2. Escolha de layout mostra o print de verdade, nunca desenho abstrato.
3. Tela final sem resumo em checks.
4. Permissão do sistema pelo nome que o sistema usa, com o motivo na legenda.

</details>

<details>
<summary><b>3. Espaçamento</b></summary>

1. O espaço cresce de dentro para fora: ícone e texto, respiro do card, distância entre cards,
   margem da tela, distância entre seções.
2. Valores por tamanho de tela (celular, tablet, desktop, Full HD, QHD e 4K), sempre em token.

</details>

<details>
<summary><b>4. Tipografia</b></summary>

1. Tamanho só da escala.
2. Número que muda ou fica em coluna usa largura fixa (`tabular-nums`).
3. Título equilibrado, parágrafo sem palavra sozinha na última linha.
4. Texto nítido no macOS.
5. Caracteres da interface em ASCII.
6. Data, dinheiro e número no formato brasileiro, pelo `Intl`.
7. Texto no centro exato de botão, pílula e chip.
8. Aguentar texto ampliado em 200%.

</details>

<details>
<summary><b>5. Forma</b></summary>

1. Raio concêntrico: o de dentro é o de fora menos o respiro.
2. Sombra em camadas no lugar de borda dura.
3. Contorno sutil em imagem.
4. Alinhamento pelo olho, não pela régua.
5. Área de toque maior que o ícone.

</details>

<details>
<summary><b>6. Cor</b></summary>

1. Componente nunca usa hex.
2. Neutros sem matiz.
3. Tema segue o sistema, com opção de forçar.
4. `color-scheme` e `theme-color` certos nos dois temas.
5. Cinza tingido sobre fundo colorido.
6. Contraste mínimo de 4,5.
7. Cor de destaque é por projeto.
8. Área grande de cor usa um tom próprio.
9. Trocar de tema sem tudo deslizando.

</details>

<details>
<summary><b>7. Estados</b></summary>

1. Carregamento só aparece se demorar, e não some num piscar.
2. A tela reage na hora e oferece Desfazer.
3. Ação perigosa: segurar para confirmar, ou Desfazer.
4. Vazio e erro sempre com a próxima ação.
5. Botão que recarrega mostra o carregamento nele mesmo.
6. Hover só com mouse, e discreto.
7. Dica em botão de barra de ferramentas.
8. Lista clicável sem vão entre os itens.
9. Menu abre ao apertar, não ao soltar.
10. Card de número com rótulo, valor e variação com referência.
11. Um clique, uma ação.
12. Desfazer volta ao estado anterior, não a um valor fixo.
13. Segurar para confirmar também tem caminho pelo teclado.

</details>

<details>
<summary><b>8. Formulários</b></summary>

1. Nunca bloquear colar.
2. Teclado e preenchimento automático certos.
3. Campo com fonte de 16 px.
4. Rótulo sempre visível.
5. Botão de enviar liberado até o envio começar.
6. Erro do lado do campo, dizendo como corrigir.
7. Formulário longo salva rascunho.
8. Botão e menu dizem o que vai acontecer.
9. Rótulo que sobe para o canto do campo.
10. Campo válido ganha um check com leve salto.
11. Botão desabilitado diz o porquê.

</details>

<details>
<summary><b>9. Navegação</b></summary>

1. Estado da tela na URL.
2. Área de toque maior que o ícone.
3. Item de menu pisca uma vez ao ser escolhido.
4. O que se repete muito abre sem animação.
5. Lista no teclado troca a seleção na hora.
6. Foco nunca fica coberto pelo cabeçalho.
7. Tabela larga mostra que dá para rolar de lado.
8. Cabeçalho que some ao rolar, só em lista.
9. Submenu que não fecha no caminho do mouse.
10. Receita de arrastar (reordenar, kanban).
11. Estado vindo da URL é validado.
12. Modal e painel: Esc fecha, o foco entra e volta, o fundo fica parado.
13. Abas com o papel certo para leitor de tela.

</details>

<details>
<summary><b>10. Movimento</b></summary>

1. Tempo e curva em token, nunca número solto.
2. Modal cresce de 0,9 para 1, com o fundo a 42%.
3. Painel de baixo segue o dedo e tem elástico no topo.
4. Aviso com barra de tempo.
5. Indicador de aba que desliza.
6. Liga/desliga.
7. Acordeão liso.
8. Botão que carrega vira círculo.
9. Número que conta.
10. Troca de ícone com desfoque.
11. Da lista para o detalhe, a foto viaja junto, e na volta faz o caminho contrário.
12. Cabeçalho que some ao descer e volta ao subir, só em lista.
13. Entrada em cascata, só no onboarding e na tela vazia.
14. Botão encolhe para 0,97 ao apertar.
15. Com movimento reduzido, tudo vira troca direta.

</details>

<details>
<summary><b>11. Skeleton adaptativo</b></summary>

1. Guarda só a forma, nunca o conteúdo.
2. Uma forma por tela e por usuário.
3. O formato guardado tem versão.
4. Forma completa.
5. Teto de itens.
6. Sempre tem um padrão quando não há forma guardada.
7. Grava a forma também na atualização otimista.
8. Skeleton e tela real com as mesmas medidas.
9. Transição suave quando o dado chega.

</details>

<details>
<summary><b>12. Web</b></summary>

1. Rolagem dentro de rolagem não vaza.
2. Barra de rolagem fina, sem trilho, que só aparece com o mouse em cima.
3. Controle não seleciona texto e responde ao toque sem espera.
4. Gesto próprio desliga o do navegador só onde precisa.
5. Nada embaixo do notch nem da barra de início.

</details>

<details>
<summary><b>13. PWA</b></summary>

1. Nunca travar o zoom.
2. Pedir notificação só depois de um toque da pessoa.
3. Ligou a notificação, testou.
4. A chave privada nunca vai para o navegador nem para o repositório.
5. iPhone só recebe notificação com o app instalado.
6. Estilo por capacidade, não por aparelho.
7. Desktop é cidadão de primeira.
8. Nenhum número inventado na notificação.
9. Nada irreversível rodando em tarefa agendada.

Montado em 7 camadas, nesta ordem: manifesto e ícones, service worker, instalação, notificações,
casca nativa, dados e offline, verificação.

</details>

### Teste e verificação da aplicação

Regra escrita não basta: cada uma tem como ser provada no projeto.

- **Auditor da tatile:** 16 checagens automáticas no código do projeto (valor solto, cor solta,
  zoom travado, colar bloqueado, foco removido, rolagem que vaza e outras). Sai com erro quando
  acha uma quebra grave. `--desde <ref>` mostra só o que é novo, e `--estrito` também falha com
  aviso novo.
- **Auditor do PWA:** 32 checagens de manifesto, service worker, notificação, instalação,
  acabamento nativo e desktop.
- **Como provar, por módulo:** cada README de módulo diz o teste e o print que provam a regra.
- **Checklist de entrega:** 17 itens conferidos antes de dizer que a tela está pronta.
- **Testes dos próprios auditores** dentro deste repo, rodando em qualquer clone.

## Stack

| Camada | O que usa |
|---|---|
| Regras | Markdown lido pelo Claude Code (`SKILL.md` e `modulos/`) |
| Código | CSS com custom properties, TypeScript sem dependência, hooks React |
| React Native | `react-native-web` nas demos, `AsyncStorage` ou MMKV no skeleton |

## Rodar local

Instalar como skill do Claude Code:

```bash
git clone https://github.com/leonardorejani/tatile ~/.claude/skills/tatile
```

Pronto. O Claude Code carrega a skill quando a tarefa toca tela, ou quando você cita "tatile".
Para conferir um projeto contra as regras, sem instalar nada:

```bash
node ~/.claude/skills/tatile/auditor/auditar.mjs <pasta-do-projeto>
```

Os testes dos dois auditores vêm junto e rodam sem instalar nada:

```bash
node --test auditor/testes/auditar.test.mjs modulos/pwa/testes/auditar.test.mjs
```

Protótipos, demos e testes visuais ficam na cópia de desenvolvimento do autor, fora deste repo.
Onde um README de módulo cita `teste/`, é essa cópia.

## Documentação

| Doc | O que é |
|---|---|
| [`SKILL.md`](SKILL.md) | Entrada da skill: módulos, ordem, roteiro de revisão de tela |
| [`modulos/`](modulos/) | Um README por módulo, com as regras e os valores |
| [`CHANGELOG.md`](CHANGELOG.md) | O que mudou em cada versão |
| [`auditor/`](auditor/) | Script que confere o projeto e as regras dele |
| [`exemplos/`](exemplos/) | Antes e depois real de um projeto onde a tatile foi aplicada |
| [`docs/manutencao.md`](docs/manutencao.md) | Créditos, como verificar e como subir versão |

## Licença

MIT. Veja o arquivo [LICENSE](LICENSE).

Créditos de fontes de terceiros: o módulo `modulos/pwa` vem do
[pwa-nativo](https://github.com/leonardocandiani/pwa-nativo) de Leonardo Candiani (MIT, com o
`LICENSE` original na pasta do módulo). A lista de sinais de "cara de IA" adapta o
[unslop](https://github.com/heydamir/unslop) de Damir Sokolovsky (CC BY 4.0). Os tempos de movimento
citam o [motion-prompt](https://github.com/showheyohtaki/motion-prompt) de Shohei Ohtaki (MIT). Os
valores de espaçamento do celular vêm de um post do Michael Filipiuk. Regras de acabamento citam
Rauno Freiberg, Emil Kowalski, Jakub Krehel, Adam Argyle, Josh Comeau e as Web Interface Guidelines
da Vercel. Cada módulo diz a fonte e a data.

<!-- readme-padrao:footer -->
<br>

---

<div align="center">
  <p><strong>Feito por <a href="https://github.com/leonardorejani">Leonardo Rejani</a></strong></p>
  <a href="https://github.com/leonardorejani">
    <img src="https://img.shields.io/badge/-GitHub-0B1220?style=for-the-badge&logo=github&logoColor=60A5FA" alt="GitHub" />
  </a>
  <a href="https://instagram.com/leonardorejani">
    <img src="https://img.shields.io/badge/-Instagram-0B1220?style=for-the-badge&logo=instagram&logoColor=60A5FA" alt="Instagram" />
  </a>
</div>

<br>

<div align="center">
  <img src="docs/readme/rodape.svg" alt="Obrigado pela visita!" width="100%" />
</div>
<!-- /readme-padrao:footer -->
