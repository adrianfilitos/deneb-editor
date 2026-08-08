// Prueba del debugger REAL: lanza node --inspect-brk y lo controla por CDP
// (Chrome DevTools Protocol) vía WebSocket, como hace js-debug de VS Code.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'

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

  console.log('=== Debugger DAP real: CDP sobre node --inspect-brk ===')

  const dir = mkdtempSync(join(tmpdir(), 'deneb-dbg-'))
  const script = join(dir, 'app.js')
  writeFileSync(script, `function greet(name) {
  const msg = 'Hola ' + name;
  return msg;
}
const result = greet('mundo');
console.log(result);
`)

  // 1) Lanzar node con --inspect-brk
  const child = spawn(process.execPath, ['--inspect-brk=0', script], { stdio: ['ignore', 'pipe', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', (d) => (stderr += d))

  // 2) Esperar la URL del WebSocket CDP en stderr
  const wsUrl = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout esperando CDP URL: ' + stderr)), 8000)
    child.stderr.on('data', () => {
      const m = /ws:\/\/[^\s]+/.exec(stderr)
      if (m) {
        clearTimeout(timer)
        resolve(m[0])
      }
    })
  })
  check('node --inspect expone URL CDP', wsUrl.startsWith('ws://'), wsUrl)

  // 3) Conectar WebSocket
  const ws = new WebSocket(wsUrl)
  await new Promise<void>((res, rej) => {
    ws.on('open', res)
    ws.on('error', rej)
  })
  check('WebSocket CDP conecta', ws.readyState === WebSocket.OPEN)

  let msgId = 0
  const pending = new Map<number, (v: unknown) => void>()
  const events: { method?: string; params?: Record<string, unknown> }[] = []
  ws.on('message', (data) => {
    const m = JSON.parse(String(data))
    if (m.id !== undefined) {
      const cb = pending.get(m.id)
      if (cb) {
        pending.delete(m.id)
        cb(m)
      }
    } else {
      events.push(m)
    }
  })

  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<unknown>((resolve) => {
      const id = ++msgId
      pending.set(id, (m) => resolve((m as { result?: unknown }).result))
      ws.send(JSON.stringify({ id, method, params }))
    })

  const waitNewEvent = (method: string, timeout = 8000) =>
    new Promise<{ params?: Record<string, unknown> } | null>((resolve) => {
      const t = setTimeout(() => resolve(null), timeout)
      let last = events.length
      const check = () => {
        for (let i = last; i < events.length; i++) {
          if (events[i].method === method) {
            last = events.length
            clearTimeout(t)
            resolve(events[i])
          }
        }
        last = events.length
      }
      ws.on('message', () => check())
      check()
    })

  // 4) Inicializar dominios
  await send('Debugger.enable')
  await send('Runtime.enable')
  await send('Debugger.setBreakpointsActive', { active: true })

  // 5) runIfWaitingForDebugger → el script se compila y pausa en su 1ª línea
  await send('Runtime.runIfWaitingForDebugger')
  const paused0 = await waitNewEvent('Debugger.paused', 6000)
  check('pausa inicial (script del usuario compilado)', !!paused0)

  // Esperar a que el script del usuario esté registrado (scriptParsed).
  // En macOS/Linux el path real puede diferir (/private/tmp vs /tmp), así que
  // comparamos por el nombre base del archivo.
  const scriptBase = script.replace(/\\/g, '/').split('/').pop()
  const scriptLoaded = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 4000)
    const check = () => {
      const ev = events.find(
        (e) => e.method === 'Debugger.scriptParsed' && ((e.params?.url as string | undefined) || '').split('/').pop() === scriptBase,
      )
      if (ev) {
        clearTimeout(t)
        resolve(true)
      }
    }
    ws.on('message', () => check())
    check()
  })
  check('script del usuario compilado (scriptParsed)', scriptLoaded)

  // 6) Poner breakpoint real en la línea 3 (return msg) → se resuelve.
  //    Usamos la URL real reportada por CDP para manejar symlinks de macOS.
  const scriptParsedEv = events.find(
    (e) => e.method === 'Debugger.scriptParsed' && ((e.params?.url as string | undefined) || '').split('/').pop() === scriptBase,
  )
  const scriptParsedUrl = (scriptParsedEv?.params?.url as string | undefined) || 'file:///' + script.replace(/\\/g, '/')
  const setBp = await send('Debugger.setBreakpointByUrl', { lineNumber: 2, url: scriptParsedUrl })
  const bp = setBp as { breakpointId?: string; locations?: { lineNumber: number }[] }
  check('setBreakpointByUrl devuelve breakpointId', !!bp.breakpointId, JSON.stringify(setBp))
  check('breakpoint resuelto en el script', (bp.locations?.length ?? 0) > 0, JSON.stringify(bp.locations))
  const bpId = bp.breakpointId!

  // 7) Continuar → pausa en el breakpoint
  await send('Debugger.resume')
  const paused1 = await waitNewEvent('Debugger.paused', 6000)
  const hitBps = (paused1?.params?.hitBreakpoints as string[] | undefined) || []
  const line = (paused1?.params?.callFrames as { location: { lineNumber: number } }[] | undefined)?.[0]?.location?.lineNumber
  check('pausa en el breakpoint', hitBps.includes(bpId), JSON.stringify(paused1))
  check('línea de pausa correcta (2 → línea 3)', line === 2, `lineNumber=${line}`)

  // 8) Evaluar variable local usando el callFrame del stack (Debugger.evaluateOnCallFrame)
  const callFrameId = ((paused1?.params?.callFrames as { callFrameId?: string }[] | undefined)?.[0]?.callFrameId) || ''
  const evRes = (await send('Debugger.evaluateOnCallFrame', { callFrameId, expression: 'name', returnByValue: true })) as { result?: { value?: unknown } } | undefined
  const evVal = evRes?.result?.value
  check('evaluar variable name en el scope', evVal === 'mundo', String(evVal))

  // 9) Paso a paso (stepOver) → continúa la ejecución más allá del return
  await send('Debugger.stepOver')
  const paused2 = await waitNewEvent('Debugger.paused', 6000)
  const line2 = (paused2?.params?.callFrames as { location: { lineNumber: number } }[] | undefined)?.[0]?.location?.lineNumber
  check('stepOver continúa la ejecución (línea >= 3)', line2 !== undefined && line2 >= 2, `lineNumber=${line2}`)

  // 10) Continuar hasta el final y verificar stdout
  let stdout = ''
  child.stdout.on('data', (d) => (stdout += d))
  await send('Debugger.resume')
  await new Promise((r) => setTimeout(r, 500))
  check('console.log llega a stdout', stdout.includes('Hola mundo'), stdout.trim())

  ws.close()
  child.kill()
  rmSync(dir, { recursive: true, force: true })

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

void main()
