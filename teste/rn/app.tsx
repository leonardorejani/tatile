// Demo React Native (componentes RN puros). Roda no Chromium via react-native-web
// para o e2e medir; no app de verdade a entrada e o index.js do Expo.
// Espacamento vem de espacoPara(largura); layout muda em 768 (menu) e 1024 (colunas).
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { capCount, createShapeStore, type ShapeStorage } from '../../codigo/shape-store'
import { useAdaptiveShape } from '../../codigo/use-adaptive-shape'
import { espacoPara, type Espaco } from '../../codigo/espaco'

type Card = { id: string; title: string; image: boolean }
type Db = { menuRecolhido: boolean; painelFechado: boolean; columns: { id: string; label: string; cards: Card[] }[] }
type Shape = { menuRecolhido: boolean; painelFechado: boolean; columns: { id: string; cards: boolean[] }[] }

export type Servidor = { load(): Promise<Db>; save(db: Db): void }
export type Config = { userId: string; fixo: boolean; version: number; storage: ShapeStorage; servidor: Servidor }

export const SEED: Db = {
  menuRecolhido: false,
  painelFechado: false,
  columns: [
    { id: 'rascunho', label: 'A fazer', cards: [{ id: 'c1', title: 'Revisar proposta', image: true }] },
    { id: 'produzindo', label: 'Em andamento', cards: [] },
    { id: 'concluido', label: 'Concluído', cards: [] },
  ],
}
const FALLBACK: Shape = { menuRecolhido: false, painelFechado: false, columns: SEED.columns.map(c => ({ id: c.id, cards: [true] })) }

// Forma COMPLETA: todo campo preenchido, mesmo se o dado veio de versao antiga sem ele
const toShape = (db: Db): Shape => ({
  menuRecolhido: !!db.menuRecolhido,
  painelFechado: !!db.painelFechado,
  columns: db.columns.map(c => ({ id: c.id, cards: c.cards.slice(0, capCount(c.cards.length)).map(k => k.image) })),
})
const isShape = (x: unknown): x is Shape =>
  !!x && typeof (x as Shape).menuRecolhido === 'boolean' && typeof (x as Shape).painelFechado === 'boolean' && Array.isArray((x as Shape).columns)

export function App({ userId, fixo, version, storage, servidor }: Config) {
  const { width } = useWindowDimensions()
  const E = espacoPara(width)
  const menuLateral = width >= 768
  const colunasLadoALado = width >= 1024
  const st = useMemo(() => estilos(E), [E])

  const store = useMemo(() => createShapeStore<Shape>({ key: 'planner', version, userId, validate: isShape, storage }), [])
  const [db, setDb] = useState<Db | null>(null)
  useEffect(() => void servidor.load().then(setDb), [])

  const remembered = useAdaptiveShape(store, FALLBACK, fixo || !db ? null : toShape(db))
  const shape = fixo ? FALLBACK : remembered
  const menuRecolhido = db ? db.menuRecolhido : shape.menuRecolhido
  const painelFechado = db ? db.painelFechado : shape.painelFechado

  const update = (next: Db) => {
    setDb(next) // otimista: a forma ja e gravada aqui
    servidor.save(next)
  }
  const move = (from: number, card: Card) => {
    if (!db) return
    const to = (from + 1) % db.columns.length
    update({
      ...db,
      columns: db.columns.map((c, i) =>
        i === from ? { ...c, cards: c.cards.filter(k => k.id !== card.id) } : i === to ? { ...c, cards: [...c.cards, card] } : c,
      ),
    })
  }
  const add = (col: number, image: boolean) => {
    if (!db) return
    const card = { id: `${Date.now()}-${Math.random()}`, title: `Tarefa ${Math.floor(Math.random() * 900 + 100)}`, image }
    update({ ...db, columns: db.columns.map((c, i) => (i === col ? { ...c, cards: [...c.cards, card] } : c)) })
  }

  const menu = (
    <View testID="menu" style={menuLateral ? [st.menuLateral, menuRecolhido && st.menuRecolhido] : st.menuTopo}>
      <Text style={st.marca}>{menuLateral && menuRecolhido ? 'A' : 'Acme'}</Text>
      {menuLateral && (
        <>
          {['Início', 'Projetos', 'Agenda', 'Equipe'].map(n => (
            <View key={n} style={[st.navItem, n === 'Projetos' && st.navAtivo]}>
              <View style={st.navIcone} />
              {!menuRecolhido && <Text style={[st.navTexto, n === 'Projetos' && st.navTextoAtivo]}>{n}</Text>}
            </View>
          ))}
          <View style={{ flex: 1 }} />
          {db ? (
            <Pressable testID="toggle-menu" style={st.recolher} onPress={() => update({ ...db, menuRecolhido: !db.menuRecolhido })}>
              <Text style={st.sub}>{db.menuRecolhido ? '>' : '< recolher'}</Text>
            </Pressable>
          ) : (
            <View style={[st.recolher, st.sk]} />
          )}
        </>
      )}
    </View>
  )

  return (
    <View style={[st.app, menuLateral && { flexDirection: 'row' }]}>
      {menu}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.rolagem}>
        <View testID="conteudo" style={st.conteudo}>
          <View testID="topo" style={st.topo}>
            <Text style={st.sub}>Semana de 10 a 16 de novembro</Text>
            <Text style={st.titulo}>Projetos {fixo ? '(fixo)' : ''}</Text>
          </View>

          <View testID="painel" style={[st.card, { marginTop: E.secao }]}>
            <View style={st.painelBarra}>
              <Text style={st.forte}>Resumo da semana</Text>
              {db ? (
                <Pressable testID="toggle-painel" style={st.botao} onPress={() => update({ ...db, painelFechado: !db.painelFechado })}>
                  <Text style={st.botaoTexto}>{db.painelFechado ? 'Abrir' : 'Recolher'}</Text>
                </Pressable>
              ) : (
                <View style={[st.sk, { width: 120, height: 36, borderRadius: 10 }]} />
              )}
            </View>
            {!painelFechado && (
              <View style={st.painelNumeros}>
                {['A fazer', 'Em andamento', 'Concluído'].map((n, i) => (
                  <View key={n} style={st.painelNumero}>
                    {db ? <Text style={st.numero}>{db.columns[i].cards.length}</Text> : <View style={[st.sk, { width: 28, height: 22 }]} />}
                    <Text style={st.sub}>{n}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View testID={db ? 'board' : 'skeleton'} style={[st.quadro, colunasLadoALado && st.quadroLinha]}>
            {(db ? db.columns : shape.columns).map((col, ci) => (
              <View key={col.id} testID="column" dataSet={{ col: col.id }} style={[st.coluna, colunasLadoALado ? st.colunaLinha : ci > 0 && { marginTop: E.secao }]}>
                <View style={st.colTitulo}>
                  <Text style={st.colNome}>{SEED.columns[ci].label}</Text>
                  {db ? <Text style={st.sub}>{(col as Db['columns'][number]).cards.length}</Text> : <View style={[st.sk, { width: 16, height: 12 }]} />}
                </View>
                {db
                  ? (col as Db['columns'][number]).cards.map(card => (
                      <View key={card.id} testID="card" style={st.card}>
                        {card.image && <View testID="cover" style={st.capa} />}
                        <View style={st.cardLinha}>
                          <Text style={[st.forte, { flex: 1 }]} numberOfLines={1}>{card.title}</Text>
                          <Pressable testID="move" style={st.botao} onPress={() => move(ci, card)}>
                            <Text style={st.botaoTexto}>mover</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  : (col as Shape['columns'][number]).cards.map((image, i) => (
                      <View key={i} testID="sk-card" style={st.card}>
                        {image && <View testID="cover" style={[st.capa, st.sk]} />}
                        <View style={st.cardLinha}>
                          <View style={[st.sk, { height: 12, width: '55%' }]} />
                        </View>
                      </View>
                    ))}
                <View style={st.acoes}>
                  {db && (
                    <>
                      <Pressable testID="add-image" style={st.botao} onPress={() => add(ci, true)}>
                        <Text style={st.botaoTexto}>+ com imagem</Text>
                      </Pressable>
                      <Pressable testID="add-text" style={st.botao} onPress={() => add(ci, false)}>
                        <Text style={st.botaoTexto}>+ texto</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View testID="footer" style={[st.card, st.rodape]}>
            <Text style={st.forte}>Próxima seção da tela: atividade recente</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// Borda do RN fica dentro da caixa: desconta do padding para o respiro visivel ser o token
const BORDA = 1

// Skeleton e card real usam os MESMOS estilos: e isso que zera o salto.
// Todo espaco sai de E (codigo/espaco.ts); so medidas internas fixas ficam aqui.
const estilos = (E: Espaco) =>
  StyleSheet.create({
    app: { flex: 1, backgroundColor: '#f6f7f9' },
    menuTopo: { height: 56, paddingHorizontal: E.margem, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e6e9ee', justifyContent: 'center' },
    menuLateral: { width: 220, paddingVertical: 24, paddingHorizontal: 12, gap: 4, backgroundColor: '#fff', borderRightWidth: 1, borderColor: '#e6e9ee' },
    menuRecolhido: { width: 72 },
    marca: { fontSize: 15, fontWeight: '700', color: '#15181d', height: 32, lineHeight: 32, paddingHorizontal: 12, marginBottom: 16 },
    navItem: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 10 },
    navAtivo: { backgroundColor: '#eef3fe' },
    navIcone: { width: 20, height: 20, borderRadius: 6, backgroundColor: '#c9d3e3' },
    navTexto: { fontSize: 15, color: '#5d6673' },
    navTextoAtivo: { color: '#2563eb', fontWeight: '600' },
    recolher: { height: 40, borderRadius: 10, backgroundColor: '#f6f7f9', alignItems: 'center', justifyContent: 'center' },
    rolagem: { paddingBottom: 120 },
    conteudo: { width: '100%', maxWidth: E.conteudoMax ?? undefined, alignSelf: 'center', padding: E.margem },
    topo: { height: 56, justifyContent: 'center' },
    titulo: { fontSize: 26, fontWeight: '700', color: '#15181d' },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: E.pad - BORDA, borderWidth: BORDA, borderColor: '#e6e9ee' },
    painelBarra: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    painelNumeros: { height: 56, marginTop: E.item, flexDirection: 'row', gap: E.grade },
    painelNumero: { flex: 1, justifyContent: 'center' },
    numero: { fontSize: 22, fontWeight: '700', color: '#15181d' },
    quadro: { marginTop: E.secao },
    quadroLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: E.grade },
    coluna: { gap: E.item },
    colunaLinha: { flex: 1, minWidth: 0 },
    colTitulo: { height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    colNome: { fontSize: 17, fontWeight: '600', color: '#15181d' },
    capa: { height: 120, borderRadius: 10, backgroundColor: '#f2622e', marginBottom: E.item },
    cardLinha: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: E.icone },
    acoes: { height: 44, flexDirection: 'row', alignItems: 'center', gap: E.item },
    botao: { minHeight: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#e8ebf0', justifyContent: 'center' },
    botaoTexto: { fontSize: 14, color: '#15181d' },
    forte: { fontSize: 15, fontWeight: '600', color: '#15181d' },
    sub: { fontSize: 13, color: '#5d6673' },
    rodape: { marginTop: E.secao, height: 96 },
    sk: { backgroundColor: '#e3e6eb', borderRadius: 6 },
  })
