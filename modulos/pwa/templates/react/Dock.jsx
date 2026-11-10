'use client'

// Barra de abas do celular, no padrão de aplicativo: até cinco destinos ao alcance do polegar.
// A partir de 768 px some (md:hidden) e a navegação vai para o topo ou para o painel lateral.
// itens = [{ id, rotulo, icone: <path d>, ativoEm: [ids] }]
export const ALTURA_DOCK = 64

export default function Dock({ itens, ativo, onEscolher }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto flex max-w-lg" style={{ height: ALTURA_DOCK }}>
        {itens.map(item => {
          const marcado = (item.ativoEm || [item.id]).includes(ativo)
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onEscolher(item.id)}
                aria-current={marcado ? 'page' : undefined}
                className="pressionavel flex h-full w-full select-none flex-col items-center justify-center gap-1"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-6 w-6 ${marcado ? 'text-black' : 'text-black/45'}`} fill="none" stroke="currentColor" strokeWidth={marcado ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icone} />
                </svg>
                <span className={`text-[11px] leading-none ${marcado ? 'font-bold' : 'font-medium text-black/55'}`}>{item.rotulo}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
