#!/usr/bin/env node
// Gera o par VAPID e o segredo do disparador, grava num arquivo fora do repositório (chmod 600) e
// imprime só o que pode aparecer: a chave pública e o sha256 do segredo.
//
// Uso: node gerar-vapid.mjs <arquivo-de-segredos> [contato]
//   ex.: node gerar-vapid.mjs ~/.config/meuapp/segredos mailto:contato@meuapp.com.br
// Saída: 0 gerado; 1 arquivo já tem chaves (não sobrescreve); 2 uso errado.
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const [arquivo, contato = 'mailto:contato@exemplo.com.br'] = process.argv.slice(2)
if (!arquivo) {
  console.log('error: falta o arquivo de segredos\ncode: USO\nhelp: node gerar-vapid.mjs ~/.config/<app>/segredos [mailto:contato]')
  process.exit(2)
}
if (existsSync(arquivo) && /VAPID_PRIVADA=/.test(readFileSync(arquivo, 'utf8'))) {
  console.log(`error: ${arquivo} já tem chaves VAPID; trocar invalida todas as inscrições\ncode: JA_EXISTE\nhelp: apague as linhas VAPID_* à mão se quiser mesmo trocar`)
  process.exit(1)
}
// Mesmo formato do web-push, sem dependência: P-256, pública sem compressão (0x04 || x || y), base64url
const { publicKey: pub, privateKey: priv } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const jwk = pub.export({ format: 'jwk' })
const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url')
const privateKey = priv.export({ format: 'jwk' }).d
const segredo = randomBytes(32).toString('base64url')
mkdirSync(dirname(arquivo), { recursive: true })
writeFileSync(arquivo, `VAPID_PUBLICA=${publicKey}\nVAPID_PRIVADA=${privateKey}\nVAPID_CONTATO=${contato}\nDISPARADOR_SEGREDO=${segredo}\n`, { flag: 'a' })
chmodSync(arquivo, 0o600)
console.log(`arquivo: ${arquivo} (chmod 600)`)
console.log(`chave_publica: ${publicKey}`)
console.log(`segredo_sha256: ${createHash('sha256').update(segredo).digest('hex')}`)
console.log('help: a pública vai em CHAVE_PUBLICA_VAPID (lib/pwa.js); o sha256 vai em app.config; a privada só nas variáveis do servidor')
