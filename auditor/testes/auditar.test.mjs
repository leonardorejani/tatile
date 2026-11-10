import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { auditar } from '../auditar.mjs'
import { REGRAS } from '../regras.mjs'

const FIXTURES = new URL('./fixtures/', import.meta.url).pathname
const SCRIPT = new URL('../auditar.mjs', import.meta.url).pathname
const ids = r => new Set(r.achados.map(a => a.regra))

// Projeto descartável: cada caso cria só os arquivos de que precisa e a limpeza vem junto
function projeto(t, arquivos) {
  const pasta = mkdtempSync(join(tmpdir(), 'tatile-auditor-'))
  t.after(() => rmSync(pasta, { recursive: true, force: true }))
  for (const [nome, texto] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(pasta, nome)), { recursive: true })
    writeFileSync(join(pasta, nome), texto)
  }
  return pasta
}
const regrasDe = (t, arquivos) => [...ids(auditar(projeto(t, arquivos)))]
// Para regra nova: o arquivo dispara (ou não) aquela regra, sem olhar as outras (cor-solta etc.)
const acha = (t, id, arquivos) => regrasDe(t, arquivos).includes(id)
const css = (t, id, decl) => acha(t, id, { 'a.css': `.a { ${decl} }\n` })
const tsx = (t, id, linha) => acha(t, id, { 'a.tsx': `export const x = (\n  ${linha}\n)\n` })

test('projeto bom sai limpo', () => {
  const r = auditar(join(FIXTURES, 'bom'))
  assert.deepEqual(r.achados, [])
  assert.equal(r.arquivos, 7, 'node_modules, dist e .min não entram na contagem')
})

test('projeto ruim dispara cada regra pelo menos uma vez', () => {
  const r = auditar(join(FIXTURES, 'ruim'))
  for (const regra of REGRAS) assert.ok(ids(r).has(regra.id), `faltou ${regra.id}`)
})

// Quantas vezes cada regra dispara na fixture ruim. Regra nova entra com a sua linha, sem mexer nas
// outras. Mudou a conta de uma regra existente: ela passou a pegar mais ou menos do que pegava.
const POR_REGRA = {
  'espaco-solto': 3, 'cor-solta': 3, 'raio-solto': 2, 'zoom-travado': 2, 'colar-bloqueado': 1,
  'foco-removido': 1, 'numero-sem-tabular': 1, 'input-fonte-pequena': 1, 'gradiente-colorido': 4,
  'brilho-colorido': 2, 'emoji-na-interface': 1, 'rotulo-caixa-alta': 2, 'movimento-barato': 4,
  'texto-de-propaganda': 3, 'hover-sem-mouse': 1, 'rolagem-vaza': 1,
}

test('projeto ruim: contagem por regra', () => {
  const r = auditar(join(FIXTURES, 'ruim'))
  const conta = {}
  for (const a of r.achados) conta[a.regra] = (conta[a.regra] ?? 0) + 1
  for (const regra of REGRAS) assert.ok(regra.id in POR_REGRA, `${regra.id} sem linha em POR_REGRA`)
  for (const [id, n] of Object.entries(POR_REGRA)) assert.equal(conta[id] ?? 0, n, id)
})

test('achados trazem severidade, arquivo relativo, linha e mensagem', () => {
  const r = auditar(join(FIXTURES, 'ruim'))
  const zoom = r.achados.find(a => a.regra === 'zoom-travado' && a.arquivo === 'index.html')
  assert.equal(zoom.severidade, 'erro')
  assert.equal(zoom.linha, 4)
  assert.match(zoom.mensagem, /maximum-scale/)
  const colar = r.achados.find(a => a.regra === 'colar-bloqueado')
  assert.deepEqual([colar.arquivo, colar.linha, colar.severidade], ['src/Total.tsx', 6, 'erro'])
  for (const regra of REGRAS) {
    assert.ok(['erro', 'aviso'].includes(regra.severidade))
    assert.ok(regra.descricao && regra.correcao && typeof regra.testar === 'function')
  }
})

test('espaco-solto: pega px/rem soltos e número cru, aceita 0, 1px, var() e calc()', t => {
  const css = (decl) => regrasDe(t, { 'a.css': `.a { ${decl} }\n` })
  for (const ruim of ['padding: 13px', 'margin: 0 auto 0.5rem', 'gap: 8px', 'row-gap: 3px', 'inset: 4px', 'top: 10px', 'margin-left: -7px']) {
    assert.deepEqual(css(ruim), ['espaco-solto'], ruim)
  }
  for (const bom of ['padding: 0', 'margin: 1px', 'padding: var(--pad)', 'gap: calc(var(--grade) * 2)', 'margin: 0 auto', 'top: 50%', 'border-top: 13px solid red', 'padding: 0 var(--margem)']) {
    assert.deepEqual(css(bom), [], bom)
  }
  const js = (obj) => regrasDe(t, { 'a.tsx': `export const s = { ${obj} }\n` })
  for (const ruim of ["padding: 13", "padding: '13px'", 'paddingHorizontal: 12', 'gap: 8', "marginTop: '2rem'"]) {
    assert.deepEqual(js(ruim), ['espaco-solto'], ruim)
  }
  for (const bom of ['padding: 0', 'gap: 1', "padding: 'var(--pad)'", 'top: 12', 'zIndex: 13', 'flex: 13']) {
    assert.deepEqual(js(bom), [], bom)
  }
})

test('cor-solta: hex e rgb/hsl em componente, nunca token, comentário, svg ou âncora', t => {
  const css = (decl) => regrasDe(t, { 'a.css': `.a { ${decl} }\n` })
  for (const ruim of ['color: #abc', 'color: #aabbcc', 'color: #aabbccdd', 'background: rgb(1, 2, 3)', 'color: hsl(10 20% 30%)', 'border: 1px solid #ccc']) {
    assert.deepEqual(css(ruim), ['cor-solta'], ruim)
  }
  for (const bom of ['color: currentColor', 'background: transparent', 'color: rgb(var(--cor-rgb))', 'color: var(--texto)']) {
    assert.deepEqual(css(bom), [], bom)
  }
  const tsx = (linha) => regrasDe(t, { 'a.tsx': `const x = <p>${linha}</p>\n` })
  assert.deepEqual(regrasDe(t, { 'a.tsx': "const c = { color: '#fff' }\n" }), ['cor-solta'])
  assert.deepEqual(tsx('Pedido #123'), [])
  assert.deepEqual(tsx('<a href="#abc">x</a>'), [])
  assert.deepEqual(regrasDe(t, { 'a.tsx': 'const s = <svg><path fill="#fff" /></svg>\n' }), [])
  assert.deepEqual(regrasDe(t, { 'a.css': '/* #fff e rgb(0,0,0) */\n.a { color: var(--texto) }\n' }), [])
  assert.deepEqual(regrasDe(t, { 'a.css': '#add { top: 50% }\n' }), [])
})

test('raio-solto: px solto avisa, 0, 50%, 9999px e var() passam', t => {
  const css = (decl) => regrasDe(t, { 'a.css': `.a { ${decl} }\n` })
  for (const ruim of ['border-radius: 6px', 'border-top-left-radius: 10px', 'border-radius: 8px 4px']) {
    assert.deepEqual(css(ruim), ['raio-solto'], ruim)
  }
  for (const bom of ['border-radius: 0', 'border-radius: 50%', 'border-radius: 9999px', 'border-radius: 999px', 'border-radius: var(--raio-md)']) {
    assert.deepEqual(css(bom), [], bom)
  }
  assert.deepEqual(regrasDe(t, { 'a.tsx': 'const s = { borderRadius: 8 }\n' }), ['raio-solto'])
  assert.deepEqual(regrasDe(t, { 'a.tsx': 'const s = { borderRadius: 0 }\n' }), [])
})

test('zoom-travado: viewport em html, tsx e metadata do Next', t => {
  for (const [arquivo, linha] of [
    ['a.html', '<meta name="viewport" content="width=device-width, maximum-scale=1">'],
    ['a.html', '<meta name="viewport" content="user-scalable=no">'],
    ['a.html', '<meta name="viewport" content="user-scalable=0">'],
    ['a.tsx', 'export const viewport = { maximumScale: 1 }'],
    ['a.ts', 'export const viewport = { userScalable: false }'],
  ]) assert.deepEqual(regrasDe(t, { [arquivo]: linha + '\n' }), ['zoom-travado'], linha)
  for (const linha of ['<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">', '<meta name="viewport" content="user-scalable=yes">']) {
    assert.deepEqual(regrasDe(t, { 'a.html': linha + '\n' }), [], linha)
  }
})

test('colar-bloqueado: só com preventDefault e sem checar imagem', t => {
  const sem = 'const a = (\n  <input onPaste={(e) => {\n    e.preventDefault()\n  }} />\n)\n'
  assert.deepEqual(regrasDe(t, { 'a.tsx': sem }), ['colar-bloqueado'])
  assert.deepEqual(regrasDe(t, { 'a.ts': "el.addEventListener('paste', (e) => {\n  e.preventDefault()\n})\n" }), ['colar-bloqueado'])
  const com = 'const a = (\n  <input onPaste={(e) => {\n    const img = e.clipboardData.files[0]?.type.startsWith("image/")\n    if (img) e.preventDefault()\n  }} />\n)\n'
  assert.deepEqual(regrasDe(t, { 'a.tsx': com }), [])
  assert.deepEqual(regrasDe(t, { 'a.tsx': 'const a = <input onPaste={(e) => salvar(e)} />\n' }), [])
})

test('foco-removido: some quando o arquivo tem focus-visible', t => {
  for (const linha of ['a { outline: none }', 'a { outline: 0 }']) assert.deepEqual(regrasDe(t, { 'a.css': linha + '\n' }), ['foco-removido'], linha)
  assert.deepEqual(regrasDe(t, { 'a.tsx': 'const a = <input className="outline-none" />\n' }), ['foco-removido'])
  assert.deepEqual(regrasDe(t, { 'a.css': 'a { outline: none }\na:focus-visible { outline: 2px solid var(--destaque) }\n' }), [])
  assert.deepEqual(regrasDe(t, { 'a.css': 'a { outline: 2px solid var(--destaque) }\n' }), [])
})

test('numero-sem-tabular: uma vez por arquivo, some com tabular-nums, ignora .ts e .css', t => {
  const dois = 'const a = <p>{x.toLocaleString()}</p>\nconst b = <p>R$ {y}</p>\n'
  const r = auditar(projeto(t, { 'a.tsx': dois }))
  assert.equal(r.achados.filter(a => a.regra === 'numero-sem-tabular').length, 1)
  assert.equal(r.achados[0].linha, 1)
  assert.deepEqual(regrasDe(t, { 'a.tsx': dois + 'const c = { fontVariant: ["tabular-nums"] }\n' }), [])
  assert.deepEqual(regrasDe(t, { 'a.tsx': 'const a = <p className="tabular-nums">{x.toFixed(2)}</p>\n' }), [])
  assert.deepEqual(regrasDe(t, { 'util.ts': 'export const f = (x: number) => x.toFixed(2)\n' }), [])
})

test('input-fonte-pequena: só campo com fonte abaixo de 16px', t => {
  assert.deepEqual(regrasDe(t, { 'a.css': 'input {\n  font-size: 14px;\n}\n' }), ['input-fonte-pequena'])
  assert.deepEqual(regrasDe(t, { 'a.css': 'form,\ntextarea {\n  font-size: 0.8rem;\n}\n' }), ['input-fonte-pequena'])
  assert.deepEqual(regrasDe(t, { 'a.css': 'select { font-size: 12px }\n' }), ['input-fonte-pequena'])
  assert.deepEqual(regrasDe(t, { 'a.css': 'input { font-size: 16px }\n.legenda { font-size: 12px }\n.input-grupo { font-size: 12px }\n' }), [])
  assert.deepEqual(regrasDe(t, { 'a.html': '<input style="font-size: 12px">\n' }), ['input-fonte-pequena'])
})

test('escopo: arquivos de token, linhas de variável, :root, [data-tema] e tatile-ignorar ficam de fora', t => {
  const ruim = 'padding: 13px; color: #f00; border-radius: 7px;'
  for (const nome of ['espaco.css', 'cor.css', 'tipo.css', 'forma.css', 'tokens.css', 'espaco.ts', 'tokens.ts', 'x/tokens.css']) {
    assert.deepEqual(regrasDe(t, { [nome]: `.a { ${ruim} }\n` }), [], nome)
  }
  assert.deepEqual(regrasDe(t, { 'a.css': `.a { --x: 13px; --cor: #f00 }\n:root { ${ruim} }\n` }), [])
  assert.deepEqual(regrasDe(t, { 'a.css': `:root {\n  --a: 1;\n  ${ruim}\n}\n[data-tema="escuro"] {\n  ${ruim}\n}\n` }), [])
  assert.deepEqual(regrasDe(t, { 'a.css': `.a { ${ruim} } /* tatile-ignorar */\n` }), [])
  // depois do bloco de token, o resto do arquivo volta a ser auditado
  assert.deepEqual(regrasDe(t, { 'a.css': ':root {\n  --a: 1;\n}\n.a { padding: 13px }\n' }), ['espaco-solto'])
  for (const pasta of ['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']) {
    assert.deepEqual(regrasDe(t, { [`${pasta}/a.css`]: `.a { ${ruim} }\n` }), [], pasta)
  }
  assert.deepEqual(regrasDe(t, { 'a.min.css': `.a { ${ruim} }\n` }), [])
  assert.deepEqual(regrasDe(t, { 'a.md': `.a { ${ruim} }\n` }), [])
})

test('CLI: exit 0 limpo, 1 com erro, 2 em uso errado', () => {
  const bom = spawnSync('node', [SCRIPT, join(FIXTURES, 'bom')], { encoding: 'utf8' })
  assert.equal(bom.status, 0)
  assert.equal(bom.stdout.trim(), '7 arquivos, 0 erros, 0 avisos')

  const ruim = spawnSync('node', [SCRIPT, join(FIXTURES, 'ruim')], { encoding: 'utf8' })
  assert.equal(ruim.status, 1)
  const linhas = ruim.stdout.trim().split('\n')
  assert.match(linhas[0], /^(erro|aviso) {2}\S+:\d+ {2}[a-z-]+ {2}\S/)
  // O resumo bate com o que auditar() achou: regra nova na fixture não obriga a mexer aqui
  const r = auditar(join(FIXTURES, 'ruim'))
  const por = s => r.achados.filter(a => a.severidade === s).length
  assert.equal(linhas.at(-1), `${r.arquivos} arquivos, ${por('erro')} erros, ${por('aviso')} avisos`)
  assert.equal(linhas.length, r.achados.length + 1)

  assert.equal(spawnSync('node', [SCRIPT]).status, 2)
  assert.equal(spawnSync('node', [SCRIPT, '/pasta/que/nao/existe']).status, 2)
  assert.equal(spawnSync('node', [SCRIPT, join(FIXTURES, 'bom'), '--inventada']).status, 2)
  assert.equal(spawnSync('node', [SCRIPT, join(FIXTURES, 'bom', 'index.html')]).status, 2, 'arquivo no lugar de pasta')
})

test('CLI --json imprime { arquivos, achados } igual ao auditar()', () => {
  const r = spawnSync('node', [SCRIPT, join(FIXTURES, 'ruim'), '--json'], { encoding: 'utf8' })
  assert.equal(r.status, 1)
  const json = JSON.parse(r.stdout)
  assert.deepEqual(json, auditar(join(FIXTURES, 'ruim')))
  assert.deepEqual(Object.keys(json.achados[0]), ['severidade', 'arquivo', 'linha', 'regra', 'mensagem'])
})

test('gradiente-colorido: matizes diferentes e texto em gradiente avisam, mesmo matiz e neutro passam', t => {
  const g = d => css(t, 'gradiente-colorido', `background: ${d}`)
  for (const ruim of ['linear-gradient(135deg, #8b5cf6, #3b82f6)', 'radial-gradient(circle, rgb(139 92 246), rgb(236 72 153))',
    'conic-gradient(hsl(270 80% 60%), hsl(200 80% 50%))', 'linear-gradient(90deg, purple 0%, blue 100%)', 'linear-gradient(red, white, blue)']) assert.ok(g(ruim), ruim)
  for (const bom of ['linear-gradient(#fff, transparent)', 'linear-gradient(to bottom, rgba(0,0,0,.12), transparent)', 'linear-gradient(#7c3aed, #6d28d9)',
    'linear-gradient(rgba(139,92,246,.3), transparent)', 'linear-gradient(var(--a), var(--b))', 'linear-gradient(#f5f5f7, #e5e5ea)', 'linear-gradient(#8b5cf6, var(--b))']) assert.ok(!g(bom), bom)
  assert.ok(css(t, 'gradiente-colorido', 'background-clip: text'))
  assert.ok(css(t, 'gradiente-colorido', '-webkit-background-clip: text'))
  assert.ok(acha(t, 'gradiente-colorido', { 'a.tsx': "const s = { WebkitBackgroundClip: 'text' }\n" }))
  assert.ok(acha(t, 'gradiente-colorido', { 'a.css': '.a {\n  background: linear-gradient(\n    90deg,\n    #8b5cf6,\n    #3b82f6\n  );\n}\n' }), 'gradiente em várias linhas')
  assert.ok(!css(t, 'gradiente-colorido', 'mask-image: linear-gradient(#000, transparent)'))
  assert.ok(tsx(t, 'gradiente-colorido', '<h1 className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-700">x</h1>'))
  assert.ok(tsx(t, 'gradiente-colorido', '<div className="bg-gradient-to-r from-purple-500 to-pink-500">x</div>'))
  assert.ok(tsx(t, 'gradiente-colorido', '<div className="bg-linear-to-r from-[#8b5cf6] to-[#3b82f6]">x</div>'))
  for (const bom of ['<div className="bg-gradient-to-r from-blue-500 to-blue-700">x</div>', '<div className="bg-gradient-to-b from-white to-transparent">x</div>', '<div className="bg-gradient-to-r from-slate-100 to-slate-300">x</div>', '<div className="bg-clip-text">x</div>']) assert.ok(!tsx(t, 'gradiente-colorido', bom), bom)
  assert.ok(!acha(t, 'gradiente-colorido', { 'a.css': '.a { background: linear-gradient(#8b5cf6, #3b82f6) } /* tatile-ignorar */\n' }))
})

test('brilho-colorido: sombra 0 0 com blur e cor saturada avisa, neutra, deslocada e anel passam', t => {
  const b = d => css(t, 'brilho-colorido', d)
  for (const ruim of ['box-shadow: 0 0 24px rgba(139, 92, 246, 0.5)', 'box-shadow: 0 0 20px #8b5cf6', 'box-shadow: 0 0 0 1px black, 0 0 30px 4px hsl(280 90% 60% / .6)',
    'filter: drop-shadow(0 0 8px rgba(59, 130, 246, .8))', 'box-shadow: inset 0 0 20px purple', 'box-shadow: rgba(139,92,246,.5) 0 0 24px']) assert.ok(b(ruim), ruim)
  for (const bom of ['box-shadow: 0 0 24px rgba(0,0,0,.3)', 'box-shadow: 0 0 12px gray', 'box-shadow: 0 8px 24px rgba(139,92,246,.3)', 'box-shadow: 0 0 0 3px #8b5cf6',
    'box-shadow: 0 0 24px var(--brilho)', 'filter: drop-shadow(0 0 8px rgba(15,23,42,.2))', 'filter: drop-shadow(0 2px 4px #8b5cf6)', 'box-shadow: none']) assert.ok(!b(bom), bom)
  assert.ok(acha(t, 'brilho-colorido', { 'a.tsx': "const s = { boxShadow: '0 0 24px rgba(139,92,246,.5)' }\n" }))
  assert.ok(tsx(t, 'brilho-colorido', '<div className="shadow-[0_0_24px_rgba(139,92,246,0.5)]">x</div>'))
  assert.ok(tsx(t, 'brilho-colorido', '<div className="shadow-lg shadow-purple-500/50">x</div>'))
  assert.ok(tsx(t, 'brilho-colorido', '<div className="drop-shadow-[0_0_8px_#8b5cf6]">x</div>'))
  for (const bom of ['<div className="shadow-lg shadow-slate-500/50">x</div>', '<div className="shadow-[0_0_12px_rgba(0,0,0,0.2)]">x</div>', '<div className="shadow-md">x</div>']) assert.ok(!tsx(t, 'brilho-colorido', bom), bom)
})

test('emoji-na-interface: emoji em JSX, atributo e string avisa, tipografia, comentário e teste passam', t => {
  for (const linha of ['<p>Pronto 🚀</p>', '<input placeholder="Buscar 🔍" />', '<button aria-label="Fechar ❌">x</button>', "<span title={'ok ✨'}>x</span>", '<span>⚠ atenção</span>']) assert.ok(tsx(t, 'emoji-na-interface', linha), linha)
  assert.ok(acha(t, 'emoji-na-interface', { 'a.html': '<h1>Olá 👋</h1>\n' }))
  assert.ok(acha(t, 'emoji-na-interface', { 'a.tsx': "export const rotulo = '✅ Feito'\n" }))
  for (const linha of ['<p>© 2026 ® ™</p>', '<p>Ida ↔ volta → seguinte</p>', '<kbd>⌘K</kbd>', '<p>Passo 1️⃣ de 3</p>'.replace('1️⃣', '1'), '<p>▶ Tocar ▪ item</p>', '{/* 🚀 comentário */}', '<p>Pronto 🚀</p> {/* tatile-ignorar */}']) assert.ok(!tsx(t, 'emoji-na-interface', linha), linha)
  assert.ok(!acha(t, 'emoji-na-interface', { 'a.tsx': 'const a = 1 // 🚀 nota\n' }))
  assert.ok(!acha(t, 'emoji-na-interface', { 'a.md': '# Título 🚀\n' }))
  assert.ok(!acha(t, 'emoji-na-interface', { 'a.test.tsx': "expect(x).toBe('✅')\n", 'b.spec.ts': "it('✅', () => {})\n", 'tests/c.tsx': "const a = '✅'\n" }))
  assert.ok(!acha(t, 'emoji-na-interface', { 'a.css': '.a::before { content: "🚀" }\n' }), 'css fica fora')
})

test('rotulo-caixa-alta: uppercase com letter-spacing positivo avisa, só uppercase ou peso pesado passam', t => {
  const r = d => css(t, 'rotulo-caixa-alta', d)
  for (const ruim of ['text-transform: uppercase; letter-spacing: 0.1em', 'letter-spacing: 1px; text-transform: uppercase', 'text-transform: uppercase; letter-spacing: .08em']) assert.ok(r(ruim), ruim)
  assert.ok(acha(t, 'rotulo-caixa-alta', { 'a.css': '.a {\n  text-transform: uppercase;\n  font-size: 12px;\n  letter-spacing: 0.12em;\n}\n' }), 'mesmo seletor em linhas diferentes')
  for (const bom of ['text-transform: uppercase', 'text-transform: uppercase; letter-spacing: 0', 'text-transform: uppercase; letter-spacing: -0.02em', 'text-transform: uppercase; font-weight: 800', 'letter-spacing: 0.1em', 'text-transform: uppercase; letter-spacing: var(--tracking)']) assert.ok(!r(bom), bom)
  assert.ok(!acha(t, 'rotulo-caixa-alta', { 'a.css': '.a { text-transform: uppercase; }\n.b { letter-spacing: 0.1em; }\n' }), 'seletores diferentes')
  assert.ok(acha(t, 'rotulo-caixa-alta', { 'a.tsx': "const s = { textTransform: 'uppercase', letterSpacing: 1.2 }\n" }))
  for (const ruim of ['<p className="uppercase tracking-wide">x</p>', '<p className="text-xs uppercase tracking-widest">x</p>', '<p className="uppercase tracking-[0.2em]">x</p>']) assert.ok(tsx(t, 'rotulo-caixa-alta', ruim), ruim)
  for (const bom of ['<p className="uppercase font-extrabold">x</p>', '<p className="tracking-wide">x</p>', '<p className="uppercase tracking-tight">x</p>']) assert.ok(!tsx(t, 'rotulo-caixa-alta', bom), bom)
})

test('movimento-barato: transition all, pulse fora de status, width/height/top/left; grid-template-rows passa', t => {
  const m = d => css(t, 'movimento-barato', d)
  for (const ruim of ['transition: all 0.2s', 'transition-property: all', 'transition: width 0.3s', 'transition: opacity .2s, height .2s', 'transition-property: top, opacity', 'transition: .2s left',
    'animation: pulse 2s infinite']) assert.ok(m(ruim), ruim)
  for (const bom of ['transition: opacity 0.2s, transform 0.2s', 'transition: grid-template-rows 0.2s', 'transition: max-width .2s', 'transition: width 0s', 'transition:opacity .2s}.b{width:3px}', 'transition: line-height .2s', 'transition: background-color .2s', 'width: 10px', 'animation: giro 1s']) assert.ok(!m(bom), bom)
  assert.ok(acha(t, 'movimento-barato', { 'a.css': '@keyframes cresce {\n  from {\n    width: 0;\n  }\n  to {\n    width: 100%;\n  }\n}\n' }), 'width dentro de keyframes')
  assert.ok(!acha(t, 'movimento-barato', { 'a.css': '@keyframes sobe {\n  from { opacity: 0 }\n  to { opacity: 1 }\n}\n.a { width: 10px; top: 0 }\n' }))
  assert.ok(acha(t, 'movimento-barato', { 'a.tsx': "const s = { transition: 'all 0.2s' }\n" }))
  for (const ruim of ['<div className="transition-all duration-200">x</div>', '<div className="animate-pulse">x</div>', '<div className="animate-ping">x</div>', '<div className="transition-[height] duration-200">x</div>']) assert.ok(tsx(t, 'movimento-barato', ruim), ruim)
  for (const bom of ['<div className="transition-opacity">x</div>', '<div className="animate-pulse bg-gray-200 skeleton">x</div>', '<div className="animate-ping bg-green-500 ao-vivo">x</div>', '<div className="animate-pulse" data-live>x</div>',
    '<div className="transition-[grid-template-rows]">x</div>', '<Skeleton className="animate-pulse" />', '<div className="animate-pulse">carregando</div>']) assert.ok(!tsx(t, 'movimento-barato', bom), bom)
  assert.ok(!acha(t, 'movimento-barato', { 'a.css': '.skeleton {\n  animation: pulse 1s infinite;\n}\n.sk-linha { animation: pulse 1s infinite }\n.ponto-live { animation: pulse 1s infinite }\n' }))
  assert.ok(!acha(t, 'movimento-barato', { 'a.tsx': 'function Skeleton() {\n  return (\n    <div className="animate-pulse" />\n  )\n}\n' }), 'nome do componente 3 linhas acima')
})

test('texto-de-propaganda: hype, exclamação em rótulo e placeholder avisam, código com ! passa', t => {
  for (const ruim of ['<h1>Turbine seu atendimento</h1>', '<p>Uma experiência incrível</p>', '<p>Mágica sem esforço</p>', '<p>Unlock your potential</p>', '<p>Seamless AI-powered workflow</p>', '<p>Potencializado por IA</p>',
    '<p>Welcome back, {nome}</p>', '<h2>Bem-vindo de volta</h2>', '<p>Revolutionize your team</p>', '<p>Magico</p>', '<span>Chegou!!</span>', '<button>Salvar!</button>', '<h1>Olá, {nome}!</h1>', '<a href="/x">Entrar!</a>',
    '<input placeholder="Pergunte qualquer coisa..." />', '<input placeholder="Ask anything..." />', '<img alt="Turbine" />', '<div title="Incrível!" />']) assert.ok(tsx(t, 'texto-de-propaganda', ruim), ruim)
  for (const bom of ['<p>Seus pedidos</p>', '<input placeholder="Buscar pedido..." />', '<input placeholder="Pergunte qualquer coisa" />', '<p>Pedido salvo!</p>', '<p>{!ativo && <b>x</b>}</p>', '<button onClick={() => !ok && sair()}>Sair</button>',
    '<p>{a !== b ? "x" : "y"}</p>', '<p>Bem-vindo</p>', '<p>Mágicos Ltda</p>', '<button>Desbloquear</button>', '<p>Turbine!</p> {/* tatile-ignorar */}']) {
    assert.ok(!tsx(t, 'texto-de-propaganda', bom) || bom.includes('Mágicos'), bom)
  }
  assert.ok(!acha(t, 'texto-de-propaganda', { 'a.tsx': 'const a = !!user\nif (a !== 2) unlock()\nconst turbine = seamless ? magic : 1\n' }), 'código')
  assert.ok(!acha(t, 'texto-de-propaganda', { 'a.tsx': '// Turbine seu app!\nconst a = 1\n' }), 'comentário')
  assert.ok(acha(t, 'texto-de-propaganda', { 'a.tsx': 'export const x = (\n  <p>\n    Turbine seu app\n  </p>\n)\n' }), 'texto em várias linhas')
  assert.ok(acha(t, 'texto-de-propaganda', { 'a.html': '<h1>Revolucione sua rotina</h1>\n' }))
})

test('hover-sem-mouse: :hover fora de @media (hover: hover) avisa, dentro passa, Tailwind só sem a config', t => {
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.css': 'a:hover { color: red }\n' }))
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.css': 'a,\nb:hover {\n  color: var(--destaque);\n}\n' }))
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.css': '@media (min-width: 600px) {\n  a:hover { color: var(--destaque) }\n}\n' }))
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.scss': '.a {\n  &:hover {\n    color: var(--destaque);\n  }\n}\n' }))
  for (const bom of ['@media (hover: hover) {\n  a:hover { color: var(--destaque) }\n}\n', '@media (hover:hover) and (pointer:fine) {\n  a:hover {\n    color: var(--destaque);\n  }\n}\n',
    '@media (hover: hover) { a:hover { color: var(--destaque) } }\n', '@media (any-hover: hover) {\n  .a {\n    &:hover { color: var(--destaque) }\n  }\n}\n', 'a:not(:hover) { color: var(--texto) }\n',
    'a:focus-visible { color: var(--destaque) }\n', '/* a:hover */\na { color: var(--texto) }\n']) assert.ok(!acha(t, 'hover-sem-mouse', { 'a.css': bom }), bom)
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.css': '@media (hover: hover) {\n  a:hover { color: red }\n}\nb:hover { color: red }\n' }), 'depois do bloco protegido volta a valer')
  const dois = auditar(projeto(t, { 'a.css': 'a:hover { color: red }\nb:hover { color: red }\n' }))
  assert.equal(dois.achados.filter(a => a.regra === 'hover-sem-mouse').length, 1, 'uma vez por arquivo')
  const lugar = '<button className="hover:bg-blue-500">x</button>\n'
  assert.ok(!acha(t, 'hover-sem-mouse', { 'a.tsx': lugar }), 'sem config do Tailwind não dá para saber')
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.tsx': lugar, 'tailwind.config.js': 'module.exports = { content: [] }\n' }))
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.tsx': '<p className="md:group-hover:opacity-100">x</p>\n', 'tailwind.config.js': 'module.exports = {}\n' }))
  assert.ok(!acha(t, 'hover-sem-mouse', { 'a.tsx': lugar, 'tailwind.config.js': 'module.exports = { future: { hoverOnlyWhenSupported: true } }\n' }))
  assert.ok(!acha(t, 'hover-sem-mouse', { 'a.tsx': lugar, 'tailwind.config.js': 'module.exports = {}\n', 'package.json': '{"dependencies":{"tailwindcss":"^4.0.0"}}\n' }), 'v4 já protege')
  assert.ok(acha(t, 'hover-sem-mouse', { 'a.tsx': lugar, 'tailwind.config.js': 'module.exports = {}\n', 'package.json': '{"dependencies":{"tailwindcss":"^3.4.1"}}\n' }))
  assert.ok(!acha(t, 'hover-sem-mouse', { 'a.tsx': 'const s = { hover: { opacity: 1 } }\n', 'tailwind.config.js': 'module.exports = {}\n' }))
})

test('rolagem-vaza: área que rola sem overscroll-behavior dá erro, com contain passa, html/body passam', t => {
  for (const ruim of ['.lista { max-height: 300px; overflow: auto }\n', '.a {\n  overflow-y: scroll;\n  gap: var(--pad);\n}\n', '.a { overflow-x: auto }\n'])
    assert.ok(acha(t, 'rolagem-vaza', { 'a.css': ruim }), ruim)
  for (const bom of ['.lista { overflow: auto; overscroll-behavior: contain }\n', '.a {\n  overflow: auto;\n  overscroll-behavior-y: contain;\n}\n',
    '.a { overflow: hidden }\n', 'html { overflow: auto }\n', 'body { overflow-y: scroll }\n', '/* .a { overflow: auto } */\n',
    '.a { overflow: auto; overscroll-behavior: contain }\n.b { color: var(--texto) }\n'])
    assert.ok(!acha(t, 'rolagem-vaza', { 'a.css': bom }), bom)
  assert.ok(acha(t, 'rolagem-vaza', { 'a.css': '.a { overflow: auto; overscroll-behavior: contain } .b { overflow: auto }\n' }), 'cada regra da linha conta sozinha')
  assert.ok(!acha(t, 'rolagem-vaza', { 'a.tsx': 'const s = { overflow: "auto" }\n' }), 'só CSS')
  assert.ok(acha(t, 'rolagem-vaza', { 'a.html': '<div style="height:60px;overflow:auto">x</div>\n' }), 'style em linha')
  assert.ok(!acha(t, 'rolagem-vaza', { 'a.html': '<div style="height:60px;overflow:auto;overscroll-behavior:contain">x</div>\n' }), 'style em linha com contain')
})
