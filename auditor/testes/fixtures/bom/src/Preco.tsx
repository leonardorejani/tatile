import { useState } from 'react'

export function Preco({ valor }: { valor: number }) {
  const [ok, setOk] = useState(false)
  // padding: 13, cor #fff e R$ em comentário não contam
  return (
    <div style={{ padding: 'var(--pad)', gap: 'var(--grade)', fontVariantNumeric: 'tabular-nums' }}>
      <span>R$ {valor.toLocaleString('pt-BR')}</span>
      <svg width="16" height="16"><path fill="#ffffff" d="M0 0h16v16H0z" /></svg>
      <a href="#topo">Voltar</a>
      <textarea
        onPaste={(e) => {
          const arquivo = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'))
          if (arquivo) e.preventDefault()
          setOk(true)
        }}
      />
      <input style={{ top: 0, left: '50%', marginTop: 1 }} aria-label={ok ? 'ok' : 'não'} />
    </div>
  )
}
