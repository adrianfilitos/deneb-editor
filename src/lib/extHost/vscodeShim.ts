import * as monaco from 'monaco-editor'
import { registerDynamicCommand, unregisterDynamicCommand } from '../commandRegistry'
import { commandById } from '../../commands'
import { useEditorStore } from '../../store/editorStore'

// ---------------------------------------------------------------------------
// Tipos base (convertidores vscode <-> monaco)
// ---------------------------------------------------------------------------

interface P {
  line: number
  character: number
}

function toMonacoPos(p: P) {
  return { lineNumber: p.line + 1, column: p.character + 1 }
}

function toMonacoRange(r: any) {
  return {
    startLineNumber: r.start.line + 1,
    startColumn: r.start.character + 1,
    endLineNumber: r.end.line + 1,
    endColumn: r.end.character + 1,
  }
}

function activeEditor(): monaco.editor.IStandaloneCodeEditor | null {
  const e = (window as unknown as { __novaEditor?: monaco.editor.IStandaloneCodeEditor }).__novaEditor
  return e || null
}

const status = (msg: string) => window.dispatchEvent(new CustomEvent('nova:status', { detail: msg }))

// ---------------------------------------------------------------------------
// Creación de la API vscode para una extensión concreta
// ---------------------------------------------------------------------------

export interface HostHandle {
  api: any
  disposeAll: () => void
  context: any
}

const registeredCommandIds = new Map<string, string>() // commandId -> extId

export function createVscodeApi(extId: string, pkg: { id: string; version: string }): HostHandle {
  const disposables: Disposable[] = []

  const push = (d: Disposable): Disposable => {
    disposables.push(d)
    return d
  }

  // ---- tipos ----
  class Position {
    line: number
    character: number
    constructor(line: number, character: number) {
      this.line = line
      this.character = character
    }
    isBefore(o: Position) {
      return this.line < o.line || (this.line === o.line && this.character < o.character)
    }
    translate(dl: number, dc = 0) {
      return new Position(this.line + dl, this.character + dc)
    }
    with(line?: number, character?: number) {
      return new Position(line ?? this.line, character ?? this.character)
    }
    compareTo(o: Position) {
      return this.line - o.line || this.character - o.character
    }
  }

  class Range {
    start: Position
    end: Position
    constructor(a: Position | number, b: Position | number, c?: number, d?: number) {
      if (a instanceof Position && b instanceof Position) {
        this.start = a
        this.end = b
      } else {
        this.start = new Position(a as number, b as number)
        this.end = new Position(c as number, d as number)
      }
    }
    get isEmpty() {
      return this.start.isBefore(this.end) === false && !this.end.isBefore(this.start)
    }
    contains(p: Position) {
      return p.line >= this.start.line && p.line <= this.end.line && p.character >= this.start.character && p.character <= this.end.character
    }
    withStart(p: Position) {
      return new Range(p, this.end)
    }
    withEnd(p: Position) {
      return new Range(this.start, p)
    }
    get isSingleLine() {
      return this.start.line === this.end.line
    }
  }

  class Selection extends Range {
    anchor: Position
    active: Position
    constructor(a: Position | number, b: Position | number, c?: number, d?: number) {
      if (a instanceof Position && b instanceof Position) {
        super(a, b)
        this.anchor = a
        this.active = b
      } else {
        const anchor = new Position(a as number, b as number)
        const active = new Position(c as number, d as number)
        super(anchor, active)
        this.anchor = anchor
        this.active = active
      }
    }
  }

  class Uri {
    scheme: string
    authority: string
    path: string
    query: string
    fragment: string
    constructor(scheme: string, path: string) {
      this.scheme = scheme
      this.authority = ''
      this.path = path
      this.query = ''
      this.fragment = ''
    }
    get fsPath() {
      return this.path.replace(/^\//, '')
    }
    toString() {
      return `${this.scheme}://${this.authority}${this.path}`
    }
    toJSON() {
      return this.toString()
    }
    static parse(s: string) {
      const m = /^([a-z]+):\/\/([^/]*)(\/.*)?$/i.exec(s)
      if (m) {
        const u = new Uri(m[1], m[3] || '/')
        u.authority = m[2]
        return u
      }
      return new Uri('file', s)
    }
    static file(p: string) {
      return new Uri('file', p.replace(/\\/g, '/'))
    }
    static from(parts: any) {
      return new Uri(parts.scheme || 'file', parts.path || '/')
    }
    static isUri(x: any) {
      return x instanceof Uri
    }
  }

  class TextEdit {
    range: Range
    newText: string
    constructor(range: Range, newText: string) {
      this.range = range
      this.newText = newText
    }
    static insert(pos: Position, text: string) {
      return new TextEdit(new Range(pos, pos), text)
    }
    static replace(range: Range, text: string) {
      return new TextEdit(range, text)
    }
    static delete(range: Range) {
      return new TextEdit(range, '')
    }
  }

  class WorkspaceEdit {
    edits: { uri: Uri; range: Range; newText: string }[] = []
    insert(uri: Uri, pos: Position, text: string) {
      this.edits.push({ uri, range: new Range(pos, pos), newText: text })
    }
    replace(uri: Uri, range: Range, text: string) {
      this.edits.push({ uri, range, newText: text })
    }
    delete(uri: Uri, range: Range) {
      this.edits.push({ uri, range, newText: '' })
    }
    set() {}
    get(uri: Uri) {
      return this.edits.filter((e) => e.uri.toString() === uri.toString()).map((e) => new TextEdit(e.range, e.newText))
    }
  }

  const CompletionItemKind = {
    Text: 0,
    Method: 1,
    Function: 2,
    Constructor: 3,
    Field: 4,
    Variable: 5,
    Class: 6,
    Interface: 7,
    Module: 8,
    Property: 9,
    Unit: 10,
    Value: 11,
    Enum: 12,
    Keyword: 13,
    Snippet: 14,
    Color: 15,
    File: 16,
    Reference: 17,
    Folder: 18,
    EnumMember: 19,
    Constant: 20,
    Struct: 21,
    Event: 22,
    Operator: 23,
    TypeParameter: 24,
    User: 25,
    Issue: 26,
  }

  class CompletionItem {
    label: string
    kind?: number
    detail?: string
    documentation?: string | MarkdownString
    insertText?: string | SnippetString
    range?: Range
    constructor(label: string, kind?: number) {
      this.label = label
      this.kind = kind
    }
  }

  class SnippetString {
    value: string
    constructor(value: string) {
      this.value = value
    }
    append(t: string) {
      this.value += t
      return this
    }
  }

  class MarkdownString {
    value: string
    constructor(value?: string) {
      this.value = value || ''
    }
    appendText(t: string) {
      this.value += t
      return this
    }
  }

  class Hover {
    contents: (string | MarkdownString)[]
    range?: Range
    constructor(contents: (string | MarkdownString)[], range?: Range) {
      this.contents = contents
      this.range = range
    }
  }

  class Location {
    uri: Uri
    range: Range
    constructor(uri: Uri, range: Range | Position) {
      this.uri = uri
      this.range = range instanceof Position ? new Range(range, range) : range
    }
  }

  class EventEmitter<T> {
    private listeners: ((d: T) => void)[] = []
    event = (cb: (d: T) => void) => {
      this.listeners.push(cb)
      return { dispose: () => this.listeners.splice(this.listeners.indexOf(cb), 1) }
    }
    fire(d: T) {
      for (const cb of this.listeners.slice()) {
        try {
          cb(d)
        } catch {
          // ignore
        }
      }
    }
  }

  class Disposable {
    private cb: (() => void) | null
    constructor(cb?: () => void) {
      this.cb = cb || null
    }
    dispose() {
      if (this.cb) {
        this.cb()
        this.cb = null
      }
    }
    static from(...ds: Disposable[]) {
      return new Disposable(() => {
        for (const d of ds) d?.dispose()
      })
    }
  }

  class TextDocument {
    private model: any
    uri: Uri
    constructor(model: any, uri?: Uri) {
      this.model = model
      this.uri = uri || Uri.file(`/inmemory/${model.uri?.path || 'file'}`)
    }
    get fileName() {
      return this.uri.fsPath
    }
    get languageId() {
      return this.model.getLanguageId()
    }
    get version() {
      return this.model.getVersionId()
    }
    get isUntitled() {
      return false
    }
    get isDirty() {
      return false
    }
    get lineCount() {
      return this.model.getLineCount()
    }
    getText(range?: Range) {
      if (!range) return this.model.getValue()
      return this.model.getValueInRange(toMonacoRange(range))
    }
    get range() {
      return new Range(0, 0, this.lineCount - 1, this.model.getLineMaxColumn(this.lineCount) - 1)
    }
    lineAt(lineOrPos: number | Position) {
      const line = typeof lineOrPos === 'number' ? lineOrPos : lineOrPos.line
      const text = this.model.getLineContent(line + 1)
      return { text, lineNumber: line, range: new Range(line, 0, line, text.length) }
    }
    offsetAt(pos: Position) {
      return this.model.getOffsetAt(toMonacoPos(pos))
    }
    positionAt(offset: number) {
      const p = this.model.getPositionAt(offset)
      return new Position(p.lineNumber - 1, p.column - 1)
    }
    getWordRangeAtPosition(pos: Position): Range | undefined {
      const w = this.model.getWordAtPosition(toMonacoPos(pos))
      return w ? new Range(pos.line, w.startColumn - 1, pos.line, w.endColumn) : undefined
    }
  }

  class TextEditor {
    private model: any
    document: TextDocument
    constructor(model: any) {
      this.model = model
      this.document = new TextDocument(model)
    }
    get selection(): Selection {
      const sel = activeEditor()?.getSelection()
      if (!sel) return new Selection(0, 0, 0, 0)
      return new Selection(
        sel.startLineNumber - 1,
        sel.startColumn - 1,
        sel.endLineNumber - 1,
        sel.endColumn - 1,
      )
    }
    get selections() {
      return [this.selection]
    }
    edit(callback: (b: { insert: (p: Position, t: string) => void; replace: (r: Range, t: string) => void; delete: (r: Range) => void }) => boolean | void): boolean {
      const edits: { range: any; text: string }[] = []
      const builder = {
        insert: (p: Position, t: string) => edits.push({ range: new Range(p, p), text: t }),
        replace: (r: Range, t: string) => edits.push({ range: r, text: t }),
        delete: (r: Range) => edits.push({ range: r, text: '' }),
      }
      const ok = callback(builder)
      if (ok !== false) {
        activeEditor()?.executeEdits(
          'vscode-ext',
          edits.map((e) => ({ range: toMonacoRange(e.range), text: e.text })),
        )
        return true
      }
      return false
    }
  }

  // ---- eventos globales ----
  const onDidChangeActiveTextEditor = new EventEmitter<TextEditor | undefined>()
  const onDidChangeTextEditorSelection = new EventEmitter<{ textEditor: TextEditor; selections: Selection[] }>()
  const onDidChangeTextDocument = new EventEmitter<{ document: TextDocument; contentChanges: any[] }>()

  window.addEventListener('nova:editor-active', () => {
    const model = activeEditor()?.getModel()
    onDidChangeActiveTextEditor.fire(model ? new TextEditor(model) : undefined)
  })
  window.addEventListener('nova:cursor-pos', () => {
    const model = activeEditor()?.getModel()
    if (!model) return
    const ed = new TextEditor(model)
    onDidChangeTextEditorSelection.fire({ textEditor: ed, selections: ed.selections })
  })
  window.addEventListener('nova:doc-change', (e) => {
    const detail = (e as CustomEvent).detail as { model: any }
    if (!detail?.model) return
    onDidChangeTextDocument.fire({
      document: new TextDocument(detail.model),
      contentChanges: [{ text: detail.model.getValue(), range: new Range(0, 0, detail.model.getLineCount() - 1, detail.model.getLineMaxColumn(detail.model.getLineCount()) - 1) }],
    })
  })

  // ---- commands ----
  const extCommands = new Map<string, (...a: any[]) => any>()

  function registerCommandInternal(id: string, handler: (...a: any[]) => any): Disposable {
    if (extCommands.has(id)) return new Disposable()
    extCommands.set(id, handler)
    registeredCommandIds.set(id, extId)
    registerDynamicCommand({
      id: `ext:${id}`,
      title: id,
      category: 'Extensiones',
      run: () => {
        try {
          const r = handler()
          if (r && typeof r.then === 'function') r.catch(() => {})
        } catch (err) {
          status(`Error en comando ${id}: ${(err as Error).message}`)
        }
      },
    })
    return push(
      new Disposable(() => {
        extCommands.delete(id)
        registeredCommandIds.delete(id)
        unregisterDynamicCommand(`ext:${id}`)
      }),
    )
  }

  function executeCommand(id: string, ...args: any[]) {
    const h = extCommands.get(id)
    if (h) return h(...args)
    // comando propio de Nova (paleta)
    const cmd = commandById(id)
    if (cmd) return cmd.run()
    status(`Comando desconocido: ${id}`)
  }

  // ---- languages ----
  function selectorToLang(selector: any): string | null {
    if (!selector) return null
    if (typeof selector === 'string') return selector
    if (typeof selector.language === 'string') return selector.language
    if (Array.isArray(selector)) {
      for (const s of selector) {
        const l = selectorToLang(s)
        if (l) return l
      }
    }
    return null
  }

  function registerCompletionItemProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model: any, position: any, _token: any, _context: any) => {
          if (!provider.provideCompletionItems) return null
          const doc = new TextDocument(model)
          const pos = new Position(position.lineNumber - 1, position.column - 1)
          const token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) }
          try {
            const res = provider.provideCompletionItems(doc, pos, token, {})
            if (!res) return null
            const items = (res as any[]).map((it) => {
              const word = doc.getWordRangeAtPosition(pos)
              const range = it.range
                ? toMonacoRange(it.range)
                : word
                  ? toMonacoRange(word)
                  : { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column }
              const s: any = {
                label: it.label || '',
                kind: it.kind ?? CompletionItemKind.Text,
                detail: it.detail,
                insertText: it.insertText?.value ?? it.insertText ?? (it.label || ''),
                range,
              }
              if (it.documentation) s.documentation = typeof it.documentation === 'string' ? it.documentation : { value: it.documentation.value || '' }
              if (it.insertText instanceof SnippetString) s.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              return s
            })
            return { suggestions: items }
          } catch (e) {
            status(`Error en completions de la extensión: ${(e as Error).message}`)
            return null
          }
        },
      })
    } catch {
      // lenguaje no disponible
    }
    return push(
      new Disposable(() => {
        reg?.dispose()
      }),
    )
  }

  function registerHoverProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideHover) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerHoverProvider(lang, {
        provideHover: (model: any, position: any) => {
          const doc = new TextDocument(model)
          const pos = new Position(position.lineNumber - 1, position.column - 1)
          const res = provider.provideHover(doc, pos, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) })
          if (!res) return null
          return {
            contents: (res.contents || []).map((c: any) =>
              typeof c === 'string' ? { value: c } : { value: c.value || '' },
            ),
            range: res.range ? toMonacoRange(res.range) : undefined,
          }
        },
      })
    } catch {
      // ignore
    }
    return push(
      new Disposable(() => {
        reg?.dispose()
      }),
    )
  }

  function registerDocumentFormattingEditProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideDocumentFormattingEdits) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerDocumentFormattingEditProvider(lang, {
        provideDocumentFormattingEdits: (model: any, _opts: any, _token: any) => {
          const doc = new TextDocument(model)
          const res = provider.provideDocumentFormattingEdits(doc, { tabSize: useEditorStore.getState().settings.tabSize, insertSpaces: true }, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) })
          if (!res) return null
          return res.map((ed: any) => ({ range: toMonacoRange(ed.range), text: ed.newText }))
        },
      })
    } catch {
      // ignore
    }
    return push(
      new Disposable(() => {
        reg?.dispose()
      }),
    )
  }

  // ---- workspace ----
  function rootInfo() {
    const root = useEditorStore.getState().root
    if (!root) return null
    const abs = (root.handle as { absPath?: string } | null)?.absPath || root.name
    return { name: root.name, abs }
  }

  function getConfiguration(section: string) {
    return {
      get: <T = any>(key: string, def?: T): T => {
        const settings = useEditorStore.getState().settings as unknown as Record<string, any>
        const k = section ? `${section}.${key}` : key
        return (k in settings ? settings[k] : def) as T
      },
      has: (key: string) => {
        const settings = useEditorStore.getState().settings as unknown as Record<string, any>
        const k = section ? `${section}.${key}` : key
        return k in settings
      },
      update: (key: string, value: unknown) => {
        useEditorStore.getState().updateSettings({ [key]: value } as never)
        return Promise.resolve()
      },
    }
  }

  // ---- context / estado ----
  const stateStore = (ns: string) => ({
    get: <T = any>(k: string): T | undefined => {
      try {
        const raw = localStorage.getItem(`nova.extstate.${ns}.${k}`)
        return raw ? (JSON.parse(raw) as T) : undefined
      } catch {
        return undefined
      }
    },
    set: (k: string, v: unknown) => {
      try {
        localStorage.setItem(`nova.extstate.${ns}.${k}`, JSON.stringify(v))
      } catch {
        // ignore
      }
      return v
    },
    update: async (k: string, v: unknown) => {
      try {
        localStorage.setItem(`nova.extstate.${ns}.${k}`, JSON.stringify(v))
      } catch {
        // ignore
      }
    },
  })

  const context = {
    subscriptions: disposables,
    extensionPath: '/',
    extensionUri: Uri.parse(`nova://${extId}`),
    globalState: stateStore(extId + '.global'),
    workspaceState: stateStore(extId + '.workspace'),
    log: {
      appendLine: (l: string) => console.log(`[ext:${extId}]`, l),
      show: () => {},
    },
  }

  const api: any = {
    // tipos
    Position,
    Range,
    Selection,
    Uri,
    TextEdit,
    WorkspaceEdit,
    CompletionItem,
    CompletionItemKind,
    SnippetString,
    MarkdownString,
    Hover,
    Location,
    EventEmitter,
    Event: (cb: any) => cb,
    Disposable,
    Version: '1.0.0',
    ThemeColor: class {
      constructor(public id: string) {}
    },
    commands: {
      registerCommand: registerCommandInternal,
      registerTextEditorCommand: registerCommandInternal,
      executeCommand,
      getCommands: () => [...extCommands.keys()],
    },
    window: {
      showInformationMessage: (msg: string, ..._rest: any[]) => {
        status(msg)
        return Promise.resolve(undefined)
      },
      showWarningMessage: (msg: string, ..._rest: any[]) => {
        status(`⚠ ${msg}`)
        return Promise.resolve(undefined)
      },
      showErrorMessage: (msg: string, ..._rest: any[]) => {
        status(`✕ ${msg}`)
        return Promise.resolve(undefined)
      },
      get activeTextEditor() {
        const model = activeEditor()?.getModel()
        return model ? new TextEditor(model) : undefined
      },
      get visibleTextEditors() {
        const model = activeEditor()?.getModel()
        return model ? [new TextEditor(model)] : []
      },
      onDidChangeActiveTextEditor: onDidChangeActiveTextEditor.event,
      onDidChangeTextEditorSelection: onDidChangeTextEditorSelection.event,
      showTextDocument: () => Promise.resolve(api.window.activeTextEditor),
      createStatusBarItem: () => ({
        text: '',
        tooltip: '',
        command: undefined,
        show: () => {},
        hide: () => {},
        dispose: () => {},
      }),
    },
    workspace: {
      get name() {
        return rootInfo()?.name || ''
      },
      get workspaceFolders() {
        const r = rootInfo()
        return r ? [{ uri: Uri.file(r.abs), name: r.name, index: 0 }] : []
      },
      getConfiguration,
      onDidChangeTextDocument: onDidChangeTextDocument.event,
      onDidOpenTextDocument: () => ({ dispose() {} }),
      asRelativePath: (p: string) => p,
      openTextDocument: async (arg: any) => {
        const path = typeof arg === 'string' ? arg : arg?.fsPath || arg?.path
        if (!path) throw new Error('ruta vacía')
        return { uri: Uri.file(path), getText: () => '', lineCount: 0, languageId: 'plaintext' }
      },
    },
    languages: {
      registerCompletionItemProvider,
      registerHoverProvider,
      registerDocumentFormattingEditProvider,
      registerDocumentRangeFormattingEditProvider: registerDocumentFormattingEditProvider,
    },
    env: {
      appName: 'Nova',
      appRoot: '/',
      language: 'es',
      uriScheme: 'nova',
      version: '1.0.0',
      machineId: 'nova-desktop',
      shell: 'powershell',
    },
    extensions: {
      getExtension: (id: string) => (id === pkg.id ? { id, version: pkg.version, packageJSON: pkg, exports: undefined } : undefined),
    },
    ExtensionContext: { prototype: {} },
  }

  return {
    api,
    context,
    disposeAll: () => {
      for (const d of disposables.slice().reverse()) {
        try {
          d.dispose()
        } catch {
          // ignore
        }
      }
      disposables.length = 0
    },
  }
}
