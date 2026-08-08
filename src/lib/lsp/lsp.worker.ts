// Servidor LSP real que se ejecuta en un Worker del navegador.
// Usa la implementación oficial de vscode-languageserver sobre un MessagePort
// y delega en el Language Service de TypeScript (el mismo motor que tsserver).

/// <reference lib="webworker" />
import { createConnection, ProposedFeatures, TextDocuments, type TextDocumentChangeEvent } from 'vscode-languageserver/browser'
import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-jsonrpc/browser'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { TsLanguageService } from './tsLanguageService'

declare const self: DedicatedWorkerGlobalScope

const connection = createConnection(new BrowserMessageReader(self as unknown as MessagePort), new BrowserMessageWriter(self as unknown as MessagePort))

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
const ts = new TsLanguageService(['/workspace'])

let rootUri: string | null = null

function tsDoc(uri: string) {
  const doc = documents.get(uri)
  if (!doc) return null
  return { uri, text: doc.getText(), languageId: doc.languageId, version: doc.version }
}

// ---- lifecycle ----
connection.onInitialize((params) => {
  rootUri = params.rootUri || params.workspaceFolders?.[0]?.uri || null
  return {
    capabilities: {
      textDocumentSync: { openClose: true, change: 1 },
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '"', "'", '`', '/', '@', '<'],
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: true,
      signatureHelpProvider: { triggerCharacters: ['(', ','] },
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      documentFormattingProvider: true,
      documentHighlightProvider: true,
    },
    serverInfo: { name: 'nova-lsp', version: '1.0.0' },
  }
})

// ---- documents ----
documents.onDidOpen((e) => {
  ts.openDocument(toDoc(e))
})
documents.onDidChangeContent((e) => {
  const doc = tsDoc(e.document.uri)
  if (doc) ts.changeDocument(doc.uri, doc.text, doc.version)
})
documents.onDidClose((e) => {
  ts.closeDocument(e.document.uri)
})

function toDoc(e: TextDocumentChangeEvent<TextDocument>) {
  const d = e.document
  return { uri: d.uri, text: d.getText(), languageId: d.languageId, version: d.version }
}

// workspace: cargar todos los archivos del workspace al abrir
connection.onNotification('nova/workspaceFiles', (params: { files: Record<string, string> }) => {
  const files = params.files || {}
  for (const [path, text] of Object.entries(files)) {
    const uri = path.startsWith('file:') ? path : 'file://' + path
    ts.openDocument({ uri, text, languageId: 'typescript', version: 1 })
  }
})

// ---- features ----
connection.onCompletion((params) =>
  ts.completion(params.textDocument.uri, params.position.line, params.position.character) as never,
)
connection.onCompletionResolve((item) => {
  const doc = documents.all().find((d) => d.getText().includes(item.label))
  if (!doc) return item
  const idx = doc.getText().indexOf(item.label)
  if (idx < 0) return item
  const line = doc.getText().slice(0, idx).split('\n').length - 1
  const character = idx - doc.getText().slice(0, idx).lastIndexOf('\n') - 1
  const resolved = ts.resolveCompletion(doc.uri, line, character, item.label)
  if (resolved) Object.assign(item, resolved)
  return item
})

connection.onHover((params) => ts.hover(params.textDocument.uri, params.position.line, params.position.character) as never)
connection.onDefinition((params) => ts.definition(params.textDocument.uri, params.position.line, params.position.character) as never)
connection.onReferences((params) => ts.references(params.textDocument.uri, params.position.line, params.position.character, !!params.context?.includeDeclaration) as never)
connection.onRenameRequest((params) => ts.rename(params.textDocument.uri, params.position.line, params.position.character, params.newName) as never)
connection.onSignatureHelp((params) => ts.signatureHelp(params.textDocument.uri, params.position.line, params.position.character) as never)
connection.onDocumentSymbol((params) => ts.documentSymbol(params.textDocument.uri) as never)
connection.onFoldingRanges((params) => ts.foldingRanges(params.textDocument.uri) as never)
connection.onDocumentFormatting((params) => {
  const doc = tsDoc(params.textDocument.uri)
  if (!doc) return null
  return ts.formatDocument(params.textDocument.uri, params.options.tabSize || 4, params.options.insertSpaces !== false) as never
})
connection.onDocumentHighlight((params) => ts.documentHighlight(params.textDocument.uri, params.position.line, params.position.character) as never)

documents.listen(connection)
connection.listen()
