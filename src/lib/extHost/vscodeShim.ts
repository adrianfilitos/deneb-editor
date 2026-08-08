import * as monaco from 'monaco-editor'
import { registerDynamicCommand, unregisterDynamicCommand } from '../commandRegistry'
import { commandById } from '../../commands'
import { useEditorStore } from '../../store/editorStore'
import { getContributedConfigDefault } from '../extensions/configRegistry'
import { useExtUiStore } from '../../store/extUiStore'
import { registerTreeProvider, unregisterTreeProvider } from '../extensions/treeViewRegistry'
import {
  walkFiles,
  resolvePath,
  readText,
  writeFileAt,
  createDirAt,
  removeAt,
  listAt,
  normalizeRelPath,
  type AnyHandle,
} from '../fileSystem'
import { useExtensionStore } from '../../store/extensionStore'
import { languageFromPath } from '../languages'

// ---------------------------------------------------------------------------
// Utilidades compartidas
// ---------------------------------------------------------------------------

const status = (msg: string) => window.dispatchEvent(new CustomEvent('nova:status', { detail: msg }))

function activeEditor(): monaco.editor.IStandaloneCodeEditor | null {
  const e = (window as unknown as { __novaEditor?: monaco.editor.IStandaloneCodeEditor }).__novaEditor
  return e || null
}

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

const tokenStub = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}

let counter = 0
const nextId = (prefix: string) => `${prefix}-${counter++}`

function rootHandle(): AnyHandle | null {
  return useEditorStore.getState().root?.handle ?? null
}

function rootName(): string {
  return useEditorStore.getState().root?.name ?? ''
}

/** Ruta relativa al workspace desde una Uri/fsPath de la extensión. */
function toRel(uriOrPath: any): string {
  const raw = typeof uriOrPath === 'string' ? uriOrPath : uriOrPath?.fsPath || uriOrPath?.path || ''
  let rel = String(raw).replace(/^file:\/\/\//, '').replace(/^file:\/\//, '').replace(/^nova:\/\//, '')
  rel = normalizeRelPath(rel)
  const root = rootName()
  if (root && rel.startsWith(root + '/')) rel = rel.slice(root.length + 1)
  return rel
}

function stripRoot(path: string): string {
  const root = rootName()
  let rel = String(path).replace(/\\/g, '/')
  if (root && rel.startsWith(root + '/')) rel = rel.slice(root.length + 1)
  return rel
}

function globToRegExp(pattern: string): RegExp {
  let p = pattern
  const brace = /\{([^{}]+)\}/.exec(p)
  if (brace) {
    const alts = brace[1].split(',')
    const inner = alts.map((a) => globToRegExp(p.replace(brace[0], a)).source).join('|')
    return new RegExp('(?:' + inner + ')')
  }
  let re = ''
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (c === '*') {
      if (p[i + 1] === '*') {
        i++
        if (p[i + 1] === '/') i++
        re += '.*'
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else if (c === '.') {
      re += '\\.'
    } else if (c === '/') {
      re += '/'
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp('^' + re + '$')
}

function globMatch(pattern: string, path: string): boolean {
  return globToRegExp(pattern).test(path)
}

function toMarkdown(h: any): monaco.IMarkdownString {
  if (typeof h === 'string') return { value: h }
  return { value: h?.value || String(h) }
}

// ---------------------------------------------------------------------------
// Decoraciones (tipo por extensión -> CSS + colección por editor)
// ---------------------------------------------------------------------------

let decCounter = 0
const decStyles = new Map<string, HTMLStyleElement>()

function decorationCssClass(renderOptions: Record<string, unknown>, key: string): string | undefined {
  const rules: string[] = []
  const add = (k: string, v: unknown) => {
    if (v != null && v !== '') rules.push(`${k}:${v};`)
  }
  add('background-color', renderOptions.backgroundColor)
  add('color', renderOptions.color)
  add('border', renderOptions.border)
  add('border-radius', renderOptions.borderRadius)
  add('outline', renderOptions.outline)
  add('text-decoration', renderOptions.textDecoration)
  add('font-weight', renderOptions.fontWeight)
  add('opacity', renderOptions.opacity)
  add('cursor', renderOptions.cursor)
  add('border-width', renderOptions.borderWidth)
  add('border-style', renderOptions.borderStyle)
  if (!rules.length) return undefined
  const cls = `nova-dec-${key}-${decCounter++}`
  let el = decStyles.get(key)
  if (!el) {
    el = document.createElement('style')
    el.setAttribute('data-nova-dec', key)
    document.head.appendChild(el)
    decStyles.set(key, el)
  }
  el.textContent += `\n.${cls}{${rules.join('')}}`
  return cls
}

function buildMonacoDecoration(renderOptions: Record<string, unknown>, key: string): monaco.editor.IModelDecorationOptions {
  const opts: monaco.editor.IModelDecorationOptions = {} as monaco.editor.IModelDecorationOptions
  const cls = decorationCssClass(renderOptions, key)
  if (cls) {
    opts.inlineClassName = cls
    opts.className = cls
  }
  const gutter = renderOptions.gutterIconPath
  if (gutter) {
    const gcls = decorationCssClass({ backgroundImage: `url(${String(gutter)})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }, key + 'g')
    if (gcls) opts.glyphMarginClassName = gcls
  }
  const rulerColor = (renderOptions.overviewRulerColor as string) || (renderOptions.color as string)
  if (rulerColor) opts.overviewRuler = { color: rulerColor, position: monaco.editor.OverviewRulerLane.Full }
  if (renderOptions.after) {
    const a = renderOptions.after as { contentText?: string }
    opts.after = { content: a.contentText || '' }
  }
  if (renderOptions.before) {
    const b = renderOptions.before as { contentText?: string }
    opts.before = { content: b.contentText || '' }
  }
  if (renderOptions.hoverMessage) opts.hoverMessage = toMarkdown(renderOptions.hoverMessage)
  return opts
}

class TextEditorDecorationType {
  key: string
  baseOptions: monaco.editor.IModelDecorationOptions
  private renderOptions: Record<string, unknown>
  private collections = new Map<monaco.editor.IStandaloneCodeEditor, monaco.editor.IEditorDecorationsCollection>()
  constructor(renderOptions: Record<string, unknown>) {
    this.renderOptions = renderOptions
    this.key = nextId('nova-dec-type')
    this.baseOptions = buildMonacoDecoration(renderOptions, this.key)
  }
  apply(editor: monaco.editor.IStandaloneCodeEditor, decorations: monaco.editor.IModelDeltaDecoration[]) {
    let col = this.collections.get(editor)
    if (!col) {
      col = editor.createDecorationsCollection(decorations)
      this.collections.set(editor, col)
    } else {
      col.set(decorations)
    }
  }
  clear() {
    for (const c of this.collections.values()) c.clear()
  }
  dispose() {
    this.clear()
    this.collections.clear()
  }
}

// ---------------------------------------------------------------------------
// createVscodeApi
// ---------------------------------------------------------------------------

export interface HostHandle {
  api: any
  disposeAll: () => void
  context: any
}

const registeredCommandIds = new Map<string, string>() // commandId -> extId
const globalExtCommands = new Map<string, (...a: any[]) => any>()

// Colecciones de diagnóstico registradas (para re-aplicar al abrir modelos)
const diagnosticCollections: { reapplyFor: (uri: string) => void }[] = []
if (typeof monaco !== 'undefined' && monaco.editor) {
  monaco.editor.onDidCreateModel((model) => {
    const uri = model.uri.toString()
    for (const col of diagnosticCollections) col.reapplyFor(uri)
  })
}

/** Ejecuta un comando registrado por cualquier extensión (o uno propio de Nova). */
const commandOverrides = new Map<string, (...a: any[]) => any>()

/** Permite a Nova interceptar el comportamiento de un comando de una extensión. */
export function overrideExtensionCommand(id: string, fn: (...a: any[]) => any) {
  commandOverrides.set(id, fn)
}

export function executeExtensionCommand(id: string, ...args: any[]): any {
  const ov = commandOverrides.get(id)
  if (ov) {
    try {
      const r = ov(...args)
      if (r && typeof r.then === 'function') r.catch(() => {})
      return r
    } catch (err) {
      status(`Error en comando ${id}: ${(err as Error).message}`)
      return undefined
    }
  }
  const h = globalExtCommands.get(id)
  if (h) {
    try {
      const r = h(...args)
      if (r && typeof r.then === 'function') r.catch(() => {})
      return r
    } catch (err) {
      status(`Error en comando ${id}: ${(err as Error).message}`)
      return undefined
    }
  }
  const cmd = commandById(id)
  if (cmd) return cmd.run()
  return undefined
}

export function createVscodeApi(extId: string, pkg: { id: string; version: string }): HostHandle {
  const disposables: Disposable[] = []
  const push = (d: Disposable): Disposable => {
    disposables.push(d)
    return d
  }

  // ---- tipos base ----
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
    isBeforeOrEqual(o: Position) {
      return !o.isBefore(this)
    }
    isAfter(o: Position) {
      return o.isBefore(this)
    }
    isAfterOrEqual(o: Position) {
      return !this.isBefore(o)
    }
    compareTo(o: Position) {
      return this.line - o.line || this.character - o.character
    }
    translate(dl: number, dc = 0) {
      return new Position(this.line + dl, this.character + dc)
    }
    with(line?: number, character?: number) {
      return new Position(line ?? this.line, character ?? this.character)
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
    get isSingleLine() {
      return this.start.line === this.end.line
    }
    contains(p: Position) {
      return p.line >= this.start.line && p.line <= this.end.line && p.character >= this.start.character && p.character <= this.end.character
    }
    containsRange(r: Range) {
      return this.contains(r.start) && this.contains(r.end)
    }
    withStart(p: Position) {
      return new Range(p, this.end)
    }
    withEnd(p: Position) {
      return new Range(this.start, p)
    }
    intersection(other: Range) {
      if (!this.intersectionRange(other)) return undefined
      const start = this.start.isAfter(other.start) ? this.start : other.start
      const end = this.end.isBefore(other.end) ? this.end : other.end
      return new Range(start, end)
    }
    private intersectionRange(_o: Range) {
      return true
    }
    union(other: Range) {
      const start = this.start.isBefore(other.start) ? this.start : other.start
      const end = this.end.isAfter(other.end) ? this.end : other.end
      return new Range(start, end)
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
    get isReversed() {
      return this.active.isBefore(this.anchor)
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
      return `${this.scheme}://${this.authority}${this.path}${this.query ? '?' + this.query : ''}${this.fragment ? '#' + this.fragment : ''}`
    }
    toJSON() {
      return this.toString()
    }
    with(changes: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }) {
      const u = new Uri(changes.scheme ?? this.scheme, changes.path ?? this.path)
      u.authority = changes.authority ?? this.authority
      u.query = changes.query ?? this.query
      u.fragment = changes.fragment ?? this.fragment
      return u
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
      return new Uri('file', '/' + String(p).replace(/\\/g, '/').replace(/^\/+/, ''))
    }
    static from(parts: any) {
      return new Uri(parts.scheme || 'file', parts.path || '/')
    }
    static isUri(x: any) {
      return x instanceof Uri
    }
    static joinPath(base: Uri, ...parts: string[]) {
      return Uri.file([base.fsPath, ...parts].join('/'))
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
    static setEndOfLine() {
      return undefined as unknown as TextEdit
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
    has() {
      return false
    }
  }

  const CompletionItemKind = {
    Text: 0, Method: 1, Function: 2, Constructor: 3, Field: 4, Variable: 5, Class: 6,
    Interface: 7, Module: 8, Property: 9, Unit: 10, Value: 11, Enum: 12, Keyword: 13,
    Snippet: 14, Color: 15, File: 16, Reference: 17, Folder: 18, EnumMember: 19,
    Constant: 20, Struct: 21, Event: 22, Operator: 23, TypeParameter: 24, User: 25, Issue: 26,
  }

  class CompletionItem {
    label: string
    kind?: number
    detail?: string
    documentation?: string | MarkdownString
    insertText?: string | SnippetString
    range?: Range
    filterText?: string
    sortText?: string
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
    appendCodeblock(code: string, language?: string) {
      this.value += `\n\`\`\`${language || ''}\n${code}\n\`\`\`\n`
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

  const SymbolKind = {
    File: 0, Module: 1, Namespace: 2, Package: 3, Class: 4, Method: 5, Property: 6,
    Field: 7, Constructor: 8, Enum: 9, Interface: 10, Function: 11, Variable: 12,
    Constant: 13, String: 14, Number: 15, Boolean: 16, Array: 17, Object: 18,
    Key: 19, Null: 20, EnumMember: 21, Struct: 22, Event: 23, Operator: 24, TypeParameter: 25,
  }

  class DocumentSymbol {
    name: string
    detail: string
    kind: number
    range: Range
    selectionRange: Range
    children: DocumentSymbol[]
    constructor(name: string, detail: string, kind: number, range: Range, selectionRange: Range) {
      this.name = name
      this.detail = detail
      this.kind = kind
      this.range = range
      this.selectionRange = selectionRange
      this.children = []
    }
  }

  const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 }

  class Diagnostic {
    range: Range
    message: string
    severity: number
    source?: string
    code?: unknown
    constructor(range: Range, message: string, severity = DiagnosticSeverity.Error) {
      this.range = range
      this.message = message
      this.severity = severity
    }
  }

  function monacoSeverity(sev: number): monaco.MarkerSeverity {
    return sev === 0 ? monaco.MarkerSeverity.Error : sev === 1 ? monaco.MarkerSeverity.Warning : sev === 2 ? monaco.MarkerSeverity.Info : monaco.MarkerSeverity.Hint
  }

  function applyDiagnostics(uri: Uri, diagnostics: Diagnostic[], owner: string) {
    const model = monaco.editor.getModel(monaco.Uri.parse(uri.toString()))
    if (!model) return
    const markers = diagnostics.map((d) => ({
      severity: monacoSeverity(d.severity),
      message: d.message,
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      source: d.source || owner,
    }))
    monaco.editor.setModelMarkers(model, `ext:${owner}`, markers)
    useExtUiStore.getState().bumpDiagnostics()
  }

  function createDiagnosticCollection(name?: string) {
    const owner = name || `collection-${nextId('diag')}`
    const items = new Map<string, Diagnostic[]>()
    return {
      name,
      set(uri: Uri, diagnostics: Diagnostic[] | undefined) {
        if (!uri) return
        if (!diagnostics || diagnostics.length === 0) {
          items.delete(uri.toString())
          const model = monaco.editor.getModel(monaco.Uri.parse(uri.toString()))
          if (model) monaco.editor.setModelMarkers(model, `ext:${owner}`, [])
          useExtUiStore.getState().bumpDiagnostics()
        } else {
          items.set(uri.toString(), diagnostics)
          applyDiagnostics(uri, diagnostics, owner)
        }
      },
      delete(uri: Uri) {
        items.delete(uri.toString())
        const model = monaco.editor.getModel(monaco.Uri.parse(uri.toString()))
        if (model) monaco.editor.setModelMarkers(model, `ext:${owner}`, [])
        useExtUiStore.getState().bumpDiagnostics()
      },
      clear() {
        items.clear()
        for (const model of monaco.editor.getModels()) {
          monaco.editor.setModelMarkers(model, `ext:${owner}`, [])
        }
        useExtUiStore.getState().bumpDiagnostics()
      },
      dispose() {
        for (const model of monaco.editor.getModels()) {
          monaco.editor.setModelMarkers(model, `ext:${owner}`, [])
        }
      },
      get: (uri: Uri) => items.get(uri.toString()),
      all: () => [...items.entries()].flatMap(([u, d]) => d.map((dd) => ({ uri: Uri.parse(u), diagnostic: dd }))),
      reapplyFor: (uriStr: string) => {
        const entry = [...items.entries()].find(([u]) => u === uriStr)
        if (entry) applyDiagnostics(Uri.parse(uriStr), entry[1], owner)
      },
    }
  }

  class CodeLens {
    range: Range
    command?: any
    constructor(range: Range, command?: any) {
      this.range = range
      this.command = command
    }
  }

  class CodeAction {
    title: string
    kind?: string
    edit?: WorkspaceEdit
    command?: any
    diagnostics?: Diagnostic[]
    isPreferred?: boolean
    constructor(title: string, kind?: string) {
      this.title = title
      this.kind = kind
    }
  }

  const CodeActionKind = {
    Empty: '',
    QuickFix: 'quickfix',
    Refactor: 'refactor',
    RefactorExtract: 'refactor.extract',
    RefactorInline: 'refactor.inline',
    RefactorRewrite: 'refactor.rewrite',
    Source: 'source',
    SourceOrganizeImports: 'source.organizeImports',
    SourceFixAll: 'source.fixAll',
    append: (k: string, part: string) => (k ? `${k}.${part}` : part),
  }

  class SignatureHelp {
    signatures: SignatureInformation[]
    activeSignature = 0
    activeParameter = 0
    constructor() {
      this.signatures = []
    }
  }

  class SignatureInformation {
    label: string
    documentation?: string | MarkdownString
    parameters: ParameterInformation[]
    constructor(label: string, documentation?: string) {
      this.label = label
      this.documentation = documentation
      this.parameters = []
    }
  }

  class ParameterInformation {
    label: string | [number, number]
    documentation?: string | MarkdownString
    constructor(label: string | [number, number], documentation?: string) {
      this.label = label
      this.documentation = documentation
    }
  }

  class InlineCompletionItem {
    insertText: string | SnippetString
    range?: Range
    constructor(insertText: string | SnippetString, range?: Range) {
      this.insertText = insertText
      this.range = range
    }
  }

  class ThemeIcon {
    id: string
    color?: any
    constructor(id: string, color?: any) {
      this.id = id
      this.color = color
    }
  }

  class FileSystemWatcher {
    glob: string
    ignoreCreateEvents: boolean
    ignoreChangeEvents: boolean
    ignoreDeleteEvents: boolean
    onDidCreate: EventEmitter<Uri>
    onDidChange: EventEmitter<Uri>
    onDidDelete: EventEmitter<Uri>
    private handler: (e: Event) => void
    private disposed = false
    constructor(glob: string, ignoreCreate: boolean, ignoreChange: boolean, ignoreDelete: boolean) {
      this.glob = glob
      this.ignoreCreateEvents = ignoreCreate
      this.ignoreChangeEvents = ignoreChange
      this.ignoreDeleteEvents = ignoreDelete
      this.onDidCreate = new EventEmitter<Uri>()
      this.onDidChange = new EventEmitter<Uri>()
      this.onDidDelete = new EventEmitter<Uri>()
      this.handler = (e: Event) => {
        if (this.disposed) return
        const d = (e as CustomEvent).detail as { kind: string; path: string } | undefined
        if (!d) return
        const rel = stripRoot(d.path)
        if (!globMatch(glob, rel)) return
        const uri = Uri.file(rel)
        if (d.kind === 'created' && !this.ignoreCreateEvents) this.onDidCreate.fire(uri)
        else if (d.kind === 'deleted' && !this.ignoreDeleteEvents) this.onDidDelete.fire(uri)
        else if (d.kind === 'changed' && !this.ignoreChangeEvents) this.onDidChange.fire(uri)
      }
      window.addEventListener('nova:fs-change', this.handler)
    }
    dispose() {
      this.disposed = true
      window.removeEventListener('nova:fs-change', this.handler)
    }
  }

  class CancellationTokenSource {
    token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) }
    cancel() {
      ;(this.token as { isCancellationRequested: boolean }).isCancellationRequested = true
    }
    dispose() {}
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
      this.uri = uri || Uri.parse(`file:///${model.uri?.path || 'file'}`.replace(/\/\//g, '/'))
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
    save() {
      return Promise.resolve(true)
    }
  }

  class SimpleTextDocument {
    uri: Uri
    private text: string
    private lang: string
    constructor(uri: Uri, text: string) {
      this.uri = uri
      this.text = text
      this.lang = languageFromPath(uri.fsPath)
    }
    get fileName() {
      return this.uri.fsPath
    }
    get languageId() {
      return this.lang
    }
    get version() {
      return 1
    }
    get isUntitled() {
      return false
    }
    get isDirty() {
      return false
    }
    get lineCount() {
      return this.text.split('\n').length
    }
    getText(range?: Range) {
      if (!range) return this.text
      const lines = this.text.split('\n')
      const start = range.start.line
      const end = range.end.line
      if (start === end) return lines[start].slice(range.start.character, range.end.character)
      const parts = [lines[start].slice(range.start.character)]
      for (let i = start + 1; i < end; i++) parts.push(lines[i] ?? '')
      parts.push((lines[end] ?? '').slice(0, range.end.character))
      return parts.join('\n')
    }
    get range() {
      return new Range(0, 0, this.lineCount - 1, this.text.length)
    }
    save() {
      return Promise.resolve(true)
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
      return new Selection(sel.startLineNumber - 1, sel.startColumn - 1, sel.endLineNumber - 1, sel.endColumn - 1)
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
        activeEditor()?.executeEdits('vscode-ext', edits.map((e) => ({ range: toMonacoRange(e.range), text: e.text })))
        return true
      }
      return false
    }
    insertSnippet(snippet: SnippetString, location?: Range | Position) {
      const pos = location ? (location instanceof Position ? location : location.start) : this.selection.active
      return this.edit((b) => b.insert(pos, snippet.value))
    }
    setDecorations(type: TextEditorDecorationType, ranges: (Range | any)[]) {
      const editor = activeEditor()
      if (!editor || !type || !ranges) return
      const delta: monaco.editor.IModelDeltaDecoration[] = ranges.map((r) => {
        const isOpt = !!(r && r.range)
        const range = isOpt ? r.range : r
        const extra: monaco.editor.IModelDecorationOptions = isOpt ? buildMonacoDecoration(r.renderOptions || {}, type.key) : {}
        const hover = isOpt ? r.hoverMessage : undefined
        const options = { ...type.baseOptions, ...extra }
        if (hover) options.hoverMessage = toMarkdown(hover)
        return { range: toMonacoRange(range), options }
      })
      type.apply(editor, delta)
    }
    revealRange(range: Range) {
      const editor = activeEditor()
      if (editor) editor.revealRangeInCenter(toMonacoRange(range))
    }
    show() {}
    hide() {}
  }

  // ---- eventos globales ----
  const onDidChangeActiveTextEditor = new EventEmitter<TextEditor | undefined>()
  const onDidChangeTextEditorSelection = new EventEmitter<{ textEditor: TextEditor; selections: Selection[] }>()
  const onDidChangeTextDocument = new EventEmitter<{ document: TextDocument; contentChanges: any[] }>()
  const onDidSaveTextDocument = new EventEmitter<any>()
  const onDidOpenTextDocument = new EventEmitter<any>()
  const onDidCloseTextDocument = new EventEmitter<any>()
  const onDidChangeDiagnostics = new EventEmitter<{ uris: Uri[] }>()

  window.addEventListener('nova:editor-active', () => {
    const model = activeEditor()?.getModel()
    onDidChangeActiveTextEditor.fire(model ? new TextEditor(model) : undefined)
    if (model) onDidOpenTextDocument.fire(new TextDocument(model))
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
  window.addEventListener('nova:fs-change', (e) => {
    const d = (e as CustomEvent).detail as { kind: string; path: string } | undefined
    if (!d) return
    if (d.kind === 'changed') {
      const uri = Uri.file(stripRoot(d.path))
      const rel = toRel(d.path)
      const r = rootHandle()
      if (r) {
        void resolvePath(r, rel).then((h) => {
          if (h && h.kind === 'file') {
            void readText(h).then((text) => onDidSaveTextDocument.fire(new SimpleTextDocument(uri, text)))
          }
        })
      }
    }
  })

  // ---- commands ----
  const extCommands = new Map<string, (...a: any[]) => any>()

  function registerCommandInternal(id: string, handler: (...a: any[]) => any): Disposable {
    if (extCommands.has(id)) return new Disposable()
    extCommands.set(id, handler)
    registeredCommandIds.set(id, extId)
    globalExtCommands.set(id, handler)
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
        globalExtCommands.delete(id)
        unregisterDynamicCommand(`ext:${id}`)
      }),
    )
  }

  function executeCommand(id: string, ...args: any[]) {
    const h = globalExtCommands.get(id)
    if (h) return h(...args)
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
        provideCompletionItems: (model: any, position: any) => {
          if (!provider.provideCompletionItems) return null
          const doc = new TextDocument(model)
          const pos = new Position(position.lineNumber - 1, position.column - 1)
          try {
            const res = provider.provideCompletionItems(doc, pos, tokenStub, {})
            if (!res) return null
            const items = (Array.isArray(res) ? res : res.items).map((it: any) => {
              const word = doc.getWordRangeAtPosition(pos)
              const range = it.range ? toMonacoRange(it.range) : word ? toMonacoRange(word) : { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column }
              const s: any = {
                label: it.label || '',
                kind: it.kind ?? CompletionItemKind.Text,
                detail: it.detail,
                insertText: it.insertText?.value ?? it.insertText ?? (it.label || ''),
                range,
                filterText: it.filterText,
                sortText: it.sortText,
              }
              if (it.documentation) s.documentation = typeof it.documentation === 'string' ? { value: it.documentation } : { value: it.documentation.value || '' }
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
          const res = provider.provideHover(doc, pos, tokenStub)
          if (!res) return null
          return {
            contents: (res.contents || []).map((c: any) => (typeof c === 'string' ? { value: c } : { value: c.value || '' })),
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
          const res = provider.provideDocumentFormattingEdits(doc, { tabSize: useEditorStore.getState().settings.tabSize, insertSpaces: true }, tokenStub)
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

  function registerDocumentRangeFormattingEditProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideDocumentRangeFormattingEdits) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerDocumentRangeFormattingEditProvider(lang, {
        provideDocumentRangeFormattingEdits: (model: any, range: any, _opts: any, _token: any) => {
          const doc = new TextDocument(model)
          const res = provider.provideDocumentRangeFormattingEdits(doc, fromMonacoRange(range), { tabSize: 4, insertSpaces: true }, tokenStub)
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

  function fromMonacoRange(r: any): Range {
    return new Range(new Position(r.startLineNumber - 1, r.startColumn - 1), new Position(r.endLineNumber - 1, r.endColumn - 1))
  }

  function fromMonacoPos(p: { lineNumber: number; column: number }): Position {
    return new Position(p.lineNumber - 1, p.column - 1)
  }

  function toMonacoLocation(loc: Location | Location[] | undefined | null): any {
    if (!loc) return null
    if (Array.isArray(loc)) return loc.map(toMonacoLocation)
    return { uri: monaco.Uri.parse(loc.uri.toString()), range: toMonacoRange(loc.range) }
  }

  function registerDefinitionProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideDefinition) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerDefinitionProvider(lang, {
        provideDefinition: (model: any, position: any) => {
          const res = provider.provideDefinition(new TextDocument(model), fromMonacoPos(position), tokenStub)
          return toMonacoLocation(res)
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerReferenceProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideReferences) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerReferenceProvider(lang, {
        provideReferences: (model: any, position: any, _ctx: any) => {
          const res = provider.provideReferences(new TextDocument(model), fromMonacoPos(position), { includeDeclaration: true }, tokenStub)
          return toMonacoLocation(res)
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerDocumentSymbolProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideDocumentSymbols) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerDocumentSymbolProvider(lang, {
        provideDocumentSymbols: (model: any) => {
          const res = provider.provideDocumentSymbols(new TextDocument(model), tokenStub)
          if (!res) return null
          const conv = (s: DocumentSymbol): monaco.languages.DocumentSymbol => ({
            name: s.name,
            detail: s.detail,
            kind: s.kind,
            tags: [],
            range: toMonacoRange(s.range),
            selectionRange: toMonacoRange(s.selectionRange),
            children: (s.children || []).map(conv),
          })
          return (Array.isArray(res) ? res : res).map(conv)
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerSignatureHelpProvider(selector: any, provider: any, trigger?: string[]): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideSignatureHelp) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerSignatureHelpProvider(lang, {
        signatureHelpTriggerCharacters: trigger || ['(', ','],
        signatureHelpRetriggerCharacters: [')', ','],
        provideSignatureHelp: (model: any, position: any) => {
          const res = provider.provideSignatureHelp(new TextDocument(model), fromMonacoPos(position), tokenStub, { triggerKind: 0, isRetrigger: false, triggerCharacter: undefined, activeSignatureHelp: undefined })
          if (!res) return null
          return {
            signatures: (res.signatures || []).map((s: SignatureInformation) => ({
              label: s.label,
              documentation: s.documentation ? toMarkdown(s.documentation) : undefined,
              parameters: (s.parameters || []).map((p: ParameterInformation) => ({
                label: typeof p.label === 'string' ? p.label : String(p.label[1] - p.label[0]),
                documentation: p.documentation ? toMarkdown(p.documentation) : undefined,
              })),
            })),
            activeSignature: res.activeSignature || 0,
            activeParameter: res.activeParameter || 0,
          } as any
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function convertWorkspaceEdit(edit: WorkspaceEdit): monaco.languages.WorkspaceEdit {
    const edits: monaco.languages.IWorkspaceTextEdit[] = edit.edits.map((e) => ({
      resource: monaco.Uri.parse(e.uri.toString()),
      textEdit: { range: toMonacoRange(e.range), text: e.newText },
      versionId: undefined,
    }))
    return { edits }
  }

  function registerCodeActionsProvider(selector: any, provider: any, _metadata?: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideCodeActions) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerCodeActionProvider(lang, {
        provideCodeActions: (model: any, range: any, _ctx: any) => {
          const res = provider.provideCodeActions(new TextDocument(model), fromMonacoRange(range), { diagnostics: [], only: _ctx.only, triggerKind: 0 }, tokenStub)
          if (!res) return null
          const list = Array.isArray(res) ? res : res.actions || []
          return list.map((a: CodeAction) => {
            const action: monaco.languages.CodeAction = {
              title: a.title,
              kind: a.kind,
              isPreferred: a.isPreferred,
              diagnostics: undefined,
            }
            if (a.edit) action.edit = convertWorkspaceEdit(a.edit)
            if (a.command) {
              action.command = { id: `ext:${a.command.command}`, title: a.title, arguments: a.command.arguments }
              action.edit = action.edit
            }
            return action
          })
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerFoldingRangeProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideFoldingRanges) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerFoldingRangeProvider(lang, {
        provideFoldingRanges: (model: any) => {
          const res = provider.provideFoldingRanges(new TextDocument(model), { rangeLimit: 5000 }, tokenStub)
          if (!res) return null
          return res.map((f: any) => ({ start: f.start, end: f.end, kind: f.kind }))
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerDocumentHighlightProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideDocumentHighlights) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerDocumentHighlightProvider(lang, {
        provideDocumentHighlights: (model: any, position: any) => {
          const res = provider.provideDocumentHighlights(new TextDocument(model), fromMonacoPos(position), tokenStub)
          if (!res) return null
          return res.map((h: any) => ({ range: toMonacoRange(h.range), kind: h.kind ?? 0 }))
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerCodeLensProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideCodeLenses) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerCodeLensProvider(lang, {
        provideCodeLenses: (model: any) => {
          const res = provider.provideCodeLenses(new TextDocument(model), tokenStub)
          if (!res) return null
          return res.map((l: CodeLens) => ({
            range: toMonacoRange(l.range),
            command: l.command ? { id: `ext:${l.command.command}`, title: l.command.title || '', arguments: l.command.arguments } : undefined,
          }))
        },
        resolveCodeLens: (model: any, lens: any) => lens,
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerDocumentLinkProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideDocumentLinks) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerLinkProvider(lang, {
        provideLinks: (model: any) => {
          const res = provider.provideDocumentLinks(new TextDocument(model), tokenStub)
          if (!res) return null
          return res.map((l: any) => ({
            range: toMonacoRange(l.range),
            url: l.target ? l.target.toString() : model.getLineContent(l.range.start.line + 1),
            tooltip: undefined,
          }))
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerInlayHintsProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideInlayHints) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerInlayHintsProvider(lang, {
        provideInlayHints: (model: any, range: any) => {
          const res = provider.provideInlayHints(new TextDocument(model), fromMonacoRange(range), tokenStub)
          if (!res) return null
          return res.map((h: any) => ({
            position: toMonacoPos(h.position),
            label: typeof h.label === 'string' ? h.label : (h.label || []).map((p: any) => (typeof p === 'string' ? p : p.value)),
            kind: h.kind ? (h.kind === 1 ? 0 : 1) : undefined,
            paddingLeft: h.paddingLeft,
            paddingRight: h.paddingRight,
          }))
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerSelectionRangeProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideSelectionRanges) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerSelectionRangeProvider(lang, {
        provideSelectionRanges: (model: any, positions: any[]) => {
          const res = provider.provideSelectionRanges(new TextDocument(model), positions.map(fromMonacoPos), tokenStub)
          if (!res) return null
          return res.map((chain: any) => {
            const list: monaco.languages.SelectionRange[] = []
            let cur: any = chain
            while (cur) {
              list.push({ range: toMonacoRange(cur.range) })
              cur = cur.parent
            }
            return list
          })
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerInlineCompletionItemProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideInlineCompletionItems) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerInlineCompletionsProvider(lang, {
        provideInlineCompletions: (model: any, position: any, _ctx: any) => {
          const res = provider.provideInlineCompletionItems(new TextDocument(model), fromMonacoPos(position), { triggerKind: _ctx?.triggerKind ?? 0 }, tokenStub)
          if (!res) return null
          const items = (Array.isArray(res) ? res : res.items).map((it: InlineCompletionItem) => ({
            insertText: typeof it.insertText === 'string' ? it.insertText : it.insertText?.value ?? '',
            range: it.range ? toMonacoRange(it.range) : undefined,
          }))
          return { items }
        },
        freeInlineCompletions: () => {},
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function registerDocumentColorProvider(selector: any, provider: any): Disposable {
    const lang = selectorToLang(selector)
    if (!lang || !provider.provideDocumentColors) return new Disposable()
    let reg: monaco.IDisposable | null = null
    try {
      reg = monaco.languages.registerColorProvider(lang, {
        provideColorPresentations: () => {
          const res = provider.provideColorPresentations ? provider.provideColorPresentations({ red: 1, green: 1, blue: 1, alpha: 1 }, {}, tokenStub) : []
          return (res || []).map((p: any) => ({ label: p.label }))
        },
        provideDocumentColors: (model: any) => {
          const res = provider.provideDocumentColors(new TextDocument(model), tokenStub)
          if (!res) return null
          return res.map((c: any) => ({
            color: { red: c.color.red, green: c.color.green, blue: c.color.blue, alpha: c.color.alpha },
            range: toMonacoRange(c.range),
          }))
        },
      })
    } catch {
      // ignore
    }
    return push(new Disposable(() => reg?.dispose()))
  }

  function setLanguageConfiguration(language: string, configuration: any): Disposable {
    try {
      const d = monaco.languages.setLanguageConfiguration(language, configuration)
      return push(new Disposable(() => d.dispose()))
    } catch {
      return new Disposable()
    }
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
        if (k in settings) return settings[k] as T
        const cfgDefault = getContributedConfigDefault(k)
        if (cfgDefault !== undefined) return cfgDefault as T
        return def as T
      },
      has: (key: string) => {
        const settings = useEditorStore.getState().settings as unknown as Record<string, any>
        const k = section ? `${section}.${key}` : key
        return k in settings || getContributedConfigDefault(k) !== undefined
      },
      update: (key: string, value: unknown) => {
        useEditorStore.getState().updateSettings({ [key]: value } as never)
        return Promise.resolve()
      },
      inspect: (key: string) => {
        const settings = useEditorStore.getState().settings as unknown as Record<string, any>
        const k = section ? `${section}.${key}` : key
        const val = k in settings ? settings[k] : getContributedConfigDefault(k)
        return { key: k, defaultValue: getContributedConfigDefault(k), globalValue: undefined, workspaceValue: k in settings ? settings[k] : undefined, workspaceFolderValue: undefined }
      },
    }
  }

  const fsApi = {
    async stat(uri: Uri) {
      const r = rootHandle()
      const rel = toRel(uri)
      const h = r ? await resolvePath(r, rel) : null
      if (!h) throw enoent(rel)
      return { type: h.kind === 'directory' ? 2 : 1, ctime: 0, mtime: 0, size: 0 }
    },
    async readFile(uri: Uri): Promise<Uint8Array> {
      const r = rootHandle()
      const rel = toRel(uri)
      const h = r ? await resolvePath(r, rel) : null
      if (!h || h.kind !== 'file') throw enoent(rel)
      return new TextEncoder().encode(await readText(h))
    },
    async writeFile(uri: Uri, content: Uint8Array) {
      const r = rootHandle()
      const rel = toRel(uri)
      if (!r) throw enoent(rel)
      const ok = await writeFileAt(r, rel, new TextDecoder().decode(content))
      if (!ok) throw enoent(rel)
    },
    async readDirectory(uri: Uri): Promise<[string, number][]> {
      const r = rootHandle()
      const rel = toRel(uri)
      if (!r) return []
      const entries = await listAt(r, rel)
      if (!entries) throw enoent(rel)
      return entries.map((e) => [e.name, e.kind === 'directory' ? 2 : 1] as [string, number])
    },
    async createDirectory(uri: Uri) {
      const r = rootHandle()
      const rel = toRel(uri)
      if (!r) throw enoent(rel)
      const ok = await createDirAt(r, rel)
      if (!ok) throw enoent(rel)
    },
    async delete(uri: Uri) {
      const r = rootHandle()
      const rel = toRel(uri)
      if (!r) throw enoent(rel)
      const ok = await removeAt(r, rel)
      if (!ok) throw enoent(rel)
    },
    async rename(oldUri: Uri, newUri: Uri) {
      const r = rootHandle()
      if (!r) throw enoent('')
      const from = toRel(oldUri)
      const to = toRel(newUri)
      const data = await fsApi.readFile(oldUri)
      await fsApi.writeFile(newUri, data)
      await removeAt(r, from)
    },
    async copy(src: Uri, dest: Uri) {
      const data = await fsApi.readFile(src)
      await fsApi.writeFile(dest, data)
    },
    isSupportedScheme: (scheme: string) => scheme === 'file',
  }

  async function findFiles(include: any, exclude?: any, maxResults?: number, token?: any): Promise<Uri[]> {
    const r = rootHandle()
    if (!r) return []
    const out: Uri[] = []
    const inc = typeof include === 'string' ? include : include?.pattern || '**/*'
    const exc = typeof exclude === 'string' ? exclude : exclude?.pattern
    await walkFiles(r, (path) => {
      if (token?.isCancellationRequested) return
      const rel = stripRoot(path)
      if (!globMatch(inc, rel)) return
      if (exc && globMatch(exc, rel)) return
      out.push(Uri.file(rel))
    })
    return maxResults ? out.slice(0, maxResults) : out
  }

  async function openTextDocument(uriOrPath: any): Promise<any> {
    let uri: Uri
    if (typeof uriOrPath === 'string') uri = Uri.parse(uriOrPath.startsWith('file:') ? uriOrPath : `file:///${uriOrPath}`)
    else if (uriOrPath instanceof Uri) uri = uriOrPath
    else uri = uriOrPath?.uri || Uri.file(uriOrPath?.fsPath || '')
    const rel = toRel(uri)
    const r = rootHandle()
    const h = r ? await resolvePath(r, rel) : null
    if (!h || h.kind !== 'file') throw new Error(`ENOENT: ${rel}`)
    const text = await readText(h)
    return new SimpleTextDocument(uri, text)
  }

  // ---- state (context) ----
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
    extensionMode: 1,
    globalState: stateStore(extId + '.global'),
    workspaceState: stateStore(extId + '.workspace'),
    secrets: {
      store: (k: string, v: string) => {
        try {
          localStorage.setItem(`nova.extsecret.${extId}.${k}`, v)
        } catch {
          // ignore
        }
        return Promise.resolve()
      },
      get: (k: string) => Promise.resolve(localStorage.getItem(`nova.extsecret.${extId}.${k}`)),
      delete: (k: string) => {
        localStorage.removeItem(`nova.extsecret.${extId}.${k}`)
        return Promise.resolve()
      },
    },
    log: {
      appendLine: (l: string) => console.log(`[ext:${extId}]`, l),
      show: () => {},
    },
    storageUri: Uri.parse(`nova://${extId}/storage`),
    globalStorageUri: Uri.parse(`nova://${extId}/globalStorage`),
  }

  const StatusBarAlignment = { Left: 1, Right: 2 }
  const ProgressLocation = { SourceControl: 1, Window: 10, Notification: 15 }

  // ---- window: quickpick / inputbox / mensajes ----
  function showQuickPick(items: any, options?: any): Promise<any> {
    return new Promise((resolve) => {
      const list = Array.isArray(items) ? items : []
      if (list.length === 0) {
        resolve(undefined)
        return
      }
      const qpItems = list.map((it: any, i: number) => {
        if (typeof it === 'string') return { id: `qp${i}`, label: it }
        return { id: `qp${i}`, label: it.label, description: it.description, detail: it.detail, kind: it.kind }
      })
      useExtUiStore.getState().openQuickPick({
        title: options?.title,
        placeholder: options?.placeHolder,
        items: qpItems,
        resolve: (picked) => {
          if (!picked) {
            resolve(undefined)
            return
          }
          const idx = qpItems.findIndex((q) => q.id === picked.id)
          resolve(list[idx])
        },
      })
    })
  }

  function showInputBox(options?: any): Promise<string | undefined> {
    return new Promise((resolve) => {
      useExtUiStore.getState().openInputBox({
        title: options?.title,
        prompt: options?.prompt,
        value: options?.value,
        password: options?.password,
        validate: options?.validate,
        resolve,
      })
    })
  }

  function showMessage(msg: string, severity: 'info' | 'warn' | 'error', items?: string[]): Promise<any> {
    if (items && items.length > 0) {
      return showQuickPick(items, { title: `${severity === 'info' ? '' : severity === 'warn' ? '⚠ ' : '✕ '}${msg}` })
    }
    status(`${severity === 'warn' ? '⚠ ' : severity === 'error' ? '✕ ' : ''}${msg}`)
    return Promise.resolve(undefined)
  }

  function createStatusBarItem(alignment = StatusBarAlignment.Left, priority = 100) {
    const id = nextId('ext-sb')
    const base: { text: string; tooltip?: string; command?: string; show: boolean } = { text: '', show: false }
    const sync = () =>
      useExtUiStore.getState().setStatusItem(id, {
        id,
        text: base.text,
        tooltip: base.tooltip,
        align: alignment === StatusBarAlignment.Right ? 1 : 0,
        priority,
        command: base.command,
        show: base.show,
      })
    const item: any = {
      get text() {
        return base.text
      },
      set text(v) {
        base.text = v
        sync()
      },
      get tooltip() {
        return base.tooltip
      },
      set tooltip(v) {
        base.tooltip = v
        sync()
      },
      get command() {
        return base.command
      },
      set command(v) {
        base.command = v
        sync()
      },
      color: undefined,
      backgroundColor: undefined,
      alignment,
      priority,
      show() {
        base.show = true
        sync()
      },
      hide() {
        base.show = false
        sync()
      },
      dispose() {
        useExtUiStore.getState().removeStatusItem(id)
      },
    }
    return item
  }

  function createOutputChannel(name: string) {
    return {
      name,
      append(value: string) {
        useExtUiStore.getState().appendOutput(name, value)
      },
      appendLine(value: string) {
        useExtUiStore.getState().appendOutput(name, value + '\n')
      },
      replace(value: string) {
        useExtUiStore.getState().clearOutput(name)
        useExtUiStore.getState().appendOutput(name, value)
      },
      clear() {
        useExtUiStore.getState().clearOutput(name)
      },
      show(preserveFocus?: boolean) {
        useEditorStore.getState().setBottomView('output')
        useExtUiStore.getState().showOutput(name)
        void preserveFocus
      },
      hide() {},
      dispose() {},
    }
  }

  function createTerminal(options?: any) {
    const name = options?.name || `Terminal ${nextId('t')}`
    return {
      name,
      creationOptions: options,
      exitStatus: undefined,
      sendText(text: string) {
        useExtUiStore.getState().appendOutput(name, text + '\n')
      },
      show() {
        useEditorStore.getState().setBottomView('terminal')
      },
      hide() {},
      dispose() {},
      onDidWrite: new EventEmitter<string>().event,
      onDidClose: new EventEmitter<void>().event,
      onDidChangeState: new EventEmitter<void>().event,
    }
  }

  function createWebviewPanel(viewType: string, title: string, column: number, options?: any) {
    const id = nextId('wv')
    let html = ''
    const receive = new EventEmitter<any>()
    const onMessage = (e: MessageEvent) => receive.fire(e.data)
    window.addEventListener('message', onMessage)
    const panel = {
      viewType,
      active: true,
      visible: true,
      get title() {
        return title
      },
      set title(v: string) {
        title = v
        useExtUiStore.getState().addWebview({ id, title: v, html, open: true })
      },
      webview: {
        get html() {
          return html
        },
        set html(v: string) {
          html = v
          useExtUiStore.getState().setWebviewHtml(id, v)
        },
        options: options || {},
        cspSource: '',
        asWebviewUri: (uri: Uri) => uri,
        onDidReceiveMessage: receive.event,
        postMessage: (msg: any) => {
          window.dispatchEvent(new CustomEvent('nova:webview-post', { detail: { id, msg } }))
          return Promise.resolve(true)
        },
      },
      onDidChangeViewState: () => ({ dispose() {} }),
      onDidDispose: () => ({ dispose() {} }),
      reveal: () => {
        useExtUiStore.getState().setWebviewOpen(id, true)
      },
      dispose() {
        window.removeEventListener('message', onMessage)
        useExtUiStore.getState().removeWebview(id)
      },
    }
    useExtUiStore.getState().addWebview({ id, title, html, open: true })
    return panel
  }

  function createTreeView(viewId: string, options: any) {
    const provider = options.treeDataProvider
    if (!provider) return { dispose() {}, onDidChangeVisibility: () => ({ dispose() {} }) }
    const raw = {
      getChildren: (el?: unknown) => provider.getChildren(el),
      getTreeItem: async (el: unknown) => {
        const ti = await provider.getTreeItem(el)
        return {
          label: typeof ti.label === 'string' ? ti.label : ti.label?.label || String(el),
          description: ti.description,
          tooltip: ti.tooltip ? (typeof ti.tooltip === 'string' ? ti.tooltip : ti.tooltip.value) : undefined,
          collapsibleState: ti.collapsibleState || 0,
          command: ti.command,
          resourceUri: ti.resourceUri,
        }
      },
      onDidChangeTreeData: (listener: (e: unknown) => void) => (provider.onDidChangeTreeData ? provider.onDidChangeTreeData(listener) : { dispose() {} }),
    }
    registerTreeProvider(viewId, raw)
    let title = options.title || viewId
    useExtUiStore.getState().addTreeView(viewId, title)
    const changeSub = raw.onDidChangeTreeData(() => useExtUiStore.getState().bumpTreeView(viewId))
    return {
      get visible() {
        return true
      },
      get message() {
        return ''
      },
      set message(v: string) {
        void v
      },
      get title() {
        return title
      },
      set title(v: string) {
        title = v
        useExtUiStore.getState().addTreeView(viewId, v)
      },
      onDidChangeVisibility: () => ({ dispose() {} }),
      onDidChangeTreeData: raw.onDidChangeTreeData,
      reveal: () => {
        useEditorStore.getState().setSidebarView('extviews')
      },
      dispose() {
        changeSub.dispose()
        unregisterTreeProvider(viewId)
        useExtUiStore.getState().removeTreeView(viewId)
      },
    }
  }

  function createTextEditorDecorationType(renderOptions: any) {
    return new TextEditorDecorationType(renderOptions || {})
  }

  const onDidChangeWindowState = new EventEmitter<{ focused: boolean }>()
  window.addEventListener('focus', () => onDidChangeWindowState.fire({ focused: true }))
  window.addEventListener('blur', () => onDidChangeWindowState.fire({ focused: false }))

  function showTextDocument(uriOrDoc: any): Promise<TextEditor> {
    const path = uriOrDoc?.fsPath || uriOrDoc?.path || (typeof uriOrDoc === 'string' ? uriOrDoc : '')
    const rel = toRel(path)
    void useEditorStore.getState().openFileByPath(rel)
    const model = activeEditor()?.getModel()
    return Promise.resolve(model ? new TextEditor(model) : undefined as unknown as TextEditor)
  }

  const api: any = {
    // tipos
    Position, Range, Selection, Uri, TextEdit, WorkspaceEdit,
    CompletionItem, CompletionItemKind, SnippetString, MarkdownString, Hover, Location,
    DocumentSymbol, SymbolKind, Diagnostic, DiagnosticSeverity,
    CodeLens, CodeAction, CodeActionKind, SignatureHelp, SignatureInformation, ParameterInformation,
    InlineCompletionItem, ThemeIcon, ThemeColor: class { constructor(public id: string) {} },
    FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
    StatusBarAlignment, ProgressLocation, FileSystemWatcher, CancellationTokenSource,
    EventEmitter, Event: (cb: any) => cb, Disposable, TextDocument, TextEditor,
    Version: '1.0.0',

    commands: {
      registerCommand: registerCommandInternal,
      registerTextEditorCommand: registerCommandInternal,
      executeCommand,
      getCommands: () => [...globalExtCommands.keys()],
    },

    window: {
      showInformationMessage: (msg: string, ...items: string[]) => showMessage(msg, 'info', items),
      showWarningMessage: (msg: string, ...items: string[]) => showMessage(msg, 'warn', items),
      showErrorMessage: (msg: string, ...items: string[]) => showMessage(msg, 'error', items),
      showQuickPick,
      showInputBox,
      showOpenDialog: () => Promise.resolve(undefined),
      showSaveDialog: () => Promise.resolve(undefined),
      createStatusBarItem,
      setStatusBarMessage: (msg: string, timeout?: number | Disposable) => {
        useEditorStore.getState().setStatus(msg, typeof timeout === 'number' ? timeout : 3000)
        return new Disposable()
      },
      withProgress: (_options: any, task: (p: any, t: any) => Promise<any>) => {
        const progress = { report: () => {}, } as any
        return task(progress, tokenStub)
      },
      createOutputChannel,
      createTerminal,
      createWebviewPanel,
      createTreeView,
      createTextEditorDecorationType,
      createInputBox: () => {
        const emitter = new EventEmitter<string>()
        const accept = new EventEmitter<void>()
        const ib: any = {
          title: '', prompt: '', value: '', placeholder: '', password: false, ignoreFocusOut: false,
          buttons: [], step: 1, totalSteps: 1, shown: false,
          onDidChangeValue: emitter.event,
          onDidAccept: accept.event,
          onDidTriggerButton: () => ({ dispose() {} }),
          onDidHide: () => ({ dispose() {} }),
          show() {
            useExtUiStore.getState().openInputBox({
              title: ib.title,
              prompt: ib.prompt,
              value: ib.value,
              password: ib.password,
              validate: (v: string) => {
                ib.value = v
                emitter.fire(v)
                return undefined
              },
              resolve: (v) => {
                if (v !== undefined) {
                  ib.value = v
                  accept.fire()
                }
              },
            })
          },
          hide() {},
          dispose() {},
        }
        return ib
      },
      registerUriHandler: (handler: any) => {
        void handler
        return new Disposable()
      },
      showTextDocument,
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
      onDidChangeWindowState: onDidChangeWindowState.event,
      state: {
        get(key: string) {
          try {
            return JSON.parse(localStorage.getItem(`nova.windowstate.${key}`) || 'null')
          } catch {
            return null
          }
        },
        update(key: string, value: unknown) {
          localStorage.setItem(`nova.windowstate.${key}`, JSON.stringify(value))
        },
      },
    },

    workspace: {
      get name() {
        return rootInfo()?.name || ''
      },
      get rootPath() {
        return rootInfo()?.abs || undefined
      },
      get workspaceFolders() {
        const r = rootInfo()
        return r ? [{ uri: Uri.file(r.abs), name: r.name, index: 0 }] : []
      },
      get isTrusted() {
        return true
      },
      get workspaceFile() {
        return undefined
      },
      getConfiguration,
      fs: fsApi,
      createFileSystemWatcher: (glob: any, ignoreCreate?: boolean, ignoreChange?: boolean, ignoreDelete?: boolean) => {
        const pattern = typeof glob === 'string' ? glob : glob?.pattern || '**/*'
        return new FileSystemWatcher(pattern, !!ignoreCreate, !!ignoreChange, !!ignoreDelete)
      },
      findFiles,
      openTextDocument,
      asRelativePath: (p: string) => toRel(p),
      getWorkspaceFolder: (uri: Uri) => {
        const r = rootInfo()
        return r ? { uri: Uri.file(r.abs), name: r.name, index: 0 } : undefined
      },
      updateWorkspaceFolders: () => false,
      getWorkspaceFolders: () => {
        const r = rootInfo()
        return r ? [{ uri: Uri.file(r.abs), name: r.name, index: 0 }] : []
      },
      onDidSaveTextDocument: onDidSaveTextDocument.event,
      onDidOpenTextDocument: onDidOpenTextDocument.event,
      onDidCloseTextDocument: onDidCloseTextDocument.event,
      onDidChangeTextDocument: onDidChangeTextDocument.event,
      onDidCreateFiles: () => ({ dispose() {} }),
      onDidDeleteFiles: () => ({ dispose() {} }),
      onDidRenameFiles: () => ({ dispose() {} }),
      onDidChangeWorkspaceFolders: () => ({ dispose() {} }),
      onDidChangeConfiguration: () => ({ dispose() {} }),
      onWillSaveTextDocument: () => ({ dispose() {} }),
      applyEdit: (edit: WorkspaceEdit) => {
        for (const e of edit.edits) {
          const model = monaco.editor.getModel(monaco.Uri.parse(e.uri.toString()))
          if (model) model.pushEditOperations([], [{ range: toMonacoRange(e.range), text: e.newText }], () => null)
        }
        return Promise.resolve(true)
      },
    },

    languages: {
      registerCompletionItemProvider,
      registerHoverProvider,
      registerDocumentFormattingEditProvider,
      registerDocumentRangeFormattingEditProvider,
      registerDefinitionProvider,
      registerReferenceProvider,
      registerDocumentSymbolProvider,
      registerSignatureHelpProvider,
      registerCodeActionsProvider,
      registerFoldingRangeProvider,
      registerDocumentHighlightProvider,
      registerCodeLensProvider,
      registerDocumentLinkProvider,
      registerInlayHintsProvider,
      registerSelectionRangeProvider,
      registerInlineCompletionItemProvider,
      registerDocumentColorProvider,
      registerDocumentSemanticTokensProvider: () => new Disposable(),
      setLanguageConfiguration,
      createDiagnosticCollection,
      getLanguages: () =>
        monaco.languages
          .getLanguages()
          .filter((l) => l.id)
          .map((l) => ({ id: l.id, extensions: [], aliases: [], filenames: [] })),
      onDidChangeDiagnostics: onDidChangeDiagnostics.event,
    },

    diagnostics: {
      createDiagnosticCollection,
    },

    env: {
      appName: 'Nova',
      appRoot: '/',
      language: 'es',
      uriScheme: 'nova',
      version: '1.0.0',
      machineId: 'nova-desktop',
      shell: 'powershell',
      uiTheme: 'vs-dark',
      isNewAppInstall: false,
      isTelemetryEnabled: false,
      clipboard: {
        readText: () =>
          typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard.readText() : Promise.resolve(''),
        writeText: (t: string) => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.resolve()),
      },
      openExternal: (uri: Uri) => {
        window.open(uri.toString(), '_blank')
        return Promise.resolve(true)
      },
      openUri: (uri: Uri) => {
        window.open(uri.toString(), '_blank')
        return Promise.resolve(true)
      },
      asExternalUri: (uri: Uri) => Promise.resolve(uri),
    },

    extensions: {
      all: () =>
        Object.values(useExtensionStore.getState().installed).map((e) => ({
          id: e.id,
          version: e.version,
          packageJSON: { name: e.name, version: e.version },
          extensionPath: '/',
          extensionUri: Uri.parse(`nova://${e.id}`),
          isActive: true,
          exports: undefined,
        })),
      getExtension: (id: string) => {
        const e = useExtensionStore.getState().installed[id]
        return e
          ? { id: e.id, version: e.version, packageJSON: { name: e.name, version: e.version }, extensionPath: '/', extensionUri: Uri.parse(`nova://${e.id}`), isActive: true, exports: undefined }
          : undefined
      },
      onDidChange: () => ({ dispose() {} }),
    },

    debug: {
      onDidStartDebugSession: () => ({ dispose() {} }),
      onDidTerminateDebugSession: () => ({ dispose() {} }),
      startDebugging: () => Promise.resolve(false),
      activeDebugSession: undefined,
    },

    tasks: {
      registerTaskProvider: () => new Disposable(),
      fetchTasks: () => Promise.resolve([]),
      executeTask: () => Promise.resolve(undefined),
      taskExecutions: [],
      onDidEndTask: () => ({ dispose() {} }),
    },

    authentication: {
      getSession: () => Promise.resolve(undefined),
      getAccounts: () => Promise.resolve([]),
      onDidChangeSessions: () => ({ dispose() {} }),
    },

    ExtensionContext: { prototype: {} },
  }

  // Cierra el ciclo: la colección de diagnósticos se re-aplica al abrir modelos
  const registerCollection = (col: { reapplyFor: (uri: string) => void }) => {
    diagnosticCollections.push(col)
    return col
  }

  api.diagnostics.createDiagnosticCollection = (name?: string) => {
    const col = createDiagnosticCollection(name)
    const origSet = col.set
    col.set = (uri: Uri, diags: Diagnostic[] | undefined) => {
      origSet(uri, diags)
      onDidChangeDiagnostics.fire({ uris: [uri] })
    }
    registerCollection({ reapplyFor: (uri: string) => col.reapplyFor?.(uri) })
    return col
  }
  api.languages.createDiagnosticCollection = api.diagnostics.createDiagnosticCollection

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

function enoent(p: string): Error {
  const err = new Error(`ENOENT: no such file or directory, open '${p}'`)
  ;(err as unknown as { code: string }).code = 'ENOENT'
  return err
}
