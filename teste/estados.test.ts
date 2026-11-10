import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarAtrasoDeCarga, lerDaUrl, urlCom, trocarTemaSemTransicao } from '../codigo/estados.ts'

// Relogio de mentira: o tempo so anda quando o teste manda
function relogioFalso() {
  let t = 0, seq = 0
  const fila = new Map<number, { quando: number; fn: () => void }>()
  return {
    agora: () => t,
    agendar: (fn: () => void, ms: number) => (fila.set(++seq, { quando: t + ms, fn }), seq),
    cancelar: (id: unknown) => void fila.delete(id as number),
    andar(ms: number) {
      const alvo = t + ms
      for (;;) {
        const prox = [...fila.entries()].filter(([, v]) => v.quando <= alvo).sort((a, b) => a[1].quando - b[1].quando)[0]
        if (!prox) break
        fila.delete(prox[0]); t = prox[1].quando; prox[1].fn()
      }
      t = alvo
    },
  }
}

function montar() {
  const relogio = relogioFalso()
  const mudancas: [number, boolean][] = []
  const ctl = criarAtrasoDeCarga(v => mudancas.push([relogio.agora(), v]), { espera: 200, minimo: 400, relogio })
  return { relogio, mudancas, ctl }
}

test('resposta rapida (120 ms) nao mostra skeleton nenhuma vez', () => {
  const { relogio, mudancas, ctl } = montar()
  ctl.iniciar(); relogio.andar(120); ctl.terminar(); relogio.andar(1000)
  assert.deepEqual(mudancas, [])
})

test('resposta lenta mostra aos 200 ms e some quando chega', () => {
  const { relogio, mudancas, ctl } = montar()
  ctl.iniciar(); relogio.andar(1200); ctl.terminar(); relogio.andar(1000)
  assert.deepEqual(mudancas, [[200, true], [1200, false]])
})

test('chegou logo depois de aparecer: fica ate completar 400 ms na tela', () => {
  const { relogio, mudancas, ctl } = montar()
  ctl.iniciar(); relogio.andar(250); ctl.terminar(); relogio.andar(1000)
  assert.deepEqual(mudancas, [[200, true], [600, false]])
})

test('nova carga durante o minimo continua mostrando, sem piscar', () => {
  const { relogio, mudancas, ctl } = montar()
  ctl.iniciar(); relogio.andar(250); ctl.terminar(); relogio.andar(100)
  ctl.iniciar(); relogio.andar(800); ctl.terminar(); relogio.andar(1000)
  assert.deepEqual(mudancas, [[200, true], [1150, false]])
})

test('estado na URL: le com padrao, grava e limpa quando volta ao padrao', () => {
  assert.equal(lerDaUrl('?aba=pagos', 'aba', 'todos'), 'pagos')
  assert.equal(lerDaUrl('', 'aba', 'todos'), 'todos')
  assert.equal(urlCom('https://acme.app/pedidos?pagina=2#topo', 'aba', 'pagos', 'todos'), '/pedidos?pagina=2&aba=pagos#topo')
  assert.equal(urlCom('https://acme.app/pedidos?aba=pagos', 'aba', 'todos', 'todos'), '/pedidos')
  assert.equal(urlCom('https://acme.app/busca', 'q', 'cafe com leite', ''), '/busca?q=cafe+com+leite')
})

test('trocarTemaSemTransicao: classe liga antes de aplicar e sai so depois de 2 quadros', () => {
  const classes = new Set<string>()
  const quadros: (() => void)[] = []
  const doc = {
    documentElement: { classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } },
    defaultView: { requestAnimationFrame: (fn: () => void) => quadros.push(fn) },
  } as unknown as Document
  let viuClasse = false
  trocarTemaSemTransicao(() => (viuClasse = classes.has('sem-transicao')), doc)
  assert.equal(viuClasse, true)
  assert.equal(classes.has('sem-transicao'), true)
  quadros.shift()!()
  assert.equal(classes.has('sem-transicao'), true, 'um quadro so nao basta')
  quadros.shift()!()
  assert.equal(classes.has('sem-transicao'), false)
})
