#!/usr/bin/env node
// Disparador de notificações inteligentes: lê os destinatários, decide o aviso de cada conta pela
// função `decidir` (troque pela regra do app), junta tudo numa notificação por conta e descarta o
// aparelho que não existe mais. Roda em cron ou job (launchd, GitHub Actions), nunca no navegador.
//
// Uso: set -a; . ~/.config/<app>/segredos; set +a; node disparar.mjs [--simular | --teste]
// Saída: 0 ok; 1 falha; 2 uso errado. Saída em TOON.
import webpush from 'web-push'

const SUPABASE_URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_CHAVE_PUBLICA
const { VAPID_PUBLICA, VAPID_PRIVADA, VAPID_CONTATO, DISPARADOR_SEGREDO } = process.env

const args = new Set(process.argv.slice(2))
const desconhecidas = [...args].filter(a => !['--simular', '--teste'].includes(a))
if (desconhecidas.length) {
  console.log(`error: opção desconhecida ${desconhecidas.join(' ')}\ncode: USO\nhelp: node disparar.mjs [--simular | --teste]`)
  process.exit(2)
}
if (!SUPABASE_URL || !ANON || !VAPID_PUBLICA || !VAPID_PRIVADA || !DISPARADOR_SEGREDO) {
  console.log('error: faltam variáveis (SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, VAPID_PUBLICA, VAPID_PRIVADA, DISPARADOR_SEGREDO)\ncode: CONFIG\nhelp: set -a; . ~/.config/<app>/segredos; set +a')
  process.exit(1)
}
webpush.setVapidDetails(VAPID_CONTATO || 'mailto:contato@exemplo.com.br', VAPID_PUBLICA, VAPID_PRIVADA)

async function rpc(funcao, corpo) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcao}`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  if (!r.ok) throw new Error(`${funcao} respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.status === 204 ? null : r.json()
}

// Regra do app: devolve { titulo, corpo, url, etiqueta } ou null quando não há o que avisar.
// Avise só o que mudou desde o último aviso, junte vários num só e diga o número, não "confira".
function decidir(destinatario) {
  return null
}

async function enviar(inscricoes, mensagem, mortos) {
  let entregues = 0
  for (const inscricao of inscricoes) {
    try {
      await webpush.sendNotification(inscricao, JSON.stringify(mensagem), { TTL: 60 * 60 * 24, urgency: 'normal', topic: mensagem.etiqueta })
      entregues++
    } catch (erro) {
      if (erro.statusCode === 404 || erro.statusCode === 410) mortos.push(inscricao.endpoint)
      else console.error(`aviso: falha ao enviar (${erro.statusCode || erro.message})`)
    }
  }
  return entregues
}

const destinatarios = await rpc('app_push_destinatarios', { p_segredo: DISPARADOR_SEGREDO })
const mortos = []
const linhas = []
let total = 0
for (const d of destinatarios) {
  const mensagem = args.has('--teste') ? { titulo: 'Teste do disparador', corpo: 'Se chegou, a cadeia de notificações está de pé.', etiqueta: 'teste', url: '/' } : decidir(d)
  if (!mensagem) { linhas.push(`${d.conta},sem aviso,0`); continue }
  const n = args.has('--simular') ? 0 : await enviar(d.inscricoes, mensagem, mortos)
  total += n
  linhas.push(`${d.conta},"${mensagem.titulo.replace(/"/g, '""')}",${n}`)
}
if (mortos.length) await rpc('app_push_descartar', { p_segredo: DISPARADOR_SEGREDO, p_endpoints: mortos })

console.log(`modo: ${args.has('--simular') ? 'simulação (nada enviado)' : args.has('--teste') ? 'teste' : 'envio'}`)
console.log(`contas: ${destinatarios.length}, notificações entregues: ${total}, aparelhos descartados: ${mortos.length}`)
console.log(`resultado[${linhas.length}]{conta,aviso,entregues}:`)
for (const l of linhas) console.log(`  ${l}`)
