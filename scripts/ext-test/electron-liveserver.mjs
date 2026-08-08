import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request as httpRequest } from 'node:http'

const require = createRequire(import.meta.url)
const liveServer = require('../../electron/liveServer.cjs')

const dir = mkdtempSync(join(tmpdir(), 'nova-ls-'))
mkdirSync(join(dir, 'css'), { recursive: true })
writeFileSync(join(dir, 'index.html'), '<!doctype html><html><head><title>Demo</title></head><body><h1>Hola Nova</h1></body></html>')
writeFileSync(join(dir, 'css', 'style.css'), 'h1 { color: tomato; }')

let pass = 0
let fail = 0
const check = (name, ok, extra) => {
  if (ok) { pass++; console.log(`  [PASS] ${name}`) }
  else { fail++; console.log(`  [FAIL] ${name}  →  ${extra ?? ''}`) }
}

const started = await liveServer.start(5555, dir)
check('server arranca en 127.0.0.1:5555', started.ok, JSON.stringify(started))
if (!started.ok) {
  console.log('RESULTADO:', pass, 'PASS,', fail, 'FAIL')
  process.exit(fail ? 1 : 0)
}

const page = await fetch('http://127.0.0.1:5555/')
const html = await page.text()
check('GET / sirve index.html (200)', page.status === 200)
check('inyecta el cliente de recarga (__nova_reload)', html.includes('__nova_reload'))

const css = await fetch('http://127.0.0.1:5555/css/style.css')
const cssText = await css.text()
check('GET /css/style.css sirve css', css.status === 200 && cssText.includes('tomato'))

const missing = await fetch('http://127.0.0.1:5555/no-existe.txt')
check('404 para archivos inexistentes', missing.status === 404)

// SSE: abrir la conexión de recarga, leer el primer chunk y cerrarla limpiamente
const sseText = await new Promise((resolve, reject) => {
  const req = httpRequest('http://127.0.0.1:5555/__nova_reload', (res) => {
    let data = ''
    res.on('data', (d) => {
      data += d.toString()
      if (data.includes('connected')) {
        req.destroy()
        resolve(data)
      }
    })
  })
  req.on('error', reject)
  req.end()
})
check('SSE de recarga responde (: connected)', sseText.includes('connected'))

// No se puede abrir dos servidores a la vez
const again = await liveServer.start(5556, dir)
check('no permite dos servidores a la vez', again.ok === false)

const status = liveServer.status()
check('status() reporta running', status.running === true && status.port === 5555)

await liveServer.stop()
const stopped = liveServer.status()
check('stop() apaga el servidor', stopped.running === false)

console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
process.exit(fail ? 1 : 0)
