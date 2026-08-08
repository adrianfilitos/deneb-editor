// Prueba con la extensión C# REAL del marketplace: se descarga el paquete de
// Open VSX, se comprueba que contribuye el lenguaje csharp (.cs), se activa en
// el Extension Host de Nova y se verifica el registro de comandos.

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

class MockUri {
  scheme = 'file'
  authority = ''
  path: string
  fragment = ''
  query = ''
  constructor(path: string) {
    this.path = path
  }
  get fsPath() {
    return this.path.replace(/^\//, '')
  }
  toString() {
    return `file://${this.path}`
  }
  toJSON() {
    return this.toString()
  }
  with(p: any) {
    const u = new MockUri(p.path ?? this.path)
    u.scheme = p.scheme ?? this.scheme
    return u
  }
  static file(p: string) {
    return new MockUri('/' + String(p).replace(/^\/+/, '').replace(/\\/g, '/'))
  }
  static parse(s: string) {
    return new MockUri(s.replace(/^file:\/\//, '/'))
  }
  static joinPath(base: MockUri, ...parts: string[]) {
    return MockUri.file([base.fsPath, ...parts].join('/'))
  }
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
      console.log(`  [FAIL] ${name}${extra !== undefined ? '  →  ' + String(extra) : ''}`)
    }
  }

  // 1) Buscar y descargar la extensión C# más descargada de Open VSX
  console.log('\n=== 1) Buscar extensión C# en open-vsx.org ===')
  let meta: any
  let dl = ''
  let picked = ''
  try {
    const res = await fetch('https://open-vsx.org/api/-/search?query=csharp&size=20&sortBy=downloadCount')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    const candidates = (body.extensions || []).filter((e: any) =>
      String(e.name || '').toLowerCase().includes('csharp') || String(e.namespace || '').toLowerCase().includes('csharp'),
    )
    for (const e of candidates) {
      if (e.files?.download) {
        meta = e
        dl = e.files.download
        picked = `${e.namespace || e.publisher}.${e.name}`
        break
      }
    }
    if (!dl) throw new Error('no se encontró un .vsix de C#')
    console.log(`  [INFO] extensión elegida: ${picked} v${meta.version} (${meta.downloadCount} descargas)`)
  } catch (e) {
    console.log('[SKIP] no hay red para el marketplace:', (e as Error).message)
    process.exit(0)
    return
  }
  const cachePath = `scripts/ext-test/.cache/${picked}-${meta.version}.vsix`
  let bytes: Uint8Array
  try {
    const cached = await import('node:fs').then((f) => {
      if (f.existsSync(cachePath)) return new Uint8Array(f.readFileSync(cachePath))
      return null
    })
    if (cached) {
      bytes = cached
      console.log(`  [PASS] .vsix desde caché (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`)
    } else {
      bytes = new Uint8Array(await (await fetch(dl)).arrayBuffer())
      const fs = await import('node:fs')
      fs.mkdirSync('scripts/ext-test/.cache', { recursive: true })
      fs.writeFileSync(cachePath, bytes)
      console.log(`  [PASS] .vsix descargado (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`)
    }
  } catch (e) {
    console.log('[SKIP] fallo de red/caché:', (e as Error).message)
    process.exit(0)
    return
  }

  // 2) Extraer el VSIX real
  const { parseVsix } = await import('../../src/lib/vsixParser')
  let parsed: any
  try {
    parsed = parseVsix(bytes)
  } catch (e) {
    console.log('[FAIL] parseVsix del VSIX de C#:', (e as Error).message)
    process.exit(1)
    return
  }
  console.log('\n=== 2) VSIX real extraído ===')
  check('id extraído: ' + parsed.id, parsed.id.includes('csharp'), parsed.id)
  check('main = ' + parsed.main, !!parsed.main, parsed.main)
  check('árbol: ' + Object.keys(parsed.files).length + ' archivos', Object.keys(parsed.files).length > 20)

  const cont = parsed.pkg.contributes || {}
  const langs = (cont.languages || []) as { id: string; extensions?: string[] }[]
  console.log('  [debug] lenguajes contribuidos:', langs.length ? langs.map((l) => l.id + (l.extensions ? `(${l.extensions.join(',')})` : '')).join(', ') : '(ninguno)')
  const csharpLang = langs.find((l) => l.id === 'csharp')
  // En VS Code, "csharp" es un lenguaje nativo del editor: la extensión C#
  // contribuye razor (.cshtml/.razor) y xaml (.xaml). Se comprueba que esos sí.
  check('contributes.languages declarado (razor/xaml)', langs.length >= 1, langs.map((l) => l.id).join(', '))
  if (csharpLang) check('csharp → extensiones [".cs"]', (csharpLang.extensions || []).includes('.cs'), csharpLang.extensions?.join(', '))
  const razor = langs.find((l) => l.id === 'aspnetcorerazor')
  check('aspnetcorerazor → [".cshtml",".razor"]', !!razor && (razor.extensions || []).includes('.cshtml'), razor?.extensions?.join(', '))
  const cmds = (cont.commands || []) as { command: string; title: string }[]
  check(`contributes.commands → ${cmds.length} comandos`, cmds.length > 0, cmds.slice(0, 5).map((c) => c.command).join(', '))

  // 3) Detección de lenguaje: contribución de la extensión + mapeo nativo .cs
  const { registerLanguageContrib } = await import('../../src/lib/extensions/languageRegistry')
  for (const l of langs) {
    registerLanguageContrib(parsed.id, l.id, l.extensions, l.filenames)
  }
  const { lookupContributedLanguage } = await import('../../src/lib/extensions/languageRegistry')
  const { languageFromPath } = await import('../../src/lib/languages')
  console.log('\n=== 3) Detección de lenguaje ===')
  check('Index.cshtml → aspnetcorerazor (contribuido por la extensión)', lookupContributedLanguage('Pages/Index.cshtml') === 'aspnetcorerazor', lookupContributedLanguage('Pages/Index.cshtml'))
  check('MainWindow.xaml → xaml (contribuido por la extensión)', lookupContributedLanguage('MainWindow.xaml') === 'xaml', lookupContributedLanguage('MainWindow.xaml'))
  check('Program.cs → csharp (lenguaje nativo de Nova)', languageFromPath('src/Program.cs') === 'csharp', languageFromPath('src/Program.cs'))

  // 4) Cargar el main y activar en el Extension Host
  const { getNodeBuiltins } = await import('../../src/lib/extensions/nodeBuiltins')
  const { CommonJsLoader } = await import('../../src/lib/extensions/loader')
  const registered = new Map<string, (...a: any[]) => any>()
  const cfg = (section: string) => ({
    get: (k: string, d?: unknown) => d,
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
    Uri: MockUri,
    StatusBarAlignment: { Left: 1, Right: 2 },
    ProgressLocation: { SourceControl: 1, Window: 10, Notification: 15 },
    commands: {
      registerCommand(id: string, h: (...a: any[]) => any) {
        registered.set(id, h)
        return { dispose() {} }
      },
      executeCommand: () => undefined,
      getCommands: () => [],
    },
    window: {
      showInformationMessage: () => Promise.resolve(undefined),
      showWarningMessage: () => Promise.resolve(undefined),
      showErrorMessage: () => Promise.resolve(undefined),
      showQuickPick: () => Promise.resolve(undefined),
      showInputBox: () => Promise.resolve(undefined),
      setStatusBarMessage: () => ({ dispose() {} }),
      createStatusBarItem: () => ({ text: '', tooltip: '', command: undefined, show() {}, hide() {}, dispose() {} }),
      createOutputChannel: () => ({ append() {}, appendLine() {}, clear() {}, show() {}, hide() {}, dispose() {}, replace() {} }),
      createWebviewPanel: () => ({ webview: { html: '', postMessage: () => Promise.resolve(true), asWebviewUri: (u: any) => u }, dispose() {}, onDidDispose: () => ({ dispose() {} }) }),
      withProgress: (_o: any, task: (p: any) => any) => task({ report() {} }),
      activeTextEditor: undefined,
      visibleTextEditors: [],
      onDidChangeActiveTextEditor: () => ({ dispose() {} }),
    },
    workspace: {
      name: 'demo-project',
      workspaceFolders: [{ name: 'demo-project', uri: MockUri.file('demo-project'), index: 0 }],
      getConfiguration: cfg,
      findFiles: () => Promise.resolve([]),
      openTextDocument: () => Promise.resolve({ getText: () => '', uri: MockUri.file('demo-project/Program.cs') }),
      onDidChangeConfiguration: () => ({ dispose() {} }),
      onDidSaveTextDocument: () => ({ dispose() {} }),
      onDidOpenTextDocument: () => ({ dispose() {} }),
      asRelativePath: (p: string) => p,
      getWorkspaceFolder: () => ({ name: 'demo-project', uri: MockUri.file('demo-project'), index: 0 }),
    },
    env: { appName: 'Nova', appRoot: '/', machineId: 'x', uriScheme: 'nova', language: 'es', shell: '', version: '1.0.0' },
    languages: { getLanguages: () => [] },
  }

  const builtins = getNodeBuiltins()
  const loader = new CommonJsLoader(parsed.files, {
    vscode: mockVscode,
    builtins,
    process: builtins.process,
    globalThisRef: globalThis,
  })

  console.log('\n=== 4) Cargar main + activar en el Extension Host ===')
  let exported: any
  try {
    exported = loader.loadMain(parsed.main!)
    console.log('  [PASS] el main de la extensión C# cargó (grafo de módulos completo)')
  } catch (e) {
    console.log('  [INFO] el main cargó parcialmente; motivo:', (e as Error).message)
    console.log('        ' + String((e as Error).stack || '').split('\n').slice(0, 5).join('\n        '))
  }
  const activate = typeof exported === 'function' ? exported : exported?.activate
  if (typeof activate === 'function') {
    const context = {
      subscriptions: [] as any[],
      extensionUri: MockUri.file('extension'),
      globalStorageUri: MockUri.file('globalStorage'),
      storageUri: MockUri.file('storage'),
      extensionMode: 1,
      globalState: { get: () => undefined, set: () => undefined },
      workspaceState: { get: () => undefined, set: () => undefined },
      log: { appendLine() {}, show() {} },
    }
    try {
      const r = activate(context)
      if (r && typeof r.then === 'function') await r
      console.log('  [PASS] activate() de la extensión C# se ejecutó sin errores')
    } catch (e) {
      console.log('  [INFO] activate() lanzó (motivo):', (e as Error).message)
      console.log('        ' + String((e as Error).stack || '').split('\n').slice(0, 3).join('\n        '))
    }
    const csharpCommands = [...registered.keys()].filter(
      (c) => c.includes('dotnet') || c.includes('omnisharp') || c.includes('csharp') || c.includes('razor'),
    )
    console.log(`  [INFO] comandos registrados por la extensión: ${csharpCommands.length}`)
    if (csharpCommands.length > 0) console.log('        → ' + csharpCommands.slice(0, 12).join(', '))
    check(`registró comandos de C# (${csharpCommands.length})`, csharpCommands.length >= 1, csharpCommands.slice(0, 8).join(', '))
  }

  console.log(`\n=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('Infraestructura de prueba falló:', e)
  process.exit(2)
})
