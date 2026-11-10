'use client'

import { PASSOS_INSTALAR } from '@/lib/pwa'
import { useInstalacao } from './usePwa'

// Some quando o app já está instalado. Com o convite do navegador (Android, Chrome e Edge no desktop),
// botão; sem ele (iPhone, Safari no Mac, menu do Android), os passos certos da plataforma.
export default function CartaoInstalar({ nomeApp = 'app' }) {
  const { podeInstalar, plataforma, jaInstalado, instalar } = useInstalacao()
  const passos = PASSOS_INSTALAR[plataforma]
  if (jaInstalado || (!podeInstalar && !passos)) return null
  const noComputador = ['mac-safari', 'computador'].includes(plataforma)
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <h3 className="text-[15px] font-semibold">{noComputador ? `Instalar o ${nomeApp} no computador` : `Instalar o ${nomeApp}`}</h3>
      <p className="mt-1 text-[15px] text-black/70">
        {noComputador ? 'Abre em janela própria, fica na barra de tarefas e recebe notificações.' : 'Fica na tela como um aplicativo, abre em tela cheia e funciona sem sinal com o que você já viu.'}
      </p>
      {podeInstalar ? (
        <button type="button" onClick={instalar} className="pressionavel mt-3 h-12 w-full rounded-full bg-black text-[15px] font-semibold text-white">Instalar agora</button>
      ) : (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px] text-black/80">
          {passos.map(p => <li key={p}>{p}</li>)}
        </ol>
      )}
    </section>
  )
}
