'use client'

import { useNotificacoes } from './usePwa'

// servidor = { inscrever, cancelar, testar }; ver templates/comum/lib/pwa.js
export default function CartaoNotificacoes({ servidor, explicacao }) {
  const n = useNotificacoes(servidor)
  if (n.carregando) return null
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <h3 className="text-[15px] font-semibold">Notificações</h3>
      <p className="mt-1 text-[15px] text-black/70">{explicacao}</p>
      {n.precisaInstalar ? (
        <p className="mt-3 rounded-xl bg-black/5 px-3 py-2.5 text-sm">No iPhone a notificação só chega com o app na tela de início. Instale e ligue por lá.</p>
      ) : n.suportado === false ? (
        <p className="mt-3 text-sm text-black/60">Este navegador não recebe notificações. Abra pelo Chrome ou pelo app instalado.</p>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(n.ligado)}
          disabled={n.ocupado}
          onClick={() => (n.ligado ? n.desligar() : n.ligar())}
          className="pressionavel mt-3 flex w-full items-center justify-between rounded-xl bg-black/5 px-3 py-3 text-left text-[15px]"
        >
          <span>{n.ligado ? 'Notificações ligadas neste aparelho' : 'Ligar notificações neste aparelho'}</span>
          <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${n.ligado ? 'bg-emerald-600' : 'bg-black/20'}`}>
            <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${n.ligado ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      )}
      {n.ligado && (
        <button type="button" disabled={n.ocupado} onClick={n.testar} className="pressionavel mt-2 h-10 text-sm font-semibold underline underline-offset-4">
          {n.ocupado ? 'Enviando...' : 'Mandar notificação de teste'}
        </button>
      )}
      {n.testeEnviado && <p role="status" className="mt-1 text-sm text-emerald-700">Mandamos uma notificação de teste. Ela chega em alguns segundos.</p>}
      {n.permissao === 'denied' && <p className="mt-2 text-sm text-black/60">As notificações deste app estão bloqueadas. Libere nas configurações e tente de novo.</p>}
      {n.erro && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{n.erro}</p>}
    </section>
  )
}
