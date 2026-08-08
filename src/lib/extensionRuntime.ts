import * as monaco from 'monaco-editor'
import type { EditorSettings } from '../types'
import { useEditorStore } from '../store/editorStore'
import { registerDynamicCommand, unregisterDynamicCommand } from './commandRegistry'
import { registerDynamicShortcut, unregisterDynamicShortcut } from './shortcutRegistry'
import { NATIVE_MAP } from './nativeExtensions'
import { runExtension, stopExtension } from './extHost/host'
import { lighten, darken, mix, rgba } from './colorUtils'
import type { ExtThemeDef, InstalledExt } from './extensionTypes'

interface AppliedRec {
  disposables: monaco.IDisposable[]
  styleEls: HTMLStyleElement[]
  prevSettings: Partial<EditorSettings>
  prevTheme: string | null
  commandIds: string[]
  shortcutIds: string[]
}

const applied = new Map<string, AppliedRec>()
const definedThemes = new Set<string>()

function ensureTheme(t: ExtThemeDef) {
  if (definedThemes.has(t.id)) return
  try {
    monaco.editor.defineTheme(t.id, {
      base: t.base,
      inherit: true,
      rules: t.rules,
      colors: t.colors,
    })
    definedThemes.add(t.id)
  } catch {
    // tema ya definido
  }
}

/** Genera las variables CSS para que todo el shell de la app cambie con el tema. */
function buildThemeStyle(t: ExtThemeDef): HTMLStyleElement | null {
  const c = t.colors
  const dark = t.base === 'vs-dark'
  const bg = c['editor.background'] || (dark ? '#0f111a' : '#fafbfe')
  const fg = c['editor.foreground'] || (dark ? '#d5d9e6' : '#263238')
  const accent = c['editorCursor.foreground'] || (dark ? '#82aaff' : '#2962ff')
  const red = c['editorError.foreground'] || (dark ? '#f7768e' : '#d32f2f')
  const cyan = c['editorInfo.foreground'] || (dark ? '#7dcfff' : '#00838f')
  const green = c['nova.string'] || (dark ? '#a5e075' : '#689f38')
  const number = c['nova.number'] || (dark ? '#f78c6c' : '#e65100')
  const purple = c['nova.keyword'] || accent
  const delim = c['nova.delimiter'] || cyan

  const bgRaised = lighten(bg, 0.035)
  const bgHover = lighten(bg, 0.05)
  const bgActive = lighten(bg, 0.09)
  const bgInset = darken(bg, 0.04)
  const border = lighten(bg, 0.13)
  const borderSoft = lighten(bg, 0.07)
  const fgMuted = mix(bg, fg, 0.55)
  const fgFaint = mix(bg, fg, 0.32)
  const accentStrong = darken(accent, 0.12)

  const css = `:root[data-theme='${t.id}']{
  --bg-base: ${bg};
  --bg-raised: ${bgRaised};
  --bg-panel: ${bg};
  --bg-active: ${bgActive};
  --bg-hover: ${bgHover};
  --bg-inset: ${bgInset};
  --bg-activity: ${bgInset};
  --border: ${border};
  --border-soft: ${borderSoft};
  --fg: ${fg};
  --fg-muted: ${fgMuted};
  --fg-faint: ${fgFaint};
  --accent: ${accent};
  --accent-soft: ${rgba(accent, 0.12)};
  --accent-strong: ${accentStrong};
  --purple: ${purple};
  --cyan: ${cyan};
  --green: ${green};
  --teal: ${delim};
  --orange: ${number};
  --red: ${red};
  --scrollbar: ${rgba(accent, 0.4)};
  --scrollbar-hover: ${rgba(accent, 0.5)};
  --shadow: 0 12px 40px rgba(0,0,0,${dark ? 0.5 : 0.14});
  --shadow-sm: 0 4px 16px rgba(0,0,0,${dark ? 0.35 : 0.1});
  --overlay: rgba(0,0,0,${dark ? 0.6 : 0.22});
  --toast-bg: ${bgRaised};
}`

  const el = document.createElement('style')
  el.setAttribute('data-nova-ext-theme', t.id)
  el.textContent = css
  return el
}

export function applyExtension(ext: InstalledExt) {
  if (applied.has(ext.id)) return
  const rec: AppliedRec = { disposables: [], styleEls: [], prevSettings: {}, prevTheme: null, commandIds: [], shortcutIds: [] }
  const contrib = ext.contrib

  // Ajustes del editor
  if (contrib.settings) {
    const s = useEditorStore.getState().settings
    const patch: Record<string, unknown> = {}
    const cur = s as unknown as Record<string, unknown>
    for (const [k, v] of Object.entries(contrib.settings)) {
      if (k in s) {
        patch[k] = v
        ;(rec.prevSettings as Record<string, unknown>)[k] = cur[k]
      }
    }
    if (Object.keys(patch).length) useEditorStore.getState().updateSettings(patch as Partial<EditorSettings>)
  }

  // Temas (define Monaco + variables CSS del shell)
  for (const t of contrib.themes || []) {
    ensureTheme(t)
    const style = buildThemeStyle(t)
    if (style) {
      document.head.appendChild(style)
      rec.styleEls.push(style)
    }
  }

  // Cambiar al tema de la extensión
  if (contrib.setTheme) {
    rec.prevTheme = useEditorStore.getState().settings.theme
    useEditorStore.getState().updateSettings({ theme: contrib.setTheme.themeId as EditorSettings['theme'] })
  }

  // Snippets
  for (const sn of contrib.snippets || []) {
    try {
      const disp = monaco.languages.registerCompletionItemProvider(sn.language, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn,
          }
          return {
            suggestions: sn.items.map((it) => ({
              label: it.label,
              detail: it.detail,
              documentation: it.description,
              insertText: it.insertText,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            })),
          }
        },
      })
      rec.disposables.push(disp)
    } catch {
      // lenguaje no disponible
    }
  }

  // Comandos y atajos (solo nativas, reconstruidos del catálogo)
  const native = NATIVE_MAP[ext.id]
  for (const cmd of native?.commands || []) {
    registerDynamicCommand(cmd)
    rec.commandIds.push(cmd.id)
  }
  for (const sc of native?.shortcuts || []) {
    registerDynamicShortcut(sc)
    rec.shortcutIds.push(sc.id)
  }

  // Extension Host: ejecuta el código JS de la extensión
  if (ext.code) {
    runExtension(ext)
  }

  applied.set(ext.id, rec)
}

export function undoExtension(ext: InstalledExt) {
  const rec = applied.get(ext.id)
  if (!rec) return
  for (const d of rec.disposables) {
    try {
      d.dispose()
    } catch {
      // ignore
    }
  }
  for (const el of rec.styleEls) el.remove()
  if (rec.prevTheme !== null) {
    useEditorStore.getState().updateSettings({ theme: rec.prevTheme as EditorSettings['theme'] })
  }
  const prev = rec.prevSettings as Record<string, unknown>
  for (const k of Object.keys(prev)) {
    useEditorStore.getState().updateSettings({ [k]: prev[k] } as Partial<EditorSettings>)
  }
  for (const id of rec.commandIds) unregisterDynamicCommand(id)
  for (const id of rec.shortcutIds) unregisterDynamicShortcut(id)
  if (ext.code) stopExtension(ext.id)
  applied.delete(ext.id)
}
