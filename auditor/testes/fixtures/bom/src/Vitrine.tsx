export function Vitrine({ ativo, nome }: { ativo: boolean; nome: string }) {
  if (ativo !== true && !nome) return null
  // 🚀 Turbine! em comentário não conta
  return (
    <section className="bg-gradient-to-r from-blue-500 to-blue-700 shadow-slate-500/50">
      <h1>Seus pedidos</h1>
      <p>© 2026 Loja ® marca ™ Pedidos ↔ entregas, atalho ⌘K</p>
      <p>Preencha o nome do cliente.</p>
      <input placeholder="Buscar pedido..." aria-label={nome} />
      <span className="skeleton animate-pulse">Carregando</span>
      <span className="tracking-widest">Seção</span>
      <span className="uppercase">Seção</span>
      <button className="transition-opacity">Salvar</button>
      <button onClick={() => unlock(nome)} data-teste="Turbine!">Abrir</button>
      <p>{ativo && !nome ? 'a' : 'b'}</p>
    </section>
  )
}

const unlock = (n: string) => n
const aviso = 'ok 🚀' // tatile-ignorar
