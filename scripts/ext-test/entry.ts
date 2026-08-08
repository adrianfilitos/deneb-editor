// Prueba del motor de extensiones real de Deneb: extracción VSIX + cargador
// CommonJS + polyfills de Node (fs/path) sobre el workspace + activación.
// Corre en Node vía esbuild con stubs de monaco/zustand.

;(globalThis as any).localStorage = (() => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k) : null),
    setItem: (k: string, v: string) => {
      m.set(k, v)
    },
    removeItem: (k: string) => {
      m.delete(k)
    },
  }
})()

;(globalThis as any).window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true } }
;(globalThis as any).document = { head: { appendChild() {} }, createElement() { return { setAttribute() {}, textContent: '' } } }

const FIXTURE: Record<string, string> = {
  'extension/package.json': JSON.stringify(
    {
      name: 'fixture-demo',
      publisher: 'deneb',
      version: '1.0.0',
      displayName: 'Fixture Demo',
      description: 'Extensión de prueba del Extension Host de Deneb',
      engines: { vscode: '^1.80.0' },
      main: 'main.js',
      contributes: {
        commands: [{ command: 'fixture.hello', title: 'Fixture: Hola', category: 'Fixture' }],
        languages: [{ id: 'xlang', extensions: ['.xlf'] }],
        menus: { 'editor/context': [{ command: 'fixture.hello', group: '1_modification' }] },
        configuration: {
          title: 'Fixture',
          properties: { 'fixture.port': { type: 'number', default: 5500 } },
        },
      },
    },
    null,
    2,
  ),
  'extension/main.js': `const vscode = require('vscode')
const path = require('path')
const fs = require('fs')
const helper = require('./helper')

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('fixture.hello', function () {
      vscode.window.showInformationMessage('Hola desde la extension de prueba')
      return helper.tag() + ':ok'
    }),
    vscode.commands.registerCommand('fixture.list', function () {
      return fs.readdirSync('.').join(',')
    }),
    vscode.commands.registerCommand('fixture.read', function (file) {
      const p = path.join('.', file)
      return fs.readFileSync(p, 'utf8')
    }),
    vscode.commands.registerCommand('fixture.write', function (file, content) {
      fs.writeFileSync(file, content)
      return fs.readFileSync(file, 'utf8')
    })
  )
}

function deactivate() {}

module.exports = { activate, deactivate }
`,
  'extension/helper.js': `module.exports = { tag() { return 'HELPER' } }`,
}

const enc = new TextEncoder()

async function main() {
  const { zipSync, strToU8 } = await import('fflate')
  const bytes = zipSync({
    'extension/package.json': strToU8(FIXTURE['extension/package.json']),
    'extension/main.js': strToU8(FIXTURE['extension/main.js']),
    'extension/helper.js': strToU8(FIXTURE['extension/helper.js']),
  })

  let pass = 0
  let fail = 0
  const check = (name: string, ok: boolean, extra?: unknown) => {
    if (ok) {
      pass++
      console.log(`  [PASS] ${name}`)
    } else {
      fail++
      console.log(`  [FAIL] ${name}${extra !== undefined ? '  →  ' + String(extra) : ''}`)
    }
  }

  // ------------------------------------------------------------------
  // 1) Extracción completa del .vsix
  // ------------------------------------------------------------------
  const { parseVsix } = await import('../../src/lib/vsixParser')
  let parsed: any
  try {
    parsed = parseVsix(bytes)
  } catch (e) {
    console.log('[FAIL] parseVsix lanzó:', (e as Error).message)
    process.exit(1)
    return
  }
  console.log('\n=== 1) VSIX extraído (parseVsix) ===')
  check('id = deneb.fixture-demo', parsed.id === 'deneb.fixture-demo', parsed.id)
  check('main = main.js', parsed.main === 'main.js')
  check('el árbol de archivos incluye helper.js', 'helper.js' in parsed.files)
  const cont = parsed.pkg.contributes
  check('contributes.languages → .xlf', cont.languages[0].extensions[0] === '.xlf')
  check('contributes.menus → editor/context', cont.menus['editor/context'][0].command === 'fixture.hello')
  check('contributes.configuration → fixture.port=5500', cont.configuration.properties['fixture.port'].default === 5500)

  // ------------------------------------------------------------------
  // Workspace real (proyecto demo) en el store
  // ------------------------------------------------------------------
  const { useEditorStore } = await import('../../src/store/editorStore')
  const { createDemoRoot, setBackend } = await import('../../src/lib/fileSystem')
  setBackend('virtual')
  useEditorStore.setState({ root: createDemoRoot(), demoMode: true })

  // ------------------------------------------------------------------
  // 2) Extension Host: polyfills + cargador + activación
  // ------------------------------------------------------------------
  const { getNodeBuiltins } = await import('../../src/lib/extensions/nodeBuiltins')
  const { CommonJsLoader } = await import('../../src/lib/extensions/loader')
  const { extFs } = await import('../../src/lib/extensions/extFs')
  await extFs.hydrate()
  console.log('  [debug] claves del espejo:', [...((extFs as any).cache?.keys() || [])])

  const registered = new Map<string, (...a: any[]) => any>()
  const messages: string[] = []
  const mockVscode: any = {
    Version: '1.0.0',
    commands: {
      registerCommand(id: string, h: (...a: any[]) => any) {
        registered.set(id, h)
        return { dispose() {} }
      },
    },
    window: {
      showInformationMessage: (m: string) => {
        messages.push(m)
        return Promise.resolve(undefined)
      },
    },
    env: { appName: 'Deneb' },
    workspace: {
      workspaceFolders: [{ name: 'demo-project', uri: { fsPath: 'demo-project' } }],
      getConfiguration: () => ({ get: () => undefined, has: () => false }),
    },
  }

  const builtins = getNodeBuiltins()
  const loader = new CommonJsLoader(parsed.files, {
    vscode: mockVscode,
    builtins,
    process: builtins.process,
    globalThisRef: globalThis,
  })

  let exported: any
  try {
    exported = loader.loadMain(parsed.main!)
  } catch (e) {
    console.log('[FAIL] el main de la extensión no cargó:', (e as Error).message)
    process.exit(1)
    return
  }

  console.log('\n=== 2) Extension Host (cargador CommonJS + activate) ===')
  const activate = typeof exported === 'function' ? exported : exported?.activate
  const context = { subscriptions: [] as any[] }
  if (typeof activate === 'function') {
    try {
      const r = activate(context)
      if (r && typeof r.then === 'function') await r
      console.log('  [PASS] activate() se ejecutó sin errores')
    } catch (e) {
      console.log('[FAIL] activate() lanzó:', (e as Error).message)
      process.exit(1)
      return
    }
  } else {
    console.log('[FAIL] la extensión no exporta activate()')
    process.exit(1)
    return
  }

  check('registró fixture.hello', registered.has('fixture.hello'))
  check('registró fixture.list', registered.has('fixture.list'))
  check('registró fixture.read', registered.has('fixture.read'))
  check('registró fixture.write', registered.has('fixture.write'))

  // ------------------------------------------------------------------
  // 3) Los comandos de la extensión funcionan con fs/path reales
  // ------------------------------------------------------------------
  console.log('\n=== 3) Comandos ejecutados con polyfills fs/path ===')
  const run = async (id: string, ...args: any[]) => {
    const h = registered.get(id)
    if (!h) return `NO-HANDLER:${id}`
    const r = h(...args)
    return r && typeof r.then === 'function' ? await r : r
  }

  const list = await run('fixture.list')
  check('fixture.list → fs.readdirSync del workspace', typeof list === 'string' && list.includes('package.json') && list.includes('src'), String(list).slice(0, 80))

  const pkg = await run('fixture.read', 'package.json')
  let pkgName = ''
  try {
    pkgName = JSON.parse(String(pkg)).name
  } catch {
    // ignore
  }
  check('fixture.read → fs.readFileSync + path.join', pkgName === 'demo-project', String(pkg).slice(0, 60))

  const written = await run('fixture.write', 'nuevo-archivo.txt', 'Hola desde la extension')
  check('fixture.write → fs.writeFileSync + readFileSync', String(written).includes('Hola desde la extension'), String(written).slice(0, 40))

  const hello = await run('fixture.hello')
  check('fixture.hello → require("./helper.js") relativo + comando', hello === 'HELPER:ok', hello)
  check('window.showInformationMessage se llamó', messages.some((m) => m.includes('Hola desde la extension')), messages)

  const pathPoly = builtins.path as any
  check('polyfill path.join("a","b") === "a/b"', pathPoly.join('a', 'b') === 'a/b', pathPoly.join('a', 'b'))
  check('polyfill path.basename("/x/y.js") === "y.js"', pathPoly.basename('/x/y.js') === 'y.js', pathPoly.basename('/x/y.js'))
  check('polyfill path.extname("a.ts") === ".ts"', pathPoly.extname('a.ts') === '.ts', pathPoly.extname('a.ts'))

  // ------------------------------------------------------------------
  // 4) Evaluador de cláusulas "when" (menús contextuales de extensiones)
  // ------------------------------------------------------------------
  const { evaluateWhen } = await import('../../src/lib/extensions/menuRegistry')
  console.log('\n=== 4) when (menús contextuales) ===')
  check('resourceLangId == html → true en html', evaluateWhen('resourceLangId == html', { resourceLangId: 'html' }) === true)
  check('resourceLangId == html → false en javascript', evaluateWhen('resourceLangId == html', { resourceLangId: 'javascript' }) === false)
  check('OR: html || xml', evaluateWhen('resourceLangId == html || resourceExtname == .xml', { resourceExtname: '.xml' }) === true)
  check('AND con paréntesis', evaluateWhen('(resourceLangId == html) && explorerResourceIsFolder == false', { resourceLangId: 'html', explorerResourceIsFolder: false }) === true)

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('Infraestructura de prueba falló:', e)
  process.exit(2)
})
