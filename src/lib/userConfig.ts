import { useEditorStore } from '../store/editorStore'
import { readFileAt, writeFileAt, resolvePath, currentBackend, type AnyHandle } from './fileSystem'
import { registerDynamicShortcut, unregisterDynamicShortcut } from './shortcutRegistry'
import { commandById } from '../commands'

export interface UserKeybinding {
  key: string
  command: string
  when?: string
}

export interface UserConfigFile {
  settings: Record<string, unknown>
  keybindings: UserKeybinding[]
}

let lastSettings: Record<string, unknown> = {}
let lastKeybindings: UserKeybinding[] = []

// Paths dentro del workspace (.nova/ para no tocar el código del usuario)
const CONFIG_DIR = '.nova'
const SETTINGS_PATH = `${CONFIG_DIR}/settings.json`
const KEYBINDINGS_PATH = `${CONFIG_DIR}/keybindings.json`

export function getUserConfigPath(): { settings: string; keybindings: string } {
  return { settings: SETTINGS_PATH, keybindings: KEYBINDINGS_PATH }
}

async function rootHandle(): Promise<AnyHandle | null> {
  return (useEditorStore.getState().root?.handle as AnyHandle | null) ?? null
}

// ---------------------------------------------------------------------------
// Lectura / escritura
// ---------------------------------------------------------------------------

export async function readConfigFile(): Promise<UserConfigFile> {
  const root = await rootHandle()
  if (!root) return { settings: lastSettings, keybindings: lastKeybindings }
  const out: UserConfigFile = { settings: {}, keybindings: [] }
  try {
    const raw = await readFileAt(root, SETTINGS_PATH)
    if (raw) out.settings = JSON.parse(raw)
  } catch {
    // no config file
  }
  try {
    const raw = await readFileAt(root, KEYBINDINGS_PATH)
    if (raw) {
      const parsed = JSON.parse(raw)
      out.keybindings = Array.isArray(parsed) ? parsed : parsed.keybindings || []
    }
  } catch {
    // no config file
  }
  lastSettings = out.settings
  lastKeybindings = out.keybindings
  return out
}

export async function writeSettingsFile(patch: Record<string, unknown>): Promise<boolean> {
  const root = await rootHandle()
  if (!root) return false
  const next = { ...lastSettings, ...patch }
  lastSettings = next
  return writeJson(root, SETTINGS_PATH, next)
}

export async function writeKeybindingsFile(kbs: UserKeybinding[]): Promise<boolean> {
  const root = await rootHandle()
  if (!root) return false
  lastKeybindings = kbs
  return writeJson(root, KEYBINDINGS_PATH, kbs)
}

async function writeJson(root: AnyHandle, path: string, data: unknown): Promise<boolean> {
  try {
    const dir = await resolvePath(root, CONFIG_DIR)
    if (!dir) {
      const { createDirAt, createFileAt } = await import('./fileSystem')
      const ok = await createDirAt(root, CONFIG_DIR)
      if (!ok) return false
    }
    return await writeFileAt(root, path, JSON.stringify(data, null, 2) + '\n')
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Aplicación al store (los ajustes del archivo tienen prioridad)
// ---------------------------------------------------------------------------

const SETTING_KEYS: (keyof import('../types').EditorSettings)[] = [
  'fontSize', 'tabSize', 'lineHeight', 'wordWrap', 'minimap', 'lineNumbers',
  'formatOnSave', 'formatOnPaste', 'vimMode', 'autoSave', 'confirmBeforeClose',
  'cursorBlinking', 'cursorStyle', 'fontLigatures', 'renderWhitespace',
  'smoothScrolling', 'stickyScroll', 'bracketPairColorization', 'indentGuides',
  'scrollBeyondLastLine', 'autoClosingBrackets', 'mouseWheelZoom',
  'wordBasedSuggestions', 'parameterHints', 'folding', 'theme',
]

export function applyUserSettings(file: UserConfigFile | null) {
  const settings = file?.settings || lastSettings
  const store = useEditorStore.getState()
  const patch: Partial<import('../types').EditorSettings> = {}
  for (const key of SETTING_KEYS) {
    if (key === 'theme' && typeof settings[key] === 'string') {
      patch.theme = settings[key] as never
      continue
    }
    if (key in settings) {
      ;(patch as Record<string, unknown>)[key] = settings[key]
    }
  }
  if (Object.keys(patch).length) store.updateSettings(patch as never)

  // Configuración de extensiones (config contribuida) → se guarda en settings del store
  const extConfig: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(settings)) {
    if (k.includes('.')) extConfig[k] = v
  }
  if (Object.keys(extConfig).length) {
    store.updateSettings(extConfig as never)
  }
}

// ---------------------------------------------------------------------------
// Keybindings de usuario: se registran como atajos dinámicos
// ---------------------------------------------------------------------------

export function applyUserKeybindings(file: UserConfigFile | null) {
  const kbs = file?.keybindings || lastKeybindings

  // Limpia atajos de usuario previos (prefijo user-kb:)
  for (const id of userKbIds) unregisterDynamicShortcut(id)
  userKbIds = []

  for (const kb of kbs) {
    if (!kb.command) continue
    const parsed = parseKeybinding(kb.key)
    if (!parsed) continue
    const id = `user-kb:${kb.command}:${kb.key}`
    userKbIds.push(id)
    registerDynamicShortcut({
      id,
      ...parsed,
      run: () => {
        const def = commandById(kb.command)
        if (def) def.run()
        else window.dispatchEvent(new CustomEvent('nova:run-command', { detail: kb.command }))
      },
    })
  }
}

let userKbIds: string[] = []

function parseKeybinding(key: string): { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean } | null {
  if (!key) return null
  const parts = key.split('+').map((p) => p.trim())
  const result: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean } = { key: '' }
  for (const p of parts) {
    const lower = p.toLowerCase()
    if (lower === 'ctrl' || lower === 'cmd' || lower === 'meta') result.ctrl = true
    else if (lower === 'shift') result.shift = true
    else if (lower === 'alt') result.alt = true
    else result.key = p
  }
  if (!result.key) return null
  return result
}

// ---------------------------------------------------------------------------
// Snippets de usuario desde .nova/snippets.json
// ---------------------------------------------------------------------------

export async function loadUserSnippets(): Promise<void> {
  const root = await rootHandle()
  if (!root) return
  try {
    const raw = await readFileAt(root, `${CONFIG_DIR}/snippets.json`)
    if (!raw) return
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed).map(([prefix, body]) => ({ prefix, body }))
    const { setUserSnippets } = await import('./editorEnhancements')
    setUserSnippets(list)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Modelo JSON de edición para los archivos de configuración
// ---------------------------------------------------------------------------

export function openConfigInEditor(kind: 'settings' | 'keybindings') {
  const path = kind === 'settings' ? SETTINGS_PATH : KEYBINDINGS_PATH
  const store = useEditorStore.getState()
  void store.openFileByPath(store.root?.path ? `${store.root.path}/${path}` : path)
}

export function configSchemeId(): string {
  return 'nova-config'
}

// Reexport para compatibilidad con SettingsPanel
export function getConfigPath(): { settings: string; keybindings: string } {
  return getUserConfigPath()
}

export function isNativeBackend(): boolean {
  return currentBackend() === 'native' || currentBackend() === 'desktop'
}
