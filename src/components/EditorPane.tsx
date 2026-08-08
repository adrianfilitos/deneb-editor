import { useCallback, useEffect, useMemo, useRef } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor, languages as monacoLanguages, IDisposable } from 'monaco-editor'
import { useEditorStore } from '../store/editorStore'
import { defineDenebThemes, setEditorTheme } from '../lib/monaco'
import { VimMode } from '../lib/vim'
import { useAIChatStore } from '../store/aiChatStore'
import type { ChatMessage } from '../types'
import { getContributedMenu, type WhenContext } from '../lib/extensions/menuRegistry'
import { executeExtensionCommand } from '../lib/extHost/vscodeShim'
import { languageFromPath } from '../lib/languages'
import { registerWorkspaceLanguageProviders } from '../lib/workspaceLanguage'
import { handleGutterClick, updateBreakpointDecorations } from '../lib/debugger'

let themesDefined = false

type FocusTracker = { __denebFocusPath?: string; __denebEditor?: monacoEditor.IStandaloneCodeEditor }
const focusWindow = window as unknown as FocusTracker

const editorMenuActions = new Map<monacoEditor.IStandaloneCodeEditor, IDisposable[]>()

function editorWhenCtx(path: string | null): WhenContext {
  const extMatch = path ? /\.([a-zA-Z0-9]+)$/.exec(path.split('/').pop() || '') : null
  return {
    resourceLangId: path ? languageFromPath(path) : undefined,
    resourceExtname: path ? `.${(extMatch?.[1] || '').toLowerCase()}` : undefined,
    resourceFilename: path ? path.split('/').pop() : undefined,
    editorLangId: path ? languageFromPath(path) : undefined,
    resourceScheme: 'file',
  }
}

function syncEditorContextMenu(editor: monacoEditor.IStandaloneCodeEditor, path: string | null) {
  const old = editorMenuActions.get(editor) || []
  for (const d of old) {
    try {
      d.dispose()
    } catch {
      // ignore
    }
  }
  const disps: IDisposable[] = []
  const ctx = editorWhenCtx(path)
  for (const m of getContributedMenu('editor/context', ctx)) {
    const disp = editor.addAction({
      id: `ext-menu:${m.extId}:${m.command}`,
      label: m.label,
      contextMenuGroupId: 'extensions',
      run: () => {
        try {
          const r = executeExtensionCommand(m.command)
          if (r && typeof r.then === 'function') r.catch(() => {})
        } catch {
          // ignore
        }
      },
    })
    disps.push(disp)
  }
  editorMenuActions.set(editor, disps)
}

export function EditorPane({ groupId }: { groupId: string }) {
  const group = useEditorStore((s) => s.groups.find((g) => g.id === groupId))
  const activePath = group?.activePath ?? null
  const activeTab = useEditorStore((s) => s.openTabs.find((t) => t.path === activePath))
  const updateTabContent = useEditorStore((s) => s.updateTabContent)
  const setCursor = useEditorStore((s) => s.setCursor)
  const settings = useEditorStore((s) => s.settings)
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const vimRef = useRef<VimMode | null>(null)
  const pathRef = useRef(activePath)

  useEffect(() => {
    if (!themesDefined) {
      defineDenebThemes()
      themesDefined = true
    }
    setEditorTheme(settings.theme)
  }, [settings.theme])

  // Vim mode toggle
  useEffect(() => {
    vimRef.current?.setEnabled(settings.vimMode)
  }, [settings.vimMode])

  const options = useMemo<monacoEditor.IStandaloneEditorConstructionOptions>(() => ({
    fontSize: settings.fontSize,
    lineHeight: Math.round(settings.fontSize * settings.lineHeight),
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap,
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers,
    cursorBlinking: settings.cursorBlinking,
    cursorStyle: settings.cursorStyle,
    fontLigatures: settings.fontLigatures,
    renderWhitespace: settings.renderWhitespace,
    smoothScrolling: settings.smoothScrolling,
    stickyScroll: { enabled: settings.stickyScroll },
    bracketPairColorization: { enabled: settings.bracketPairColorization },
    guides: { bracketPairs: settings.indentGuides, indentation: settings.indentGuides },
    scrollBeyondLastLine: settings.scrollBeyondLastLine,
    autoClosingBrackets: settings.autoClosingBrackets ? 'always' : 'never',
    formatOnPaste: settings.formatOnPaste,
    mouseWheelZoom: settings.mouseWheelZoom,
    wordBasedSuggestions: settings.wordBasedSuggestions ? 'matchingDocuments' : 'off',
    parameterHints: { enabled: settings.parameterHints },
    folding: settings.folding,
    automaticLayout: true,
    padding: { top: 12, bottom: 12 },
    cursorSmoothCaretAnimation: 'on',
    fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
    fontSmoothing: 'antialiased',
    roundedSelection: true,
    suggest: { preview: true, showStatusBar: true },
    quickSuggestions: { other: true, comments: false, strings: true },
    codeLens: true,
    links: true,
    foldingHighlight: true,
    matchBrackets: 'always',
    renderLineHighlight: 'all',
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
  }), [settings])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    focusWindow.__denebEditor = editor
    if (activePath) focusWindow.__denebFocusPath = activePath
    vimRef.current = new VimMode(editor)
    vimRef.current.setEnabled(settings.vimMode)
    registerWorkspaceLanguageProviders(monaco as typeof import('monaco-editor'))
    setupAIActions(editor, monaco)
    setupInlineCompletions(monaco)
    syncEditorContextMenu(editor, activePath)
    const onMenusChanged = () => syncEditorContextMenu(editor, activePath)
    window.addEventListener('deneb:ext-menus-changed', onMenusChanged)
    editor.onDidDispose(() => {
      window.removeEventListener('deneb:ext-menus-changed', onMenusChanged)
      for (const d of editorMenuActions.get(editor) || []) d.dispose()
      editorMenuActions.delete(editor)
    })
    editor.onDidChangeCursorPosition((e) => {
      setCursor({ lineNumber: e.position.lineNumber, column: e.position.column })
      window.dispatchEvent(new CustomEvent('deneb:cursor-pos'))
    })
    editor.onDidFocusEditorText(() => {
      focusWindow.__denebEditor = editor
      if (activePath) focusWindow.__denebFocusPath = activePath
      window.dispatchEvent(new CustomEvent('deneb:editor-active'))
      updateBreakpointDecorations()
    })
    editor.onMouseDown((e) => {
      if (e.target?.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && e.target.position) {
        handleGutterClick(e.target.position.lineNumber)
      }
    })
    editor.onDidChangeModel(() => updateBreakpointDecorations())
    updateBreakpointDecorations()
  }

  const handleChange = useCallback(
    (value?: string) => {
      if (activeTab && value !== undefined && pathRef.current === activeTab.path) {
        updateTabContent(activeTab.path, value)
        window.dispatchEvent(new CustomEvent('deneb:doc-change', { detail: { model: editorRef.current?.getModel() } }))
      }
    },
    [activeTab, updateTabContent],
  )

  useEffect(() => {
    pathRef.current = activePath
    const editor = editorRef.current
    if (editor) syncEditorContextMenu(editor, activePath)
  }, [activePath])

  // Sync external value changes (AI apply / revert / save all) without cursor jumps
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !activeTab) return
    const model = editor.getModel()
    if (model && model.getValue() !== activeTab.content) {
      editor.executeEdits('deneb-external', [{ range: model.getFullModelRange(), text: activeTab.content }])
    }
  }, [activeTab?.content, activeTab?.path])

  // Keep language in sync
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !activeTab) return
    const model = editor.getModel()
    if (model) monacoSetLanguage(model, activeTab.language)
  }, [activeTab?.language, activeTab?.path])

  // Reveal lines requested from search panel
  useEffect(() => {
    const onReveal = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string; line: number; col: number }>).detail
      if (!detail || detail.path !== activeTab?.path) return
      const editor = editorRef.current
      if (!editor) return
      requestAnimationFrame(() => {
        editor.revealLineInCenter(detail.line)
        editor.setPosition({ lineNumber: detail.line, column: detail.col || 1 })
        editor.focus()
      })
    }
    window.addEventListener('deneb:reveal-line', onReveal)
    return () => window.removeEventListener('deneb:reveal-line', onReveal)
  }, [activeTab?.path])

  return (
    <div className="editor-pane">
      <Editor
        path={activeTab?.path}
        language={activeTab?.language}
        value={activeTab?.content}
        theme={settings.theme}
        options={options}
        onMount={handleMount}
        onChange={handleChange}
        loading={
          <div className="editor-loading">
            <span className="spinner" />
            Cargando editor…
          </div>
        }
      />
    </div>
  )
}

function monacoSetLanguage(model: monacoEditor.ITextModel, language: string) {
  const m = model as unknown as { setLanguage: (lang: string) => void }
  try {
    m.setLanguage(language)
  } catch {
    // ignore
  }
}

function setupAIActions(editor: monacoEditor.IStandaloneCodeEditor, monaco: Monaco) {
  editor.addAction({
    id: 'deneb.ai.explain',
    label: 'Deneb AI: Explicar selección',
    contextMenuGroupId: 'z_commands',
    run: () => runAIFileCommand('explain'),
  })
  editor.addAction({
    id: 'deneb.ai.refactor',
    label: 'Deneb AI: Refactorizar selección',
    contextMenuGroupId: 'z_commands',
    run: () => runAIFileCommand('refactor'),
  })
  editor.addAction({
    id: 'deneb.ai.bugs',
    label: 'Deneb AI: Buscar errores',
    contextMenuGroupId: 'z_commands',
    run: () => runAIFileCommand('bugs'),
  })
  editor.addAction({
    id: 'deneb.ai.comments',
    label: 'Deneb AI: Añadir comentarios',
    contextMenuGroupId: 'z_commands',
    run: () => runAIFileCommand('comments'),
  })
  editor.addAction({
    id: 'deneb.ai.tests',
    label: 'Deneb AI: Generar tests',
    contextMenuGroupId: 'z_commands',
    run: () => runAIFileCommand('tests'),
  })
  editor.addAction({
    id: 'deneb.ai.docs',
    label: 'Deneb AI: Documentar código',
    contextMenuGroupId: 'z_commands',
    run: () => runAIFileCommand('docs'),
  })
}

type AICmd = 'explain' | 'refactor' | 'bugs' | 'comments' | 'tests' | 'docs'

function runAIFileCommand(cmd: AICmd) {
  const store = useEditorStore.getState()
  const tab = store.openTabs.find((t) => t.path === store.activePath)
  if (!tab) return
  const ai = useAIChatStore.getState()
  const fileMsg = `${tab.path}:\n\`\`\`${tab.language}\n${tab.content.slice(0, 24000)}\n\`\`\``
  const prompts: Record<AICmd, string> = {
    explain: 'Explica el siguiente código en detalle, sección por sección:',
    refactor: 'Refactoriza el siguiente código para hacerlo más limpio y eficiente. Muestra solo el código resultante:',
    bugs: 'Analiza el siguiente código, encuentra errores y problemas y sugiere correcciones:',
    comments: 'Añade comentarios claros al siguiente código. Muestra el código completo comentado:',
    tests: 'Genera tests unitarios para el siguiente código. Muestra solo los tests:',
    docs: 'Escribe documentación (docstring/JSDoc/README) para el siguiente código:',
  }
  store.setSidebarView('ai')
  store.setSidebarVisible(true)
  void ai.send(`${prompts[cmd]}\n\n${fileMsg}`)
}

let inlineCompletionsRegistered = false

function setupInlineCompletions(monaco: Monaco) {
  if (inlineCompletionsRegistered) return
  const reg = monaco.languages.registerInlineCompletionsProvider
  if (!reg) return
  inlineCompletionsRegistered = true
  const provider: monacoLanguages.InlineCompletionsProvider = {
    provideInlineCompletions: async (model, position, _context, token) => {
      const store = useEditorStore.getState()
      const focusPath = focusWindow.__denebFocusPath || store.activePath
      const tab = store.openTabs.find((t) => t.path === focusPath)
      if (!tab) return null
      const { ai } = store.settings
      if (!ai.apiKey) return null

      const line = position.lineNumber
      const col = position.column
      const codeBefore = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: line,
        endColumn: col,
      })
      const codeAfter = model.getValueInRange({
        startLineNumber: line,
        startColumn: col,
        endLineNumber: model.getLineCount(),
        endColumn: model.getLineMaxColumn(model.getLineCount()),
      })

      if (codeBefore.trim().length < 6) return null

      // Light debounce: avoid hitting the API on every keystroke
      await new Promise((r) => setTimeout(r, 320))
      if (token.isCancellationRequested) return null

      try {
        const controller = new AbortController()
        token.onCancellationRequested(() => controller.abort())
        const suggestion = await requestInlineSuggestion(
          {
            baseUrl: ai.baseUrl,
            apiKey: ai.apiKey,
            model: ai.model,
            temperature: 0.2,
            maxTokens: 60,
            provider: ai.provider,
          },
          tab.language,
          codeBefore.slice(-6000),
          codeAfter.slice(0, 2000),
          controller.signal,
        )
        if (!suggestion || token.isCancellationRequested) {
          return null
        }
        const fullText = model.getValue()
        if (fullText !== codeBefore + codeAfter) {
          return null
        }
        return {
          items: [
            {
              insertText: suggestion,
              range: { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col },
            },
          ],
        }
      } catch {
        return null
      }
    },
    freeInlineCompletions: () => {},
  }
  reg([{ scheme: 'inmemory' }, { scheme: 'untitled' }], provider)
}

interface InlineReq {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

async function requestInlineSuggestion(cfg: InlineReq, language: string, before: string, after: string, signal: AbortSignal): Promise<string | null> {
  const base = cfg.baseUrl.trim().replace(/\/+$/, '')
  const system = 'You are an AI code completion engine embedded in an editor. Continue the code at the cursor with only the continuation text. No explanation, no fences. Match style and language.'
  const userPrompt = `Language: ${language}\nCode before cursor:\n\`\`\`\n${before}\n\`\`\`\nCode after cursor (already exists):\n\`\`\`\n${after}\n\`\`\`\nSuggest the text that should be inserted at the cursor:`

  const url = `${base}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
    }),
  })
  if (!res.ok) return null
  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content as string | undefined
  if (!text) return null
  return text.replace(/```[a-zA-Z]*\n?/g, '').trimStart()
}

// Attach event so command palette "Aplicar última sugerencia" works
window.addEventListener('deneb:ai-apply-last', () => applyLastAIAnswerToFile())

export function applyLastAIAnswerToFile() {
  const store = useEditorStore.getState()
  const ai = useAIChatStore.getState()
  const last = [...ai.messages].reverse().find((m): m is ChatMessage & { role: 'assistant' } => m.role === 'assistant' && !!m.content)
  if (!last) return
  const tab = store.openTabs.find((t) => t.path === store.activePath)
  if (!tab) return
  const fenced = last.content.match(/```[a-zA-Z]*\n([\s\S]*?)```/)
  if (fenced) {
    store.applyAIBuffer(tab.path, fenced[1])
    store.setStatus('Sugerencia de IA aplicada al archivo', 2500)
    return
  }
  store.applyAIBuffer(tab.path, last.content)
  store.setStatus('Sugerencia de IA aplicada al archivo', 2500)
}
