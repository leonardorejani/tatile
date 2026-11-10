// Demo web: planejador com carregamento lento. ?u=<usuario> ?delay=<ms> ?modo=fixo ?v=<versao> ?storage=cookie
// Espacamento todo vem de codigo/espaco.css; o layout muda em 768 (menu) e 1024 (colunas).
import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { capCount, cookieStorage, createShapeStore } from '../../codigo/shape-store'
import { useAdaptiveShape } from '../../codigo/use-adaptive-shape'
import { comVaga, useArrastar } from './arrastar'

type Card = { id: string; title: string; image: boolean }
type Db = { menuRecolhido: boolean; painelFechado: boolean; columns: { id: string; label: string; cards: Card[] }[] }
type Shape = { menuRecolhido: boolean; painelFechado: boolean; columns: { id: string; cards: boolean[] }[] }

const params = new URLSearchParams(location.search)
const userId = params.get('u') ?? 'a'
const delay = Number(params.get('delay') ?? 1200)
const fixo = params.get('modo') === 'fixo'
// 2: a forma ganhou menuRecolhido e painelFechado na 1.0.1. Mudou o formato, sobe a versao.
const version = Number(params.get('v') ?? 2)
const storage = params.get('storage') === 'cookie' ? cookieStorage() : undefined

const SEED: Db = {
  menuRecolhido: false,
  painelFechado: false,
  columns: [
    { id: 'rascunho', label: 'A fazer', cards: [{ id: 'c1', title: 'Revisar proposta', image: true }] },
    { id: 'produzindo', label: 'Em andamento', cards: [] },
    { id: 'concluido', label: 'Concluído', cards: [] },
  ],
}

// O skeleton fixo de sempre: 1 card com imagem por coluna, tudo aberto
const FALLBACK: Shape = { menuRecolhido: false, painelFechado: false, columns: SEED.columns.map(c => ({ id: c.id, cards: [true] })) }

// "Servidor": guarda o quadro por usuario e responde com atraso
const dbKey = `demo-db:${userId}`
function loadDb(): Promise<Db> {
  let db: Db = SEED
  try {
    db = { ...SEED, ...JSON.parse(localStorage.getItem(dbKey) ?? 'null') } // quadro antigo ganha os campos novos
  } catch {}
  return new Promise(r => setTimeout(() => r(db), delay))
}
function saveDb(db: Db) {
  try {
    localStorage.setItem(dbKey, JSON.stringify(db))
  } catch {}
}

// Forma COMPLETA: todo campo preenchido, mesmo se o dado veio de versao antiga sem ele
const toShape = (db: Db): Shape => ({
  menuRecolhido: !!db.menuRecolhido,
  painelFechado: !!db.painelFechado,
  columns: db.columns.map(c => ({ id: c.id, cards: c.cards.slice(0, capCount(c.cards.length)).map(k => k.image) })),
})

const isShape = (x: unknown): x is Shape =>
  !!x && typeof (x as Shape).menuRecolhido === 'boolean' && typeof (x as Shape).painelFechado === 'boolean' && Array.isArray((x as Shape).columns)

function App() {
  const store = useMemo(() => createShapeStore<Shape>({ key: 'planner', version, userId, validate: isShape, storage }), [])
  const [db, setDb] = useState<Db | null>(null)
  useEffect(() => void loadDb().then(setDb), [])

  const remembered = useAdaptiveShape(store, FALLBACK, fixo || !db ? null : toShape(db))
  const shape = fixo ? FALLBACK : remembered
  const menuRecolhido = db ? db.menuRecolhido : shape.menuRecolhido
  const painelFechado = db ? db.painelFechado : shape.painelFechado

  const update = (next: Db) => {
    setDb(next) // otimista: a forma ja e gravada aqui, antes do "servidor" responder
    saveDb(next)
  }
  const dnd = useArrastar(db, update)
  const shown = dnd.board
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
    const card = { id: crypto.randomUUID(), title: `Tarefa ${Math.floor(Math.random() * 900 + 100)}`, image }
    update({ ...db, columns: db.columns.map((c, i) => (i === col ? { ...c, cards: [...c.cards, card] } : c)) })
  }

  return (
    <div className="app">
      <aside className={`menu ${menuRecolhido ? 'recolhido' : ''}`} data-testid="menu">
        <div className="marca">A<span>cme</span></div>
        <nav aria-label="Navegacao">
          {['Início', 'Projetos', 'Agenda', 'Equipe'].map(n => (
            <a key={n} href="#" className={n === 'Projetos' ? 'ativo' : ''} onClick={e => e.preventDefault()}>
              <i aria-hidden="true" />
              <span>{n}</span>
            </a>
          ))}
        </nav>
        {db ? (
          <button className="recolher" data-testid="toggle-menu" onClick={() => update({ ...db, menuRecolhido: !db.menuRecolhido })}>
            {db.menuRecolhido ? '>' : '< recolher'}
          </button>
        ) : (
          <div className="recolher sk" />
        )}
      </aside>

      <main>
        <div className="conteudo" data-testid="conteudo">
          <header className="topo" data-testid="topo">
            <div>
              <small>Semana de 10 a 16 de novembro</small>
              <h1>Projetos {fixo ? '(fixo)' : ''}</h1>
            </div>
          </header>

          <div className="espaco" />

          <section className="card" data-testid="painel">
            <div className="painel-barra">
              <strong>Resumo da semana</strong>
              {db ? (
                <button className="botao" data-testid="toggle-painel" onClick={() => update({ ...db, painelFechado: !db.painelFechado })}>
                  {db.painelFechado ? 'Abrir' : 'Recolher'}
                </button>
              ) : (
                <span className="sk sk-botao" />
              )}
            </div>
            {!painelFechado && (
              <div className="painel-numeros">
                {['A fazer', 'Em andamento', 'Concluído'].map((n, i) => (
                  <div key={n}>
                    {db ? <b>{db.columns[i].cards.length}</b> : <span className="sk" style={{ width: 28, height: 22 }} />}
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="espaco" />

          <div className="quadro" ref={dnd.rootRef} data-testid={db ? 'board' : 'skeleton'}>
            {(shown ? shown.columns : shape.columns).map((col, ci) => (
              <section className="coluna" key={col.id} data-col={col.id} data-testid="column">
                <div className="col-titulo">
                  <h2>{db ? (col as Db['columns'][number]).label : SEED.columns[ci].label}</h2>
                  {db ? <span>{(col as Db['columns'][number]).cards.length}</span> : <span className="sk" style={{ width: 16, height: 12 }} />}
                </div>
                {db
                  ? comVaga((col as Db['columns'][number]).cards, dnd.drag, ci).map(card =>
                      card ? (
                        <article key={card.id} {...dnd.props(card.id)} className={`card ${dnd.props(card.id).className}`} data-testid="card">
                          {card.image && <div className="capa" data-testid="cover" />}
                          <div className="card-linha">
                            <span className="alca" data-alca aria-hidden="true"><i /></span>
                            <strong>{card.title}</strong>
                            <button className="botao" data-testid="move" onClick={() => move(ci, card)}>
                              mover
                            </button>
                          </div>
                        </article>
                      ) : (
                        <article key="vaga" className="card vaga" data-vaga data-testid="vaga" aria-hidden="true" style={{ height: dnd.drag!.height }} />
                      ),
                    )
                  : (col as Shape['columns'][number]).cards.map((image, i) => (
                      <article key={i} className="card" data-testid="sk-card" aria-hidden="true">
                        {image && <div className="capa sk" data-testid="cover" />}
                        <div className="card-linha">
                          <span className="sk sk-linha" />
                        </div>
                      </article>
                    ))}
                <div className="acoes">
                  {db && (
                    <>
                      <button className="botao" data-testid="add-image" onClick={() => add(ci, true)}>+ com imagem</button>
                      <button className="botao" data-testid="add-text" onClick={() => add(ci, false)}>+ texto</button>
                    </>
                  )}
                </div>
              </section>
            ))}
          </div>

          <p id="dica-arrastar" className="so-leitor">Espaço pega o card, setas movem, espaço solta, Esc cancela.</p>
          <div className="so-leitor" aria-live="assertive" role="status" data-testid="anuncio">{dnd.anuncio}</div>
          <div className="espaco" />
          <section className="card rodape" data-testid="footer">
            <strong>Próxima seção da página: atividade recente</strong>
          </section>
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
