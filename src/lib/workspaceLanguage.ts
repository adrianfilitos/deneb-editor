import * as monaco from 'monaco-editor'
import type { languages as monacoLanguages, editor as monacoEditor } from 'monaco-editor'
import { useEditorStore } from '../store/editorStore'
import { walkFiles, readFileAt, type AnyHandle } from './fileSystem'
import { extractSymbols } from './symbols'
import { isBinaryName } from './fileIcons'

interface SymbolRef {
  path: string
  name: string
  line: number
  col: number
  kind: string
}

export interface WorkspaceSymbol {
  name: string
  path: string
  line: number
  col: number
  kind: string
  language: string
}

// Index global: nombre → localizaciones (declaraciones + usos)
const nameIndex = new Map<string, SymbolRef[]>()
const fileIndex = new Map<string, SymbolRef[]>()
let indexedRoot: AnyHandle | null = null
let indexing = false
let providersRegistered = false

const INTERESTING = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin']

function languageOf(path: string): string {
  const ext = (path.split('/').pop() || '').split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    py: 'python', go: 'go', rs: 'rust', java: 'java', c: 'c', h: 'c',
    cpp: 'cpp', hpp: 'cpp', cc: 'cpp', cs: 'csharp', php: 'php',
    rb: 'ruby', swift: 'swift', kt: 'kotlin', kts: 'kotlin',
  }
  return map[ext] || ''
}

// Tokenización simple del identificador bajo el cursor
function wordAt(model: monacoEditor.ITextModel, position: monaco.IPosition): { word: string; range: monaco.IRange } {
  const wordInfo = model.getWordAtPosition(position)
  if (!wordInfo) return { word: '', range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column } }
  return {
    word: wordInfo.word,
    range: {
      startLineNumber: position.lineNumber,
      startColumn: wordInfo.startColumn,
      endLineNumber: position.lineNumber,
      endColumn: wordInfo.endColumn,
    },
  }
}

export async function indexWorkspace(root: AnyHandle | null): Promise<void> {
  if (!root || indexing) return
  indexing = true
  nameIndex.clear()
  fileIndex.clear()
  indexedRoot = root
  const seen = new Set<string>()
  const jobs: Promise<void>[] = []
  walkFiles(root, (path, handle) => {
    const lang = languageOf(path)
    if (!lang || isBinaryName(path.split('/').pop() || '') || path.includes('/.nova/') || path.includes('/node_modules/')) return
    if (seen.has(path)) return
    seen.add(path)
    jobs.push(
      readFileAt(root, path).then((content) => {
        if (!content || content.length > 500_000) return
        indexFile(path, lang, content)
      }).catch(() => {}),
    )
  }).then(() => Promise.all(jobs)).then(() => {
    indexing = false
    window.dispatchEvent(new CustomEvent('nova:index-ready'))
  }).catch(() => {
    indexing = false
  })
}

function indexFile(path: string, lang: string, content: string) {
  const lines = content.split('\n')
  const refs: SymbolRef[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const tokens = line.match(/[A-Za-z_$][A-Za-z0-9_$]*/g)
    if (!tokens) continue
    // Declaraciones principales (línea completa) → push al índice de nombre
    const symbols = extractSymbols(content.slice(0, 0) || '', '') // noop
    void symbols
    // Detectar declaración de nivel superior por regex
    const decl = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(line)
    if (decl) {
      const col = line.indexOf(decl[1]) + 1
      refs.push({ path, name: decl[1], line: i + 1, col, kind: 'decl' })
    }
    // Usos de funciones/const importadas y llamadas
    for (const t of tokens) {
      if (t.length < 2) continue
      const isCall = line.indexOf(`${t}(`) >= 0 || line.indexOf(`${t} (`) >= 0
      refs.push({ path, name: t, line: i + 1, col: line.indexOf(t) + 1, kind: isCall ? 'call' : 'use' })
    }
  }
  fileIndex.set(path, refs)
  for (const r of refs) {
    if (r.kind === 'decl' || r.kind === 'call') {
      const arr = nameIndex.get(r.name) || []
      arr.push(r)
      nameIndex.set(r.name, arr)
    }
  }
}

export function getWorkspaceSymbols(): WorkspaceSymbol[] {
  const out: WorkspaceSymbol[] = []
  for (const path of fileIndex.keys()) {
    const lang = languageOf(path)
    const refs = fileIndex.get(path) || []
    for (const r of refs) {
      if (r.kind === 'decl') out.push({ name: r.name, path, line: r.line, col: r.col, kind: 'decl', language: lang })
    }
  }
  return out
}

function refToLocation(ref: SymbolRef, isDeclaration: boolean): monacoLanguages.Location {
  return {
    uri: monaco.Uri.parse(`file:///${ref.path}`),
    range: {
      startLineNumber: ref.line,
      startColumn: ref.col,
      endLineNumber: ref.line,
      endColumn: ref.col + ref.name.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export function registerWorkspaceLanguageProviders(monaco: typeof import('monaco-editor')) {
  if (providersRegistered) return
  providersRegistered = true

  monaco.languages.registerDefinitionProvider(INTERESTING, {
    provideDefinition(model, position): monacoLanguages.ProviderResult<monacoLanguages.Definition> {
      const { word } = wordAt(model, position)
      if (!word) return null
      const decls = (nameIndex.get(word) || []).filter((r) => r.kind === 'decl')
      if (!decls.length) return null
      // Preferir una declaración distinta del archivo actual (cross-file)
      const currentPath = model.uri.path.replace(/^\//, '')
      const target = decls.find((r) => r.path !== currentPath) || decls[0]
      return refToLocation(target, true)
    },
  })

  monaco.languages.registerReferenceProvider(INTERESTING, {
    provideReferences(model, position): monacoLanguages.ProviderResult<monacoLanguages.Location[]> {
      const { word } = wordAt(model, position)
      if (!word) return []
      const refs = nameIndex.get(word) || []
      if (!refs.length) return []
      const unique = new Map<string, monacoLanguages.Location>()
      for (const r of refs) {
        const loc = refToLocation(r, r.kind === 'decl')
        const key = `${r.path}:${r.line}:${r.col}`
        if (!unique.has(key)) unique.set(key, loc)
      }
      return [...unique.values()]
    },
  })

  monaco.languages.registerRenameProvider(INTERESTING, {
    provideRenameEdits(model, position, newName): monacoLanguages.ProviderResult<monacoLanguages.WorkspaceEdit> {
      const { word } = wordAt(model, position)
      if (!word) return null
      const refs = nameIndex.get(word) || []
      if (!refs.length) return null
      const byFile = new Map<string, SymbolRef[]>()
      for (const r of refs) {
        const arr = byFile.get(r.path) || []
        arr.push(r)
        byFile.set(r.path, arr)
      }
      const textEdits: monacoLanguages.IWorkspaceTextEdit[] = []
      for (const [path, list] of byFile) {
        textEdits.push({
          resource: monaco.Uri.parse(`file:///${path}`),
          versionId: undefined,
          textEdit: {
            range: {
              startLineNumber: list[0].line,
              startColumn: list[0].col,
              endLineNumber: list[0].line,
              endColumn: list[0].col + word.length,
            },
            text: newName,
          },
        })
      }
      return { edits: textEdits }
    },
  })

  monaco.languages.registerDocumentSymbolProvider(INTERESTING, {
    provideDocumentSymbols(model): monacoLanguages.ProviderResult<monacoLanguages.DocumentSymbol[]> {
      const path = model.uri.path.replace(/^\//, '')
      const refs = fileIndex.get(path) || []
      const lang = model.getLanguageId()
      const content = model.getValue()
      const symbols = extractSymbols(content, lang)
      const root = new Map<string, monacoLanguages.DocumentSymbol>()
      const roots: monacoLanguages.DocumentSymbol[] = []
      for (const s of symbols) {
        const ds: monacoLanguages.DocumentSymbol = {
          name: s.name,
          detail: s.kind,
          kind: docSymbolKind(s.kind),
          tags: [],
          range: new monaco.Range(s.line, 1, s.line, 1),
          selectionRange: new monaco.Range(s.line, 1, s.line, 1 + s.name.length),
          children: [],
        }
        if (s.depth === 0) {
          roots.push(ds)
          root.set(s.name, ds)
        } else {
          const parent = root.get(s.name) || roots[roots.length - 1]
          if (parent) (parent.children ||= []).push(ds)
        }
      }
      // añadir refs que no estén como símbolos (por si extractSymbols no detectó)
      void refs
      return roots
    },
  })
}

function docSymbolKind(kind: string): monaco.languages.SymbolKind {
  switch (kind) {
    case 'function': case 'method': return monaco.languages.SymbolKind.Function
    case 'class': return monaco.languages.SymbolKind.Class
    case 'interface': case 'type': return monaco.languages.SymbolKind.Interface
    case 'enum': return monaco.languages.SymbolKind.Enum
    case 'variable': return monaco.languages.SymbolKind.Variable
    case 'struct': return monaco.languages.SymbolKind.Struct
    case 'heading': case 'selector': return monaco.languages.SymbolKind.String
    case 'import': return monaco.languages.SymbolKind.Module
    default: return monaco.languages.SymbolKind.Variable
  }
}

// Hook: reindexar cuando cambia un archivo o se abre workspace
export function setupIndexHooks() {
  window.addEventListener('nova:workspace-opened', () => {
    const root = useEditorStore.getState().root?.handle as AnyHandle | null
    void indexWorkspace(root)
  })
  window.addEventListener('nova:fs-change', (e) => {
    const detail = (e as CustomEvent<{ kind: string; path: string }>).detail
    if (!detail) return
    const root = indexedRoot || (useEditorStore.getState().root?.handle as AnyHandle | null)
    if (!root) return
    if (detail.kind === 'changed') {
      // reindexar solo el archivo tocado es costoso; reindexamos de forma barata
      void indexWorkspace(root)
    }
  })
}

// Exponer el mapa para tests
export function __getNameIndex(): Map<string, SymbolRef[]> {
  return nameIndex
}

export function __isIndexing(): boolean {
  return indexing
}

export function __resetIndexForTest() {
  nameIndex.clear()
  fileIndex.clear()
  indexedRoot = null
  indexing = false
}
