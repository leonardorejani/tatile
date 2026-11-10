import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dinheiro, numero, tamanho, relativo, dataHora } from '../codigo/formato.ts'

const semEspecial = (s: string) => assert.doesNotMatch(s, /[\u00A0\u202F]/, `tem espaco especial: ${JSON.stringify(s)}`)

test('dinheiro: pt-BR, centavos sempre, negativo, sem espaco especial', () => {
  assert.equal(dinheiro(1000.5), 'R$ 1.000,50')
  assert.equal(dinheiro(0), 'R$ 0,00')
  assert.equal(dinheiro(-25.9), '-R$ 25,90')
  for (const v of [1000.5, 0, -25.9, 1234567.89]) semEspecial(dinheiro(v))
})

test('numero: milhar com ponto, casas fixas quando pedidas', () => {
  assert.equal(numero(1234567), '1.234.567')
  assert.equal(numero(1234.5, 2), '1.234,50')
  assert.equal(numero(0.5, 0), '1')
  assert.equal(numero(-1500), '-1.500')
  semEspecial(numero(1234567.891, 2))
})

test('tamanho: base 1024, sem ",0" e sem espaco especial', () => {
  assert.equal(tamanho(0), '0 B')
  assert.equal(tamanho(512), '512 B')
  assert.equal(tamanho(1024), '1 KB')
  assert.equal(tamanho(1536), '1,5 KB')
  assert.equal(tamanho(10 * 1024 * 1024), '10 MB')
  assert.equal(tamanho(5 * 1024 ** 3), '5 GB')
  semEspecial(tamanho(10 * 1024 * 1024))
})

test('relativo: minutos, horas, ontem, amanha, agora', () => {
  const agora = new Date(2026, 10, 9, 12, 0, 0)
  assert.equal(relativo(new Date(+agora - 3 * 60_000), agora), 'há 3 min')
  assert.equal(relativo(new Date(+agora - 2 * 3600_000), agora), 'há 2 h')
  assert.equal(relativo(new Date(2026, 10, 8, 9, 0), agora), 'ontem')
  assert.equal(relativo(new Date(2026, 10, 10, 9, 0), agora), 'amanhã')
  assert.equal(relativo(new Date(+agora + 10_000), agora), 'agora')
  for (const d of [new Date(+agora - 3 * 60_000), new Date(2026, 10, 8), new Date(2026, 10, 10)]) semEspecial(relativo(d, agora))
})

test('relativo: acima de 30 dias vira data', () => {
  const agora = new Date(2026, 10, 9, 12, 0, 0)
  assert.equal(relativo(new Date(2026, 5, 1, 10), agora), '01/06/2026')
})

test('dataHora: dd/mm/aaaa hh:mm, meia-noite como 00', () => {
  assert.equal(dataHora(new Date(2026, 10, 9, 18, 21)), '09/11/2026 18:21')
  assert.equal(dataHora(new Date(2026, 0, 5, 0, 7)), '05/01/2026 00:07')
  semEspecial(dataHora(new Date(2026, 10, 9, 18, 21)))
})
