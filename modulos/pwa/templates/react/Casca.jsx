'use client'

import Dock from './Dock'

// Casca que serve aos dois mundos.
// Celular: uma coluna em tela cheia (o painel, se houver; senão o conteúdo) com o dock embaixo.
// A partir de 768 px: painel fixo à esquerda (largura em --painel), conteúdo ao lado, sem dock.
export default function Casca({ itens, ativo, onEscolher, painel, children }) {
  const comPainel = Boolean(painel)
  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ '--painel': 'clamp(360px, 40vw, 480px)' }}>
      <main className={`absolute inset-0 overflow-y-auto overscroll-contain ${comPainel ? 'hidden md:block md:left-[var(--painel)]' : 'pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-0'}`}>
        {children}
      </main>
      {comPainel && (
        <aside className="absolute inset-0 overflow-y-auto overscroll-contain bg-white pt-[env(safe-area-inset-top,0px)] pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:right-auto md:w-[var(--painel)] md:border-r md:border-black/10 md:pb-0">
          {painel}
        </aside>
      )}
      <Dock itens={itens} ativo={ativo} onEscolher={onEscolher} />
    </div>
  )
}
