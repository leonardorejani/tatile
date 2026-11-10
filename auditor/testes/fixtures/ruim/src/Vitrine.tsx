export function Vitrine({ nome }: { nome: string }) {
  return (
    <section className="bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-500/50 animate-pulse">
      <h1>Turbine seu app!</h1>
      <p>Bem-vindo de volta 🚀</p>
      <input placeholder="Pergunte qualquer coisa..." aria-label={nome} />
      <span className="uppercase tracking-widest">Seção</span>
    </section>
  )
}
