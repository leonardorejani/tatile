import webpush from 'web-push'

// Notificação de teste ao ligar: prova chave, inscrição, servidor e aparelho de uma vez.
// Só manda para quem está logado e só para a inscrição que veio no pedido. Troque `contaDoPedido`
// pela verificação de sessão do app (Supabase, NextAuth, cookie próprio).
async function contaDoPedido(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token || !process.env.SUPABASE_URL) return null
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_CHAVE_PUBLICA, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const usuario = await r.json()
  return { nome: usuario.user_metadata?.nome || 'você' }
}

export async function POST(request) {
  const { VAPID_PUBLICA, VAPID_PRIVADA, VAPID_CONTATO } = process.env
  if (!VAPID_PUBLICA || !VAPID_PRIVADA) return Response.json({ erro: 'Notificações não configuradas no servidor.' }, { status: 503 })

  const { inscricao } = await request.json().catch(() => ({}))
  if (!inscricao?.endpoint || !inscricao?.keys?.p256dh || !inscricao?.keys?.auth) {
    return Response.json({ erro: 'Pedido incompleto.' }, { status: 400 })
  }
  const conta = await contaDoPedido(request)
  if (!conta) return Response.json({ erro: 'Entre na sua conta para receber notificações.' }, { status: 401 })

  webpush.setVapidDetails(VAPID_CONTATO || 'mailto:contato@exemplo.com.br', VAPID_PUBLICA, VAPID_PRIVADA)
  try {
    await webpush.sendNotification(inscricao, JSON.stringify({
      titulo: 'Notificações ligadas',
      corpo: `Pronto, ${conta.nome.split(' ')[0]}. É assim que o aviso vai chegar.`,
      etiqueta: 'teste',
      url: '/',
    }), { TTL: 600 })
  } catch (erro) {
    return Response.json({ erro: 'A notificação de teste não chegou a este aparelho.', status: erro.statusCode || null }, { status: 502 })
  }
  return Response.json({ enviado: true })
}
