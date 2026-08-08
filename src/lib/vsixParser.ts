import { unzipSync, strFromU8 } from 'fflate'
import type { ExtSnippetDef, ExtThemeDef } from './extensionTypes'
import { getVsix } from './extensions/blobStore'

export interface VsixParseResult {
  id: string
  publisher: string
  name: string
  displayName: string
  version: string
  description?: string
  engines?: { vscode?: string }
  /** package.json completo (para contributes, configuration, etc.) */
  pkg: Record<string, unknown>
  main: string | null
  /** Árbol de archivos de la extensión (claves sin el prefijo extension/) */
  files: Record<string, Uint8Array>
  themes: ExtThemeDef[]
  snippets: ExtSnippetDef[]
  code?: string
}

interface VsCodeSnippet {
  prefix?: string | string[]
  body: string | string[]
  description?: string
}

interface VsCodeThemeToken {
  scope?: string | string[]
  settings?: { foreground?: string; fontStyle?: string }
}

const cache = new Map<string, VsixParseResult>()

function ruleColor(rules: ExtThemeDef['rules'], names: string[]): string | null {
  for (const r of rules) {
    if (!r.foreground) continue
    const tokens = r.token.split(/[.,\s]+/).filter(Boolean)
    if (names.some((n) => tokens.includes(n))) return r.foreground
  }
  return null
}

/** Convierte un tema VS Code a una definición de tema Deneb usable por Monaco. */
export function themeToExtTheme(id: string, label: string, themeJson: { type?: string; colors?: Record<string, string>; tokenColors?: VsCodeThemeToken[] }): ExtThemeDef {
  const dark = (themeJson.type || 'dark') !== 'light'
  const base: 'vs-dark' | 'vs' = dark ? 'vs-dark' : 'vs'
  const rules: ExtThemeDef['rules'] = (themeJson.tokenColors || [])
    .map((tc) => {
      const scope = Array.isArray(tc.scope) ? tc.scope.join(', ') : String(tc.scope || '')
      return {
        token: scope,
        foreground: tc.settings?.foreground,
        fontStyle: tc.settings?.fontStyle,
      }
    })
    .filter((r) => r.token && (r.foreground || r.fontStyle))

  const colors: Record<string, string> = { ...(themeJson.colors || {}) }
  if (!colors['editor.background']) colors['editor.background'] = dark ? '#0f111a' : '#fafbfe'
  if (!colors['editor.foreground']) colors['editor.foreground'] = dark ? '#d5d9e6' : '#263238'
  if (!colors['editorCursor.foreground']) {
    colors['editorCursor.foreground'] = ruleColor(rules, ['keyword', 'storage']) || (dark ? '#82aaff' : '#2962ff')
  }
  colors['deneb.string'] = ruleColor(rules, ['string']) || (dark ? '#a5e075' : '#689f38')
  colors['deneb.number'] = ruleColor(rules, ['number']) || (dark ? '#f78c6c' : '#e65100')
  colors['deneb.keyword'] = ruleColor(rules, ['keyword', 'storage']) || (dark ? '#c792ea' : '#b072d1')
  colors['deneb.delimiter'] = ruleColor(rules, ['delimiter', 'operator']) || (dark ? '#89ddff' : '#00838f')
  colors['deneb.type'] = ruleColor(rules, ['type', 'support.type']) || (dark ? '#82aaff' : '#2962ff')

  return { id, label, base, colors, rules }
}

function stripLeadingSlash(p: string): string {
  return p.replace(/^\.?\//, '')
}

/** Extrae TODO el contenido de un .vsix (formato VS Code) con su package.json y árbol de archivos. */
export function parseVsix(bytes: Uint8Array, id?: string): VsixParseResult {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes) as Record<string, Uint8Array>
  } catch (e) {
    throw new Error(`No se pudo descomprimir el .vsix: ${(e as Error).message}`)
  }
  const readText = (p: string): string | null => {
    const b = files[p]
    if (!b) return null
    try {
      return strFromU8(b)
    } catch {
      return null
    }
  }

  const pkgRaw = readText('extension/package.json')
  if (!pkgRaw) throw new Error('No se encontró extension/package.json en el .vsix')
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(pkgRaw) as Record<string, unknown>
  } catch {
    throw new Error('El package.json del .vsix no es JSON válido')
  }

  const contributes = (pkg.contributes || {}) as {
    themes?: { label?: string; id?: string; path?: string }[]
    snippets?: { language?: string; path?: string }[]
  }
  const publisher = String(pkg.publisher || 'unknown')
  const name = String(pkg.name || 'unknown')

  // --- árbol de archivos (sin el prefijo extension/) ---
  const tree: Record<string, Uint8Array> = {}
  for (const [path, data] of Object.entries(files)) {
    if (path === 'extension/package.json') continue
    if (path.startsWith('extension/')) tree[path.slice('extension/'.length)] = data
    else tree[path] = data
  }

  const themes: ExtThemeDef[] = []
  for (const t of contributes.themes || []) {
    if (!t.path) continue
    const raw = readText(`extension/${stripLeadingSlash(t.path)}`)
    if (!raw) continue
    try {
      const themeJson = JSON.parse(raw)
      themes.push(
        themeToExtTheme(
          `ext-theme-${publisher}-${name}-${t.id || t.label || themes.length}`,
          t.label || t.id || 'Tema',
          themeJson,
        ),
      )
    } catch {
      // tema malformado: ignorar
    }
  }

  const snippets: ExtSnippetDef[] = []
  for (const s of contributes.snippets || []) {
    if (!s.path || !s.language) continue
    const raw = readText(`extension/${stripLeadingSlash(s.path)}`)
    if (!raw) continue
    try {
      const snip = JSON.parse(raw) as Record<string, VsCodeSnippet>
      const items = Object.entries(snip)
        .filter(([, d]) => d && d.body)
        .map(([sname, d]) => ({
          label: Array.isArray(d.prefix) ? d.prefix[0] : d.prefix || sname,
          detail: d.description || sname,
          description: d.description,
          insertText: Array.isArray(d.body) ? d.body.join('\n') : String(d.body),
        }))
      if (items.length) snippets.push({ language: s.language, items })
    } catch {
      // snippets malformados: ignorar
    }
  }

  const mainEntry = typeof pkg.main === 'string' ? pkg.main : null
  let code: string | undefined
  if (mainEntry) {
    const raw = readText(`extension/${stripLeadingSlash(mainEntry)}`)
    if (raw && raw.length <= 3_000_000) code = raw
  }

  const result: VsixParseResult = {
    id: `${publisher}.${name}`,
    publisher,
    name,
    displayName: String(pkg.displayName || pkg.name || `${publisher}.${name}`),
    version: String(pkg.version || '1.0.0'),
    description: pkg.description ? String(pkg.description) : undefined,
    engines: pkg.engines as { vscode?: string } | undefined,
    pkg,
    main: mainEntry,
    files: tree,
    themes,
    snippets,
    code,
  }
  if (id) cache.set(id, result)
  return result
}

/** Resultado parseado ya en memoria (si la extensión se está ejecutando). */
export function getParsedVsix(id: string): VsixParseResult | undefined {
  return cache.get(id)
}

export function cacheParsedVsix(id: string, parsed: VsixParseResult): void {
  cache.set(id, parsed)
}

export function dropParsedVsix(id: string): void {
  cache.delete(id)
}

/** Carga el .vsix desde IndexedDB y lo parsea (para restaurar extensiones al iniciar). */
export async function loadParsedVsixFromStore(id: string): Promise<VsixParseResult | null> {
  const cached = cache.get(id)
  if (cached) return cached
  const bytes = await getVsix(id)
  if (!bytes) return null
  try {
    return parseVsix(bytes, id)
  } catch {
    return null
  }
}
