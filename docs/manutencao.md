# Manutenção da tatile

O que só importa para quem mexe na própria skill. Saiu do SKILL.md na 1.4.0, para ele ficar com o
que serve na hora de fazer tela.

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

Os testes dos dois auditores vão no repo e rodam em qualquer clone, sem `npm install`:

```bash
node --test auditor/testes/auditar.test.mjs modulos/pwa/testes/auditar.test.mjs
```

O resto (`teste/`, `package.json`: demos, vitrine, protótipo e testes visuais) fica só na cópia de
desenvolvimento:

```bash
cd ~/.claude/skills/tatile
npm install          # uma vez
npm run verificar    # build, unidade, auditores, espacamento, vitrine, skeleton (web, celular, RN), movimento, barra de rolagem e protótipo
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
