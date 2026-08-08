import { TsLanguageService } from '../../src/lib/lsp/tsLanguageService'

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

  console.log('=== LSP real: núcleo TypeScript ===')

  const ls = new TsLanguageService(['/workspace'])

  // Archivos del workspace
  ls.openDocument({ uri: 'file:///workspace/math.ts', text: `export function add(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;
`, languageId: 'typescript', version: 1 })

  ls.openDocument({ uri: 'file:///workspace/main.ts', text: `import { add, PI } from './math';

const sum = add(2, 3);
console.log(sum, PI);
`, languageId: 'typescript', version: 1 })

  // ---- completion ----
  const comp = ls.completion('file:///workspace/main.ts', 1, 20)
  check('completion: sugiere add', comp?.some((c) => c.label === 'add'), JSON.stringify(comp?.slice(0, 5).map((c) => c.label)))

  // ---- definition (entre archivos) ----
  // cursor sobre "add(" en línea 3, columna 15
  const def = ls.definition('file:///workspace/main.ts', 2, 14)
  check('definition: cruza archivos → math.ts', def?.some((d) => d.uri.includes('math.ts')), JSON.stringify(def))

  // ---- references ----
  const refs = ls.references('file:///workspace/math.ts', 0, 15)
  check('references: encuentra uso en main.ts', refs?.some((r) => r.uri.includes('main.ts')), JSON.stringify(refs))

  // ---- hover ----
  const hover = ls.hover('file:///workspace/main.ts', 2, 14)
  const hoverValue = typeof hover?.contents === 'object' && 'value' in hover.contents ? (hover.contents as { value: string }).value : String(hover?.contents)
  check('hover: devuelve firma de add', hoverValue.includes('add'), hoverValue)

  // ---- rename ----
  const rename = ls.rename('file:///workspace/main.ts', 2, 14, 'sumar')
  check('rename: genera cambios', rename && Object.keys(rename.changes).length > 0)
  check('rename: afecta math.ts', rename?.changes?.some((c) => c.textDocument.uri.includes('math.ts')))

  // ---- documentSymbol ----
  const symbols = ls.documentSymbol('file:///workspace/math.ts')
  check('documentSymbol: encuentra add', symbols?.some((s: any) => s.name === 'add'))

  // ---- signatureHelp ----
  const sig = ls.signatureHelp('file:///workspace/main.ts', 2, 17)
  check('signatureHelp: firma de add(a,b)', sig?.signatures?.some((s) => s.label.includes('add')), JSON.stringify(sig?.signatures?.[0]?.label))

  // ---- format ----
  // Código mal formateado: debe producir ediciones
  ls.changeDocument('file:///workspace/fmt.ts', `function x(){return 1;}
const y=2;`, 1)
  ls.openDocument({ uri: 'file:///workspace/fmt.ts', text: `function x(){return 1;}
const y=2;`, languageId: 'typescript', version: 1 })
  const fmt = ls.formatDocument('file:///workspace/fmt.ts', 4, true)
  check('format: devuelve ediciones para código sin formato', fmt !== null && fmt.length > 0, JSON.stringify(fmt))

  // ---- highlight ----
  const hl = ls.documentHighlight('file:///workspace/main.ts', 2, 14)
  check('highlight: detecta uso', hl && hl.length > 0)

  // ---- folding ----
  ls.openDocument({ uri: 'file:///workspace/big.ts', text: `export function longFunction() {
  // a long body that is definitely more than forty characters long in total
  const a = 1;
  const b = 2;
  const c = 3;
  return a + b + c;
}
`, languageId: 'typescript', version: 1 })
  const fold = ls.foldingRanges('file:///workspace/big.ts')
  check('folding: detecta función', fold && fold.length > 0, JSON.stringify(fold))

  // ---- cambios incrementales ----
  // nuevo texto: línea0 import, línea1 vacía, línea2 const x = add(...)
  // "const x = add(" → a=10,d=11,d=12 (cursor en 12 sobre la 'd')
  ls.changeDocument('file:///workspace/main.ts', `import { add, PI } from './math';\n\nconst x = add(10, 5);\n`, 2)
  const def2 = ls.definition('file:///workspace/main.ts', 2, 12)
  check('definition: tras cambio de documento', !!def2 && def2.some((d) => d.uri.includes('math.ts')), JSON.stringify(def2))

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

void main()
