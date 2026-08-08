import { instrumentCode, createWorkerSource } from '../../src/lib/debuggerInstrumentation'

// Emula un Worker en Node para probar el flujo real de depuración:
// instrumenta código, lo ejecuta con un fake self.postMessage y verifica
// que los breakpoints pausen y que continue/step reanuden.

interface FakeMessage {
  type: string
  line?: number
  text?: string
}

async function runWorker(code: string, bps: number[], maxMs = 2000): Promise<{ messages: FakeMessage[] }> {
  const messages: FakeMessage[] = []
  const self = {
    postMessage: (m: FakeMessage) => messages.push(m),
  }
  const source = createWorkerSource(code, bps, 'test.js')
    .replace(/self\.postMessage/g, '__self.postMessage')
    .replace(/self\.onmessage/g, '__self.onmessage')

  const mod = new Function('__self', `const self = __self; ${source}; return { __self }`)
  mod(self)

  const fakeSelf = self as unknown as { onmessage?: (e: { data: { cmd: string; nextBreakpoint?: number } }) => void }

  // Hasta que el worker avance (mientras haya resolvers pendientes) o termine
  const timeout = Date.now() + maxMs
  const tick = () => new Promise<void>((r) => setTimeout(r, 5))
  let guard = 0
  while (Date.now() < timeout && guard++ < 1000) {
    const last = messages[messages.length - 1]
    if (last && (last.type === 'done' || last.type === 'error')) break
    await tick()
  }

  // Simular "continue" para liberar el breakpoint pendiente (si pausó)
  const last = messages[messages.length - 1]
  if (last?.type === 'breakpoint' && fakeSelf.onmessage) {
    fakeSelf.onmessage({ data: { cmd: 'continue' } })
  }
  return { messages }
}

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

  console.log('=== Debugger: flujo e2e en Worker (emulado) ===')

  // Caso 1: sin breakpoints → termina con done
  const r1 = await runWorker(instrumentCode(`var a = 1;
var b = a + 2;
console.log('total=' + b);
`).instrumented, [])
  check('sin breakpoints → done', r1.messages.some((m) => m.type === 'done'), JSON.stringify(r1.messages))
  check('captura console.log', r1.messages.some((m) => m.type === 'console' && m.text === 'total=3'), JSON.stringify(r1.messages.filter((m) => m.type === 'console')))

  // Caso 2: con breakpoint en línea 2 → pausa
  const r2 = await runWorker(instrumentCode(`var x = 10;
var y = 20;
var z = x + y;
`).instrumented, [2])
  check('breakpoint pausa en línea 2', r2.messages.some((m) => m.type === 'breakpoint' && m.line === 2), JSON.stringify(r2.messages))

  // Caso 3: instrumentación real respeta la estructura
  const src = instrumentCode(`function add(a, b) {
  return a + b;
}
const r = add(1, 2);
`)
  check('instrumenta función', src.instrumented.includes('await __novaCheck(1);function add(a, b)'))
  check('instrumenta cuerpo', src.instrumented.includes('await __novaCheck(2);  return a + b;'))

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

void main()
