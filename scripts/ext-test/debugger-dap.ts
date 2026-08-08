// Prueba del adaptador DAP real (electron/debugAdapter.cjs) sin Electron:
// instancia CDPDebugAdapter y traduce las llamadas del protocolo a CDP.
import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { CDPDebugAdapter } = require('../../electron/debugAdapter.cjs')

async function main() {
  let pass = 0
  let fail = 0
  const check = (name: string, ok: boolean, extra?: unknown) => {
    if (ok) {
      pass++
      console.log(`  [PASS] ${name}`)
    } else {
      fail++
      console.log(`  [FAIL] ${name}${extra !== undefined ? ' → ' + String(extra) : ''}`)
    }
  }

  console.log('=== Adaptador DAP real: CDP ===')

  const dir = mkdtempSync(join(tmpdir(), 'deneb-dap-'))
  const script = join(dir, 'app.js')
  writeFileSync(script, `function add(a, b) {
  const total = a + b;
  return total;
}
console.log('result:', add(2, 3));
setInterval(() => {}, 1000);
`)

  const adapter = new CDPDebugAdapter()
  const stopEvents: unknown[] = []
  adapter.onEvent = (type, data) => {
    if (type === 'stopped') stopEvents.push(data)
  }
  const consoleLines: string[] = []
  adapter.onConsole = (_c, text) => consoleLines.push(text)

  // 1) start → conecta y compila (pausa inicial en la 1ª línea del usuario)
  await adapter.start({ program: script })
  // esperar la pausa inicial
  await new Promise((r) => setTimeout(r, 600))
  check('start conecta y compila', true)

  // 2) setBreakpoints → breakpoint real en línea 3
  const bpRes = await adapter.setBreakpoints([3], script)
  check('setBreakpoints verifica línea 3', bpRes[0]?.verified === true, JSON.stringify(bpRes))

  // 3) continuar → pausa en el breakpoint (2º evento stopped)
  await adapter.continue_()
  await new Promise((r) => setTimeout(r, 800))
  const bpStop = stopEvents[stopEvents.length - 1] as { frames?: { line: number }[] } | undefined
  check('pausa en el breakpoint (2º stopped)', stopEvents.length >= 2, `stops=${stopEvents.length}`)
  check('frame línea 3', bpStop?.frames?.[0]?.line === 3, JSON.stringify(bpStop?.frames?.[0]))

  // 4) evaluate variable local del frame activo (parámetro a de add(a,b))
  const ev = await adapter.evaluate('a', 0)
  check('evaluate variable del scope', ev.result === '2', JSON.stringify(ev))

  // 5) continuar hasta el final
  await adapter.continue_()
  await new Promise((r) => setTimeout(r, 500))
  check('console llega (stdout)', consoleLines.some((l) => l.includes('result: 5')), JSON.stringify(consoleLines))

  await adapter.disconnect()
  rmSync(dir, { recursive: true, force: true })

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

void main()
