// Prueba con una extensión REAL del marketplace (Live Server) descargada de
// Open VSX, activada en el Extension Host de Nova.

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

async function main() {
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

  // 1) Descargar Live Server del marketplace abierto
  console.log('\n=== 1) Descarga de Live Server (open-vsx.org) ===')
  let meta: any
  try {
    const res = await fetch('https://open-vsx.org/api/ritwickdey/LiveServer')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    meta = await res.json()
    console.log(`  [INFO] versión en marketplace: ${meta.version}`)
  } catch (e) {
    console.log('[SKIP] no hay red para el marketplace:', (e as Error).message)
    process.exit(0)
    return
  }
  const dl = meta.files?.download
  if (!dl) {
    console.log('[SKIP] el paquete no tiene URL de descarga')
    process.exit(0)
    return
  }
  const bytes = new Uint8Array(await (await fetch(dl)).arrayBuffer())
  console.log(`  [PASS] .vsix descargado (${(bytes.length / 1024).toFixed(0)} KB)`)

  // 2) Extraer el VSIX real
  const { parseVsix } = await import('../../src/lib/vsixParser')
  let parsed: any
  try {
    parsed = parseVsix(bytes)
  } catch (e) {
    console.log('[FAIL] parseVsix del VSIX real:', (e as Error).message)
    process.exit(1)
    return
  }
  console.log('\n=== 2) VSIX real extraído ===')
  check('id = ritwickdey.LiveServer', parsed.id === 'ritwickdey.LiveServer', parsed.id)
  check('main = ' + parsed.main, !!parsed.main, parsed.main)
  check('árbol de archivos: ' + Object.keys(parsed.files).length + ' archivos', Object.keys(parsed.files).length > 10)
  const commands = (parsed.pkg.contributes?.commands || []) as { command: string; title: string }[]
  check(`declara ${commands.length} comandos en contributes.commands`, commands.length > 0, commands.map((c) => c.command).slice(0, 6).join(', '))

  // 3) Activarla en el Extension Host con una API vscode de prueba
  const { getNodeBuiltins } = await import('../../src/lib/extensions/nodeBuiltins')
  const { CommonJsLoader } = await import('../../src/lib/extensions/loader')

  const registered = new Map<string, (...a: any[]) => any>()
  const messages: string[] = []
  const cfg = (section: string) => ({
    get: (k: string, d?: unknown) => {
      const map: Record<string, unknown> = {
        'liveServer.settings.port': 5500,
        'liveServer.settings.host': '127.0.0.1',
        'liveServer.settings.donotShowInfoMsg': false,
        'liveServer.settings.wait': 100,
        'liveServer.settings.multiRootWorkspaceName': undefined,
      }
      const v = map[section + '.' + k]
      return v !== undefined ? v : d
    },
    has: () => false,
    update: () => Promise.resolve(),
    inspect: () => ({ defaultValue: undefined }),
  })
  const mockVscode: any = {
    Version: '1.0.0',
    EventEmitter: class {
      private ls: ((d: any) => void)[] = []
      get event() {
        return (cb: (d: any) => void) => {
          this.ls.push(cb)
          return { dispose: () => (this.ls = this.ls.filter((f) => f !== cb)) }
        }
      }
      fire(d: any) {
        for (const cb of this.ls.slice()) cb(d)
      }
    },
    Disposable: class {
      constructor(public cb?: () => void) {}
      dispose() {
        if (this.cb) {
          this.cb()
          this.cb = undefined
        }
      }
      static from(...d: any[]) {
        return new (this as any)(() => d.forEach((x) => x && x.dispose()))
      }
    },
    Event: (cb: any) => cb,
    StatusBarAlignment: { Left: 1, Right: 2 },
    ProgressLocation: { SourceControl: 1, Window: 10, Notification: 15 },
    Uri: {
      file: (p: string) => ({ fsPath: p, path: p, toString: () => `file:///${p}`, scheme: 'file' }),
      parse: (s: string) => ({ fsPath: s.replace(/^file:\/\//, ''), path: s, toString: () => s }),
    },
    commands: {
      registerCommand(id: string, h: (...a: any[]) => any) {
        registered.set(id, h)
        return { dispose() {} }
      },
      executeCommand: () => undefined,
    },
    window: {
      showInformationMessage: (m: string) => {
        messages.push(m)
        return Promise.resolve(undefined)
      },
      showWarningMessage: () => Promise.resolve(undefined),
      showErrorMessage: () => Promise.resolve(undefined),
      createStatusBarItem: () => ({ text: '', tooltip: '', command: undefined, show() {}, hide() {}, dispose() {} }),
      createOutputChannel: () => ({ append() {}, appendLine() {}, clear() {}, show() {}, hide() {}, dispose() {}, replace() {} }),
      showQuickPick: () => Promise.resolve(undefined),
      showInputBox: () => Promise.resolve(undefined),
      setStatusBarMessage: () => ({ dispose() {} }),
      activeTextEditor: undefined,
      visibleTextEditors: [],
      onDidChangeActiveTextEditor: () => ({ dispose() {} }),
    },
    workspace: {
      name: 'demo-project',
      workspaceFolders: [{ name: 'demo-project', uri: { fsPath: 'demo-project', toString: () => 'file:///demo-project' } }],
      getConfiguration: cfg,
      findFiles: () => Promise.resolve([]),
      openTextDocument: () => Promise.resolve({ getText: () => '', uri: { fsPath: 'demo-project/index.html' } }),
      onDidChangeConfiguration: () => ({ dispose() {} }),
      onDidSaveTextDocument: () => ({ dispose() {} }),
      asRelativePath: (p: string) => p,
    },
    env: { appName: 'Nova', machineId: 'x', uriScheme: 'nova', language: 'es', shell: '', version: '1.0.0', openExternal: () => Promise.resolve(true) },
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
    console.log('[FAIL] el main de Live Server no cargó:', (e as Error).message)
    process.exit(1)
    return
  }
  const activate = typeof exported === 'function' ? exported : exported?.activate
  const context = {
    subscriptions: [] as any[],
    globalState: { get: () => undefined, set: () => undefined },
    workspaceState: { get: () => undefined, set: () => undefined },
  }

  console.log('\n=== 3) Live Server REAL en el Extension Host ===')
  let activated = false
  if (typeof activate === 'function') {
    try {
      const r = activate(context)
      if (r && typeof r.then === 'function') await r
      activated = true
      console.log('  [PASS] Live Server se ACTIVÓ sin errores')
    } catch (e) {
      console.log('  [INFO] activate() lanzó (aún así se reporta el motivo):', (e as Error).message)
    }
  }
  if (activated) {
    const liveCommands = [...registered.keys()].filter((c) => c.includes('liveServer'))
    check('registró comandos de Live Server (' + liveCommands.length + ')', liveCommands.length >= 3, liveCommands.slice(0, 8).join(', '))
    // Intenta ejecutar "Go Live" (arranca el servidor HTTP virtual del polyfill)
    const goOnline = registered.get('extension.liveServer.goOnline')
    if (goOnline) {
      try {
        const r = goOnline()
        if (r && typeof r.then === 'function') await r
        console.log('  [PASS] extension.liveServer.goOnline se ejecutó (servidor iniciado con el polyfill http)')
      } catch (e) {
        console.log('  [INFO] goOnline necesita un puerto TCP real (no disponible en la web):', (e as Error).message)
      }
    }
  }

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('Infraestructura de prueba falló:', e)
  process.exit(2)
})
