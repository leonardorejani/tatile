// Serve a demo em http://localhost:PORTA (padrao 4870)
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('..', import.meta.url))
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

export function servir(port = Number(process.env.PORTA ?? 4870), host = process.env.HOST) {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://x').pathname
    // so expoe as paginas de teste e os tokens CSS (os HTML apontam ../codigo/*.css)
    const file = /^\/codigo\/(espaco|cor|tipo|forma|movimento)\.css$/.test(path) ? path.slice(1) : 'teste/' + (path.endsWith('/') ? path + 'index.html' : path).slice(1)
    if (path === '/favicon.ico') return res.writeHead(204).end()
    if (file.includes('..') || !/^(teste\/(index\.html|vitrine\.html|demo\/|rn\/|espacamento\/|prototipo\/|movimento\/)|codigo\/(espaco|cor|tipo|forma|movimento)\.css$)/.test(file)) return res.writeHead(404).end()
    try {
      const body = await readFile(join(dir, file))
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise(r => server.listen(port, host, () => r(server)))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await servir()
  console.log(`demo: http://localhost:${s.address().port}/`)
}
