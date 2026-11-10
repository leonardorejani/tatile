export function Total({ valor }: { valor: number }) {
  return (
    <div style={{ padding: 13, paddingHorizontal: 12, gap: 8, borderRadius: 10 }}>
      <p>R$ {valor.toFixed(2)}</p>
      <textarea
        onPaste={(e) => {
          e.preventDefault()
        }}
      />
    </div>
  )
}
