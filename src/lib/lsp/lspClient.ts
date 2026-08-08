// Cliente LSP del lado del main thread: crea el MessagePort, lanza el worker
// y registra los providers de Monaco que traducen los requests LSP.

import * as monaco from 'monaco-editor'
import type { languages as monacoLanguages, editor as monacoEditor } from 'monaco-editor'
import { createMessageConnection, type MessageConnection } from 'vscode-jsonrpc/browser'
import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-jsonrpc/browser'
import { useEditorStore } from '../../store/editorStore'
import { readFileAt, type AnyHandle } from '../fileSystem'

let connection: MessageConnection | null = null
let worker: Worker | null = null
let initialized = false
let pending: Promise<void> | null = null

const LANGUAGE_IDS = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact']

export function isLspReady(): boolean {
  return !!connection
}

export async function initLsp(): Promise<void> {
  if (initialized) return
  if (pending) return pending
  pending = (async () => {
    try {
      const { MessageChannel } = globalThis
      const channel = new MessageChannel()
      worker = new Worker(new URL('./lsp.worker.ts', import.meta.url), { type: 'module' })
      worker.postMessage(channel.port2, [channel.port2])
      connection = createMessageConnection(new BrowserMessageReader(channel.port1), new BrowserMessageWriter(channel.port1))
      connection.listen()
      await connection.sendRequest('initialize', {
        processId: null,
        rootUri: 'file:///workspace',
        capabilities: {},
        workspaceFolders: [{ uri: 'file:///workspace', name: 'workspace' }],
      })
      await connection.sendNotification('initialized')
      initialized = true
      registerMonacoProviders()
      void syncWorkspaceFiles()
    } catch {
      // LSP no disponible (fallback silencioso a Monaco)
    } finally {
      pending = null
    }
  })()
  return pending
}

// Enviar todos los archivos del workspace al servidor
export async function syncWorkspaceFiles(): Promise<void> {
  if (!connection) return
  const root = useEditorStore.getState().root?.handle as AnyHandle | null
  if (!root) return
  const rootNonNull: AnyHandle = root
  const files: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: { path: string; text: string }[] = []
  await walkCollect(rootNonNull)
  async function walkCollect(dir: AnyHandle, prefix = '') {
    const { listAt } = await import('../fileSystem')
    const list = await listAt(dir, prefix)
    if (!list) return
    for (const e of list) {
      const p = prefix ? `${prefix}/${e.name}` : e.name
      if (e.name.startsWith('.') || e.name === 'node_modules') continue
      if (e.kind === 'directory') {
        await walkCollect(e.handle as AnyHandle, p)
      } else {
        const ext = p.split('.').pop()?.toLowerCase()
        if (!ext || !['ts', 'tsx', 'js', 'jsx', 'mts', 'cts', 'mjs', 'cjs', 'json'].includes(ext)) continue
        if ((e.handle as { size?: number }).size && (e.handle as { size?: number }).size! > 500_000) continue
        try {
          const text = await readFileAt(rootNonNull, p)
          if (text !== null && text.length < 500_000) entries.push({ path: p, text })
        } catch {
          // ignore
        }
      }
    }
  }
  for (const en of entries) files[en.path] = en.text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await connection?.sendNotification('deneb/workspaceFiles' as any, { files } as never).catch(() => {})
}

// ---------------------------------------------------------------------------
// Providers de Monaco
// ---------------------------------------------------------------------------

let providersRegistered = false

function registerMonacoProviders() {
  if (providersRegistered) return
  providersRegistered = true

  monaco.languages.registerCompletionItemProvider(LANGUAGE_IDS, {
    triggerCharacters: ['.', '"', "'", '`', '/', '@', '<'],
    provideCompletionItems(model, position) {
      return lspRequest('textDocument/completion', pos(model, position)).then((r) => {
        if (!r) return { suggestions: [] }
        const list = Array.isArray(r) ? r : ((r as { items?: unknown[] }).items || [])
        return {
          suggestions: list.map((c: unknown) => toCompletionItem(c as Record<string, unknown>)),
        }
      }) as never
    },
    resolveCompletionItem(item) {
      return item
    },
  })

  monaco.languages.registerHoverProvider(LANGUAGE_IDS, {
    provideHover(model, position) {
      return lspRequest('textDocument/hover', pos(model, position)).then((r) => (r ? toHover(r as Record<string, unknown>) : null)) as never
    },
  })

  monaco.languages.registerDefinitionProvider(LANGUAGE_IDS, {
    provideDefinition(model, position) {
      return lspRequest('textDocument/definition', pos(model, position)).then((r) => (r ? toLocations(r) : null)) as never
    },
  })

  monaco.languages.registerReferenceProvider(LANGUAGE_IDS, {
    provideReferences(model, position) {
      return lspRequest('textDocument/references', { ...pos(model, position), context: { includeDeclaration: true } }).then((r) => (r ? toLocations(r) : [])) as never
    },
  })

  monaco.languages.registerRenameProvider(LANGUAGE_IDS, {
    provideRenameEdits(model, position, newName) {
      return lspRequest('textDocument/rename', { ...pos(model, position), newName }).then((r) => (r ? toWorkspaceEdit(r) : null)) as never
    },
  })

  monaco.languages.registerSignatureHelpProvider(LANGUAGE_IDS, {
    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp(model, position) {
      return lspRequest('textDocument/signatureHelp', pos(model, position)).then((r) => toSignatureHelp(r)) as never
    },
  })

  monaco.languages.registerDocumentSymbolProvider(LANGUAGE_IDS, {
    provideDocumentSymbols(model) {
      return lspRequest('textDocument/documentSymbol', { textDocument: { uri: model.uri.toString() } }).then((r) => toDocumentSymbols(r)) as never
    },
  })

  monaco.languages.registerFoldingRangeProvider(LANGUAGE_IDS, {
    provideFoldingRanges(model) {
      return lspRequest('textDocument/foldingRange', { textDocument: { uri: model.uri.toString() } }).then((r) => toFoldingRanges(r)) as never
    },
  })

  monaco.languages.registerDocumentFormattingEditProvider(LANGUAGE_IDS, {
    provideDocumentFormattingEdits(model, options) {
      return lspRequest('textDocument/formatting', {
        textDocument: { uri: model.uri.toString() },
        options: { tabSize: options.tabSize || 4, insertSpaces: options.insertSpaces !== false },
      }).then((r) => toTextEdits(r)) as never
    },
  })

  monaco.languages.registerDocumentHighlightProvider(LANGUAGE_IDS, {
    provideDocumentHighlights(model, position) {
      return lspRequest('textDocument/documentHighlight', pos(model, position)).then((r) => toHighlights(r)) as never
    },
  })
}

// ---------------------------------------------------------------------------
// Transporte de requests
// ---------------------------------------------------------------------------

async function lspRequest(method: string, params: unknown): Promise<unknown> {
  const c = connection
  if (!c) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await c.sendRequest(method as any, params as never)
  } catch {
    return null
  }
}

function pos(model: monacoEditor.ITextModel, position: monaco.IPosition) {
  return {
    textDocument: { uri: model.uri.toString() },
    position: { line: position.lineNumber - 1, character: position.column - 1 },
  }
}

// ---------------------------------------------------------------------------
// Conversores LSP → Monaco
// ---------------------------------------------------------------------------

function toCompletionItem(c: Record<string, unknown>) {
  return {
    label: String(c.label || ''),
    kind: c.kind as number,
    detail: c.detail as string | undefined,
    insertText: (c.insertText as string) || String(c.label),
    sortText: (c.sortText as string) || undefined,
    commitCharacters: c.commitCharacters as string[] | undefined,
  }
}

function toHover(h: Record<string, unknown>): monacoLanguages.Hover {
  const contents = h.contents as { kind?: string; value?: string } | string | Array<{ kind?: string; value?: string } | string>
  const value = Array.isArray(contents)
    ? contents.map((x) => (typeof x === 'string' ? x : x.value || '')).join('\n')
    : typeof contents === 'string'
      ? contents
      : contents?.value || ''
  const range = h.range as { start: { line: number; character: number }; end: { line: number; character: number } } | undefined
  return {
    contents: [{ value }],
    range: range ? { startLineNumber: range.start.line + 1, startColumn: range.start.character + 1, endLineNumber: range.end.line + 1, endColumn: range.end.character + 1 } : undefined,
  }
}

function toLocations(r: unknown): monacoLanguages.Location[] {
  const arr = Array.isArray(r) ? r : (r as { result?: unknown[] }).result || []
  return arr.map((l: unknown) => toLocation(l as { uri?: string; range?: { start: { line: number; character: number }; end: { line: number; character: number } } }))
}

function toLocation(l: { uri?: string; range?: { start: { line: number; character: number }; end: { line: number; character: number } } }) {
  return {
    uri: monaco.Uri.parse(l.uri || 'file:///'),
    range: {
      startLineNumber: l.range!.start.line + 1,
      startColumn: l.range!.start.character + 1,
      endLineNumber: l.range!.end.line + 1,
      endColumn: l.range!.end.character + 1,
    },
  }
}

function toWorkspaceEdit(r: { changes?: Record<string, { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }[]> }): monacoLanguages.WorkspaceEdit {
  const edits: monacoLanguages.IWorkspaceTextEdit[] = []
  for (const [uri, list] of Object.entries(r.changes || {})) {
    for (const e of list) {
      edits.push({
        resource: monaco.Uri.parse(uri),
        versionId: undefined,
        textEdit: {
          range: {
            startLineNumber: e.range.start.line + 1,
            startColumn: e.range.start.character + 1,
            endLineNumber: e.range.end.line + 1,
            endColumn: e.range.end.character + 1,
          },
          text: e.newText,
        },
      })
    }
  }
  return { edits }
}

function toSignatureHelp(r: unknown) {
  if (!r) return null
  const s = r as { signatures: { label: string; documentation?: string; parameters: { label: string; documentation?: string }[] }[]; activeSignature: number; activeParameter: number }
  const activeSig = s.signatures[s.activeSignature] || s.signatures[0]
  if (!activeSig) return null
  const startIndex = activeSig.label.indexOf('(')
  const endIndex = activeSig.label.lastIndexOf(')')
  return {
    signatures: s.signatures.map((sig) => {
      const open = sig.label.indexOf('(')
      const close = sig.label.lastIndexOf(')')
      const label = open >= 0 ? sig.label : sig.label
      return {
        label,
        documentation: sig.documentation,
        parameters: sig.parameters.map((p) => {
          const i = label.indexOf(p.label)
          return { label: i >= 0 ? [i, i + p.label.length] : [0, 0], documentation: p.documentation }
        }),
      }
    }),
    activeSignature: s.activeSignature,
    activeParameter: s.activeParameter,
  }
}

function toDocumentSymbols(r: unknown) {
  if (!r) return []
  const walk = (items: unknown[]): monacoLanguages.DocumentSymbol[] =>
    items.map((it) => {
      const i = it as { name: string; kind: number; range: { start: { line: number }; end: { line: number } }; selectionRange: { start: { line: number; character: number }; end: { line: number; character: number } }; children?: unknown[] }
      return {
        name: i.name,
        detail: '',
        kind: i.kind as monacoLanguages.SymbolKind,
        tags: [],
        range: new monaco.Range(i.range.start.line + 1, 1, i.range.end.line + 1, 1),
        selectionRange: new monaco.Range(i.selectionRange.start.line + 1, i.selectionRange.start.character + 1, i.selectionRange.end.line + 1, i.selectionRange.end.character + 1),
        children: i.children ? walk(i.children) : [],
      }
    })
  return walk(r as unknown[])
}

function toFoldingRanges(r: unknown) {
  if (!r) return []
  const arr = r as { startLine: number; endLine: number; kind?: string }[]
  return arr.map((f) => ({
    start: f.startLine + 1,
    end: f.endLine + 1,
    kind: (f.kind || 'region') as unknown as monacoLanguages.FoldingRangeKind,
  }))
}

function toTextEdits(r: unknown) {
  if (!r) return []
  const arr = r as { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }[]
  return arr.map((e) => ({
    range: {
      startLineNumber: e.range.start.line + 1,
      startColumn: e.range.start.character + 1,
      endLineNumber: e.range.end.line + 1,
      endColumn: e.range.end.character + 1,
    },
    text: e.newText,
  }))
}

function toHighlights(r: unknown) {
  if (!r) return []
  const arr = r as { range: { start: { line: number; character: number }; end: { line: number; character: number } }; kind?: string }[]
  return arr.map((h) => ({
    range: {
      startLineNumber: h.range.start.line + 1,
      startColumn: h.range.start.character + 1,
      endLineNumber: h.range.end.line + 1,
      endColumn: h.range.end.character + 1,
    },
    kind: (h.kind === 'write' ? monaco.languages.DocumentHighlightKind.Write : monaco.languages.DocumentHighlightKind.Text) as monacoLanguages.DocumentHighlightKind,
  }))
}

// La documentación del worker usa didOpen/didChange vía TextDocuments del
// servidor; aquí simplemente disparamos el init cuando hay workspace.
export function setupLspLifecycle() {
  window.addEventListener('deneb:workspace-opened', () => {
    void initLsp().then(() => syncWorkspaceFiles())
  })
}
