// NÃºcleo LSP: envuelve el Language Service real de TypeScript y expone los
// mÃ©todos del protocolo. Es cÃ³digo puro (sin Worker ni Monaco) para poder
// probarse en Node y ejecutarse igual en el Worker del navegador.

import ts from 'typescript'

export interface LspTextDocument {
  uri: string
  text: string
  languageId: string
  version: number
}

interface FileMap {
  [path: string]: string
}

export class TsLanguageService {
  private files: FileMap = {}
  private service: ts.LanguageService | null = null
  private rootPaths: string[] = []
  private docs: Record<string, LspTextDocument> = {}
  private defaultCompilerOptions: ts.CompilerOptions

  constructor(rootPaths: string[] = []) {
    this.rootPaths = rootPaths
    this.defaultCompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      esModuleInterop: true,
      allowJs: true,
      checkJs: false,
      skipLibCheck: true,
      resolveJsonModule: true,
      sourceMap: true,
    }
  }

  // ---------------------------------------------------------------------------
  // GestiÃ³n de documentos
  // ---------------------------------------------------------------------------

  toPath(uri: string): string {
    return uri.replace(/^file:\/\//, '').replace(/\\/g, '/')
  }

  openDocument(doc: LspTextDocument): void {
    const p = this.toPath(doc.uri)
    this.files[p] = doc.text
    this.docs[doc.uri] = doc
    this.docs[p] = doc
    this.rebuild()
  }

  changeDocument(uri: string, text: string, version: number): void {
    const p = this.toPath(uri)
    this.files[p] = text
    if (this.docs[uri] || this.docs[p]) {
      const doc = this.docs[uri] || this.docs[p]
      this.docs[uri] = { ...doc, text, version }
      this.docs[p] = this.docs[uri]
    } else {
      const doc = { uri, text, languageId: 'typescript', version }
      this.docs[uri] = doc
      this.docs[p] = doc
    }
    this.rebuild()
  }

  closeDocument(uri: string): void {
    const p = this.toPath(uri)
    delete this.files[p]
    delete this.docs[uri]
    delete this.docs[p]
    this.rebuild()
  }

  setFiles(files: Record<string, string>): void {
    this.files = { ...files }
    this.rebuild()
  }

  private docOfUri(uri: string): LspTextDocument | null {
    const p = this.toPath(uri)
    return this.docs[uri] || this.docs[p] || null
  }

  private rebuild(): void {
    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => Object.keys(this.files),
      getScriptVersion: () => '0',
      getScriptSnapshot: (fileName) => {
        const text = this.files[fileName]
        if (text === undefined) return undefined
        return ts.ScriptSnapshot.fromString(text)
      },
      getCurrentDirectory: () => this.rootPaths[0] || '/',
      getCompilationSettings: () => this.defaultCompilerOptions,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (f) => Object.prototype.hasOwnProperty.call(this.files, this.toPath(f)),
      readFile: (f) => this.files[this.toPath(f)] || undefined,
      readDirectory: () => Object.keys(this.files),
      directoryExists: () => true,
      getDirectories: () => [],
    }
    this.service = ts.createLanguageService(host)
  }

  private svc(): ts.LanguageService {
    if (!this.service) this.rebuild()
    return this.service!
  }

  private offsetAt(doc: LspTextDocument, line: number, character: number): number {
    const lines = doc.text.split('\n')
    let offset = 0
    for (let i = 0; i < line && i < lines.length; i++) offset += lines[i].length + 1
    return Math.min(offset + character, doc.text.length)
  }

  private positionAt(doc: LspTextDocument, offset: number): { line: number; character: number } {
    const text = doc.text.slice(0, offset)
    const idx = text.lastIndexOf('\n')
    return { line: text.split('\n').length - 1, character: idx >= 0 ? offset - idx - 1 : offset }
  }

  // ---------------------------------------------------------------------------
  // MÃ©todos del protocolo
  // ---------------------------------------------------------------------------

  completion(uri: string, line: number, character: number) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const items = this.svc().getCompletionsAtPosition(path, offset, {
      includeCompletionsWithInsertText: true,
    })
    if (!items) return null
    return items.entries.map((e) => ({
      label: e.name,
      kind: completionKind(e.kind),
      detail: e.kindModifiers || undefined,
      insertText: e.insertText || e.name,
      sortText: e.sortText,
      commitCharacters: e.commitCharacters,
    }))
  }

  resolveCompletion(uri: string, line: number, character: number, label: string) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const details = this.svc().getCompletionEntryDetails(path, offset, label, undefined, undefined, undefined, undefined)
    if (!details) return null
    return {
      label: details.name,
      detail: details.displayParts?.map((p) => p.text).join('') || undefined,
      documentation: details.documentation?.map((p) => p.text).join(''),
    }
  }

  hover(uri: string, line: number, character: number) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const info = this.svc().getQuickInfoAtPosition(path, offset)
    if (!info) return null
    const text = info.displayParts?.map((p) => p.text).join('') || ''
    const docText = info.documentation?.map((p) => p.text).join('\n') || ''
    return {
      contents: { kind: 'markdown', value: '```typescript\n' + text + '\n```' + (docText ? '\n\n' + docText : '') },
      range: info.textSpan
        ? {
            start: this.positionAt(doc, info.textSpan.start),
            end: this.positionAt(doc, info.textSpan.start + info.textSpan.length),
          }
        : undefined,
    }
  }

  definition(uri: string, line: number, character: number) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const defs = this.svc().getDefinitionAtPosition(path, offset)
    if (!defs || !defs.length) return null
    return defs
      .map((d) => {
        const src = d.fileName
        return {
          uri: 'file://' + src,
          range: {
            start: this.positionAt(this.docOf(src), d.textSpan.start),
            end: this.positionAt(this.docOf(src), d.textSpan.start + d.textSpan.length),
          },
        }
      })
      .slice(0, 10)
  }

  references(uri: string, line: number, character: number, includeDeclaration = true) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const refs = this.svc().getReferencesAtPosition(path, offset)
    if (!refs || !refs.length) return null
    const defAt = this.svc().getDefinitionAtPosition(path, offset)?.[0]
    const defKey = defAt ? `${defAt.fileName}:${defAt.textSpan.start}` : null
    return refs
      .filter((r) => includeDeclaration || defKey !== `${r.fileName}:${r.textSpan.start}`)
      .map((r) => ({
        uri: 'file://' + r.fileName,
        range: {
          start: this.positionAt(this.docOf(r.fileName), r.textSpan.start),
          end: this.positionAt(this.docOf(r.fileName), r.textSpan.start + r.textSpan.length),
        },
      }))
  }

  rename(uri: string, line: number, character: number, newName: string) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const info = this.svc().findRenameLocations(path, offset, false, false, false)
    if (!info || !info.length) return null
    const edits: { textDocument: { uri: string }; edits: { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }[] }[] = []
    const byFile = new Map<string, ts.RenameLocation[]>()
    for (const r of info) {
      const arr = byFile.get(r.fileName) || []
      arr.push(r)
      byFile.set(r.fileName, arr)
    }
    for (const [file, list] of byFile) {
      edits.push({
        textDocument: { uri: 'file://' + file },
        edits: list.map((r) => ({
          range: { start: this.positionAt(this.docOf(file), r.textSpan.start), end: this.positionAt(this.docOf(file), r.textSpan.start + r.textSpan.length) },
          newText: newName,
        })),
      })
    }
    return { changes: edits }
  }

  signatureHelp(uri: string, line: number, character: number) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const sig = this.svc().getSignatureHelpItems(path, offset, undefined)
    if (!sig) return null
    return {
      signatures: sig.items.map((it) => ({
        label: it.prefixDisplayParts?.map((p) => p.text).join('') || '',
        documentation: it.documentation?.map((p) => p.text).join('') || undefined,
        parameters: (it.parameters || []).map((p) => ({
          label: p.displayParts?.map((x) => x.text).join('') || '',
          documentation: p.documentation?.map((x) => x.text).join('') || undefined,
        })),
      })),
      activeSignature: sig.selectedItemIndex,
      activeParameter: sig.argumentIndex,
    }
  }

  documentSymbol(uri: string) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const outline = this.svc().getNavigationBarItems(path)
    if (!outline || !outline.length) return null
    const toSymbol = (item: ts.NavigationBarItem): unknown => ({
      name: item.text,
      kind: symbolKind(item.kind),
      range: {
        start: this.positionAt(doc, item.spans[0].start),
        end: this.positionAt(doc, item.spans[0].start + item.spans[0].length),
      },
      selectionRange: {
        start: this.positionAt(doc, item.spans[0].start),
        end: this.positionAt(doc, item.spans[0].start + item.spans[0].length),
      },
      children: (item.childItems || []).map(toSymbol),
    })
    return outline.map(toSymbol)
  }

  foldingRanges(uri: string) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const outline = this.svc().getOutliningSpans(path)
    if (!outline) return null
    return outline
      .filter((s) => s.textSpan.length > 40)
      .map((s) => ({
        startLine: s.textSpan.start === 0 ? 0 : this.positionAt(doc, s.textSpan.start).line,
        endLine: this.positionAt(doc, s.textSpan.start + s.textSpan.length).line,
        kind: s.kind === ts.OutliningSpanKind.Comment ? 'comment' : 'region',
      }))
  }

  formatDocument(uri: string, tabSize: number, insertSpaces: boolean) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const opts = ts.getDefaultFormatCodeSettings()
    opts.tabSize = tabSize || 4
    opts.indentSize = tabSize || 4
    opts.convertTabsToSpaces = insertSpaces !== false
    const edits = this.svc().getFormattingEditsForDocument(path, opts)
    if (!edits || !edits.length) return null
    return edits.map((e) => ({
      range: {
        start: this.positionAt(doc, e.span.start),
        end: this.positionAt(doc, e.span.start + e.span.length),
      },
      newText: e.newText,
    }))
  }

  documentHighlight(uri: string, line: number, character: number) {
    const doc = this.docOfUri(uri)
    if (!doc) return null
    const path = this.toPath(uri)
    const offset = this.offsetAt(doc, line, character)
    const items = this.svc().getDocumentHighlights(path, offset, [path])
    if (!items || !items.length) return null
    return items[0].highlightSpans.map((h) => ({
      range: {
        start: this.positionAt(doc, h.textSpan.start),
        end: this.positionAt(doc, h.textSpan.start + h.textSpan.length),
      },
      kind: h.kind === ts.HighlightSpanKind.writtenReference ? 'write' : 'text',
    }))
  }

  // ---------------------------------------------------------------------------

  private docOf(path: string): LspTextDocument {
    return { uri: 'file://' + path, text: this.files[path] || '', languageId: 'typescript', version: 0 }
  }
}

function completionKind(kind: ts.ScriptElementKind): number {
  const map: Record<string, number> = {
    class: 7, interface: 8, type: 6, enum: 13, function: 3, method: 2, variable: 6,
    const: 6, let: 6, keyword: 14, property: 10, parameter: 6, member: 6, string: 15,
    module: 9, alias: 6, construct: 7,
  }
  return map[kind] ?? 6
}

function symbolKind(kind: ts.ScriptElementKind): number {
  const map: Record<string, number> = {
    class: 5, interface: 11, function: 12, method: 6, variable: 13, const: 13,
    let: 13, module: 2, enum: 10, type: 17, property: 7,
  }
  return map[kind] ?? 13
}
