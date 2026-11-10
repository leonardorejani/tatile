# Módulo skeleton adaptativo

Ideia (post do Andre Valentim, 08/11/2026): o skeleton nao e um desenho fixo. Ele
redesenha a **forma** que a tela tinha na ultima visita daquele usuario. Se o card
estava em "Produzindo", o fantasma aparece em "Produzindo". Se o menu estava
recolhido, o skeleton ja nasce recolhido. Quando o dado chega, nada se mexe.

Medido nas demos desta skill (Chromium, mesmo estado de tela). O Google
considera ruim um CLS acima de 0,1:

| Demo | CLS skeleton fixo | CLS adaptativo |
|---|---|---|
| Web 1280 / 800 / 390 px | 0,1091 / 0,2906 / 0,1955 | 0,0000 nas três |
| React Native 1280 / 800 / 390 px | 0,1091 / 0,2872 / 0,1920 | 0,0000 nas três |

Em todas, cada card do skeleton fica na posição do card real com diferença menor que 1px, e a
demo aplica os tokens do módulo espacamento daquela largura (o e2e mede).

## Quando usar e quando nao

- **Usar:** tela cuja estrutura varia muito entre usuarios e pouco entre visitas
  do mesmo usuario. Kanban, setlist, repertorio, lista de contatos, pipeline,
  dashboard com blocos opcionais.
- **Nao usar:** tela com layout fixo (a forma e sempre a mesma, o skeleton fixo
  ja acerta). Tela cujo dado ja fica em cache local (React Query persistido,
  Zustand com AsyncStorage): ai mostrar o dado em cache e revalidar e melhor que
  qualquer skeleton.

## Regras

1. **Guardar so a forma, nunca o conteudo.** Contagens, flags (`temImagem`,
   `recolhido`), ids de coluna. Nada de nome, texto, telefone. Forma nao e dado
   pessoal e nao mostra informacao velha.
2. **Chave por tela e por usuario:** `shape:<tela>:<userId>`. Sem userId, quem
   troca de conta no mesmo aparelho herda a forma do outro.
3. **`version` no store, e sobe a cada mudanca de formato.** Campo novo, campo
   renomeado, campo removido: `version + 1` no mesmo commit. A forma antiga vira
   fallback uma vez, em vez de ficar recusada para sempre. (Na 1.0.1 desta skill o
   formato mudou sem subir a versao e o skeleton travou no padrao para quem ja
   tinha usado.)
4. **Forma completa.** A funcao que monta a forma (`toShape`) preenche todo campo
   com valor do tipo certo: `!!dado.recolhido`, `dado.itens ?? []`. Dado vindo de
   versao antiga nao tem o campo novo, `undefined` some no JSON e a forma deixa de
   passar no `validate`. Sempre passar `validate` ao store: ele recusa gravar forma
   invalida e avisa no console `[skeleton-adaptativo] forma ... invalida`. Esse aviso
   e bug, nunca ruido.
5. **Teto de itens** com `capCount` (padrao 6). Lista de 200 nao vira 200 blocos.
6. **Fallback sempre:** primeira visita, storage bloqueado, JSON corrompido,
   forma vencida (30 dias) caem no skeleton padrao, sem erro.
7. **Gravar no update otimista**, nao so quando o servidor responde. E isso que
   faz o reload logo depois de arrastar um card ja mostrar a forma nova.
8. **Skeleton e componente real com as mesmas medidas.** Mesma classe de altura,
   padding e gap do card de verdade, todos vindos de `codigo/espaco.css` (ou
   `espaco.ts` no RN), do módulo espacamento. Se o skeleton tiver altura propria, a forma
   certa nao adianta.
9. **Transicao:** crossfade curto (150 a 200 ms, opacidade). Com
   `prefers-reduced-motion`, sem animacao no pulso.

## Codigo pronto

Copiar para o projeto (ex.: `lib/skeleton/`), sem dependencia:

- `codigo/shape-store.ts` (na raiz da skill): `createShapeStore`, `parseShape`, `capCount`,
  `cookieStorage`. Tudo em try/catch, funciona no servidor (devolve null).
- `codigo/use-adaptive-shape.ts`: hook React com `useSyncExternalStore`
  (sem erro de hidratacao no Next).

Uso tipico:

```tsx
type Forma = { recolhido: boolean; colunas: { id: string; cards: boolean[] }[] }
const PADRAO: Forma = { recolhido: false, colunas: [/* o skeleton fixo de hoje */] } // constante de modulo

// Forma completa: todo campo com valor do tipo certo, mesmo vindo de dado antigo (regra 4)
const toForma = (d: Dados): Forma => ({
  recolhido: !!d.recolhido,
  colunas: (d.colunas ?? []).map(c => ({ id: c.id, cards: c.cards.slice(0, capCount(c.cards.length)).map(k => !!k.capa) })),
})
const isForma = (x: unknown): x is Forma =>
  !!x && typeof (x as Forma).recolhido === 'boolean' && Array.isArray((x as Forma).colunas)

// version: subir a cada mudanca no tipo Forma (regra 3)
const store = useMemo(() => createShapeStore<Forma>({ key: 'planejador', version: 1, userId, validate: isForma }), [userId])
const forma = useAdaptiveShape(store, PADRAO, dados ? toForma(dados) : null)
return dados ? <Quadro dados={dados} /> : <QuadroSkeleton forma={forma} />
```

## Por stack

**Vite + React Query (SPA):** o caminho mais simples. `localStorage` + hook.
`current` = `query.data ? toForma(query.data) : null`. Com `onMutate` otimista, a
forma ja sai certa.

**Next, pagina `'use client'` que busca no cliente:** igual ao Vite. O primeiro
render do servidor mostra `PADRAO` e, logo no primeiro efeito do cliente, troca
para a forma salva. Se esse pisco incomodar, usar a variante com cookie abaixo.

**Next, Server Component + `loading.tsx`:** o `loading.tsx` roda no servidor e nao
ve `localStorage`. Gravar a forma em cookie (`storage: cookieStorage()`) e ler no
servidor:

```tsx
// app/(app)/pipeline/loading.tsx
import { cookies } from 'next/headers'
const raw = (await cookies()).get(shapeKey('pipeline', userId))?.value
const forma = parseShape<Forma>(raw, { version: 1, validate: isForma }) ?? PADRAO
return <PipelineSkeleton forma={forma} />
```

Cookie vai em todo request e tem teto de ~4 KB: forma pequena (contagens), e
`shapeKey` sem userId se o loading.tsx nao tiver o usuario a mao (cookie ja e por
navegador).

**Expo / React Native:** o hook e o mesmo (`useSyncExternalStore` existe no RN).
O problema e o AsyncStorage ser assincrono, e o skeleton precisar da forma no
primeiro render. Duas saidas:

1. **AsyncStorage (o que o WPads ja usa):** `hydrateShapeStorage` le todas as
   chaves `shape:` uma vez, enquanto a splash ainda esta na tela, e devolve um
   storage sincrono. Grava na memoria na hora e no disco em segundo plano.

   ```tsx
   // index.js / _layout.tsx
   SplashScreen.preventAutoHideAsync()
   const shapeStorage = await hydrateShapeStorage(AsyncStorage)
   // passar shapeStorage por contexto e esconder a splash
   // na tela:
   const store = useMemo(() => createShapeStore<Forma>({ key: 'setlist', version: 1, userId, validate: isForma, storage: shapeStorage }), [userId])
   ```

2. **MMKV (ja e sincrono):** biblioteca chave-valor do WeChat para React Native
   (`react-native-mmkv`). Le na hora, no mesmo render, e e bem mais rapida que o
   AsyncStorage. Exige build nativo no Expo (nao roda no Expo Go). Adaptador direto,
   sem hidratar.

   ```ts
   const storage = { getItem: k => mmkv.getString(k) ?? null, setItem: (k, v) => mmkv.set(k, v), removeItem: k => mmkv.delete(k) }
   ```

O skeleton e um `View` com o mesmo `StyleSheet` de altura, padding e gap do card
real (regra 7). Se os dados da tela ja vem de store persistida local (Zustand com
AsyncStorage), nao precisa de skeleton: mostrar a store e pronto.

## Como provar que funcionou

A skill tem uma demo e o teste que mede, no navegador real:

```bash
cd ~/.claude/skills/tatile
npm install            # uma vez (.npmrc ja tem legacy-peer-deps)
npm run build && npm run unit && npm run e2e
HOST=0.0.0.0 npm run demo   # http://localhost:4870/ e, no celular, http://<ip-do-mac>:4870/
```

`npm run e2e` roda 6 vezes: web e React Native (componentes RN pelo
react-native-web, AsyncStorage real), cada um em 1280, 800 e 390 px. As duas demos
tem o mesmo desenho: menu lateral recolhivel a partir de 768, colunas lado a lado a
partir de 1024, resumo recolhivel, e todo espaco vindo de `codigo/espaco.css` (web)
ou `espacoPara(useWindowDimensions().width)` (RN). A pagina inicial da demo tem botoes com carregamento de 1,5s, 3s e 5s, e
cada demo tem um botao Recarregar, para o teste manual no aparelho.

O e2e cobre: quem ja usava a versao anterior (quadro e forma antigos no storage)
volta a ter skeleton adaptativo, nenhuma forma recusada no console, tokens de espacamento aplicados e layout certo na largura, forma repetida depois de mexer (cards, resumo fechado, menu recolhido), posicao exata dos cards (< 1px), CLS
zero contra o fixo, isolamento por usuario, versao, teto de 6, JSON corrompido,
storage bloqueado e zero erro de console. Na unidade, `hydrateShapeStorage`:
so chaves `shape:`, leitura sincrona, gravacao chegando no disco, reabrir o app
e disco com erro sem rejeicao solta.

O que nao foi rodado: o app nativo de verdade (simulador ou aparelho) e o
adaptador MMKV. O RN foi medido pelo react-native-web.

Para levar ao projeto, o teste minimo e o mesmo raciocinio em Playwright:
carregar, mexer na tela, recarregar com atraso, ler os retangulos do skeleton,
esperar o conteudo, comparar os retangulos e conferir CLS < 0,01 com
`PerformanceObserver({ type: 'layout-shift' })`. Teste que nao compara com o
skeleton fixo nao prova nada.

Tres casos que o teste do projeto precisa ter, alem do caminho feliz:

1. **Usuario que ja usava:** semear o storage com o dado e a forma da versao
   anterior, abrir, mexer, recarregar e conferir que o skeleton bate com o real.
   Navegador limpo esconde o bug mais comum (rodou verde aqui e travou para o
   Leonardo, que tinha dado antigo).
2. **Nenhum aviso `[skeleton-adaptativo]` no console** em nenhum caso.
3. **Skeleton em cada largura que o produto atende** (390, 800, 1280), porque a
   forma e a mesma mas as medidas mudam.

## Onde encaixa nos projetos

O levantamento por projeto fica em `modulos/skeleton/projetos.local.md`, que nao vai pro repo publico.
