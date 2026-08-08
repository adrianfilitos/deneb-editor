export const noopDisposable = { dispose() {} }

export const languages = {
  register: () => noopDisposable,
  getLanguages: () => [],
  setLanguageConfiguration: () => noopDisposable,
  registerCompletionItemProvider: () => noopDisposable,
  registerHoverProvider: () => noopDisposable,
  registerDefinitionProvider: () => noopDisposable,
  registerReferenceProvider: () => noopDisposable,
  registerDocumentSymbolProvider: () => noopDisposable,
  registerSignatureHelpProvider: () => noopDisposable,
  registerCodeActionsProvider: () => noopDisposable,
  registerFoldingRangeProvider: () => noopDisposable,
  registerDocumentHighlightProvider: () => noopDisposable,
  registerCodeLensProvider: () => noopDisposable,
  registerLinkProvider: () => noopDisposable,
  registerInlayHintsProvider: () => noopDisposable,
  registerSelectionRangeProvider: () => noopDisposable,
  registerInlineCompletionsProvider: () => noopDisposable,
  registerDocumentFormattingEditProvider: () => noopDisposable,
  registerDocumentRangeFormattingEditProvider: () => noopDisposable,
  registerDocumentColorProvider: () => noopDisposable,
  CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
}

export const editor = {
  getModel: () => null,
  getModels: () => [],
  onDidCreateModel: () => noopDisposable,
  setModelMarkers: () => {},
  OverviewRulerLane: { Full: 7 },
}

export const Uri = {
  parse: (s: string) => ({ toString: () => s, path: s }),
  file: (p: string) => ({ toString: () => p, path: p, fsPath: p }),
}

export const MarkerSeverity = { Error: 8, Warning: 4, Info: 2, Hint: 1 }

export default { languages, editor, Uri, MarkerSeverity }
