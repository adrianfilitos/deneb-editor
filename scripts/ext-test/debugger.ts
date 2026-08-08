import { instrumentCode, createWorkerSource } from '../../src/lib/debuggerInstrumentation'

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

  console.log('=== Debugger: instrumentación ===')
  const { instrumented } = instrumentCode(`const x = 1
let y = 2
const sum = x + y
console.log(sum)
`)
  check('instrumenta la línea 1', instrumented.includes('await __novaCheck(1);const x = 1'), instrumented.split('\n').slice(0, 2).join(' | '))
  check('instrumenta la línea 4', instrumented.includes('await __novaCheck(4);console.log(sum)'))

  const src2 = instrumentCode(`// comentario
const a = 1

/* bloque */
const b = 2
`).instrumented
  check('no instrumenta comentarios', !src2.includes('__novaCheck(1);//'))
  check('instrumenta la línea 2', src2.includes('__novaCheck(2);const a = 1'))
  check('no instrumenta línea vacía', !src2.includes('__novaCheck(3);'))
  check('instrumenta la línea 5', src2.includes('__novaCheck(5);const b = 2'))

  console.log('=== Debugger: worker ===')
  const w1 = createWorkerSource('await __novaCheck(1);var a = 1;', [1], 'test.js')
  check('serializa breakpoints', w1.includes('__novaBp = [1]'), w1.indexOf('__novaBp'))
  check('incluye wrapper async', w1.includes('(async function () {') && w1.includes('})();'))
  check('captura console', w1.includes("type: 'console'"))
  check('captura errores', w1.includes("type: 'error'"))
  check('marca fin', w1.includes("type: 'done'"))
  check('maneja continue', w1.includes('cmd === \'continue\''))
  check('maneja step', w1.includes('cmd === \'step\''))

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

void main()
