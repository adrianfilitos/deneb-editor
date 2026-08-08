import * as monaco from 'monaco-editor'
import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es'
import type { languages as monacoLanguages } from 'monaco-editor'
import { registerDynamicCommand } from './commandRegistry'

interface UserSnippet {
  prefix: string
  body: string | string[]
  description?: string
  scope?: string
}

let snippetsLoaded = false
let userSnippets: UserSnippet[] = []
let emmetSetup = false

export function initEditorEnhancements() {
  registerUserSnippetProvider()
  registerFormatCommand()
  setupEmmet()
}

// ---------------------------------------------------------------------------
// Emmet
// ---------------------------------------------------------------------------

export function setupEmmet() {
  if (emmetSetup) return
  emmetSetup = true
  try {
    emmetHTML()
    emmetCSS()
    emmetJSX()
  } catch {
    // emmet ya registrado o no disponible
  }
}

// ---------------------------------------------------------------------------
// Snippets de usuario (snippets.json en el workspace o global)
// ---------------------------------------------------------------------------

export function setUserSnippets(snippets: UserSnippet[]) {
  userSnippets = snippets || []
  registerUserSnippetProvider()
}

export function getUserSnippets(): UserSnippet[] {
  return userSnippets
}

const SNIPPET_LANGS: Record<string, string[]> = {
  javascript: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
  typescript: ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'],
  typescriptreact: ['typescriptreact', 'typescript', 'javascriptreact', 'javascript'],
  html: ['html', 'handlebars', 'vue', 'svelte'],
  css: ['css', 'scss', 'less'],
  json: ['json', 'jsonc'],
  markdown: ['markdown'],
  python: ['python'],
}

function languageMatches(scope: string | undefined, lang: string): boolean {
  if (!scope) return true
  const wanted = scope.toLowerCase()
  if (wanted === lang) return true
  const expand = SNIPPET_LANGS[lang] || []
  return expand.includes(wanted) || wanted === 'all'
}

function registerUserSnippetProvider() {
  if (snippetsLoaded) return
  snippetsLoaded = true
  monaco.languages.registerCompletionItemProvider('*', {
    triggerCharacters: [],
    provideCompletionItems(model, position): monacoLanguages.ProviderResult<monacoLanguages.CompletionList> {
      const lang = model.getLanguageId()
      const line = model.getLineContent(position.lineNumber)
      const word = line.slice(0, position.column - 1)
      const match = /([\w:-]*)$/.exec(word)
      const prefix = match ? match[1] : ''
      if (!prefix) return { suggestions: [] }

      const suggestions: monacoLanguages.CompletionItem[] = []
      for (const s of userSnippets) {
        if (!s.prefix.startsWith(prefix) || !languageMatches(s.scope, lang)) continue
        const body = Array.isArray(s.body) ? s.body.join('\n') : s.body
        const bodyWithTabs = body
          .replace(/\t/g, '\t')
          .replace(/\$([1-9])/g, '${$1:}')
        suggestions.push({
          label: s.prefix,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'snippet · usuario',
          documentation: s.description ? { value: s.description } : undefined,
          insertText: bodyWithTabs,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column - prefix.length,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
        })
      }
      return { suggestions }
    },
  })
}

// ---------------------------------------------------------------------------
// Formato de documento (comando y acción para la paleta)
// ---------------------------------------------------------------------------

function registerFormatCommand() {
  const id = 'editor.action.formatDocument'
  if (commandRegistered.has(id)) return
  commandRegistered.add(id)
  registerDynamicCommand({
    id,
    title: 'Formatear documento',
    category: 'Editor',
    keybinding: 'Shift+Alt+F',
    icon: 'wand',
    run: () => {
      const editor = (window as unknown as { __novaEditor?: { getAction?: (id: string) => { run?: () => Promise<void> } | undefined } | undefined }).__novaEditor
      const action = editor?.getAction?.('editor.action.formatDocument')
      if (action?.run) void action.run()
    },
  })
}

const commandRegistered = new Set<string>()

export function getEmmetStatus(): boolean {
  return true
}
