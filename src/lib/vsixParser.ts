import { unzipSync, strFromU8 } from 'fflate'
import type { ExtSnippetDef, ExtThemeDef } from './extensionTypes'

export interface VsixParseResult {
  id: string
  displayName: string
  version: string
  description?: string
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

function ruleColor(rules: ExtThemeDef['rules'], names: string[]): string | null {
  for (const r of rules) {
    if (!r.foreground) continue
    const tokens = r.token.split(/[.,\s]+/).filter(Boolean)
    if (names.some((n) => tokens.includes(n))) return r.foreground
  }
  return null
}

/** Convierte un tema VS Code a una definición de tema Nova usable por Monaco. */
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

  // Deriva una paleta CSS básica a partir de los colores del tema
  const colors: Record<string, string> = { ...(themeJson.colors || {}) }
  if (!colors['editor.background']) {
    colors['editor.background'] = dark ? '#0f111a' : '#fafbfe'
  }
  if (!colors['editor.foreground']) {
    colors['editor.foreground'] = dark ? '#d5d9e6' : '#263238'
  }
  if (!colors['editorCursor.foreground']) {
    colors['editorCursor.foreground'] =
      ruleColor(rules, ['keyword', 'storage']) || (dark ? '#82aaff' : '#2962ff')
  }
  const stringColor = ruleColor(rules, ['string']) || (dark ? '#a5e075' : '#689f38')
  const numberColor = ruleColor(rules, ['number']) || (dark ? '#f78c6c' : '#e65100')
  const keywordColor = ruleColor(rules, ['keyword', 'storage']) || (dark ? '#c792ea' : '#b072d1')
  const delimiterColor = ruleColor(rules, ['delimiter', 'operator']) || (dark ? '#89ddff' : '#00838f')
  const typeColor = ruleColor(rules, ['type', 'support.type']) || (dark ? '#82aaff' : '#2962ff')

  colors['nova.string'] = stringColor
  colors['nova.number'] = numberColor
  colors['nova.keyword'] = keywordColor
  colors['nova.delimiter'] = delimiterColor
  colors['nova.type'] = typeColor

  return { id, label, base, colors, rules }
}

function stripLeadingSlash(p: string): string {
  return p.replace(/^\.?\//, '')
}

/** Extrae temas y snippets de un .vsix (formato VS Code). */
export function parseVsix(bytes: Uint8Array): VsixParseResult {
  const files = unzipSync(bytes)
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
  let pkg: {
    publisher?: string
    name?: string
    displayName?: string
    version?: string
    description?: string
    main?: string
    contributes?: {
      themes?: { label?: string; id?: string; path?: string }[]
      snippets?: { language?: string; path?: string }[]
    }
  }
  try {
    pkg = JSON.parse(pkgRaw)
  } catch {
    throw new Error('El package.json del .vsix no es JSON válido')
  }
  const publisher = pkg.publisher || 'unknown'
  const name = pkg.name || 'unknown'

  const themes: ExtThemeDef[] = []
  for (const t of pkg.contributes?.themes || []) {
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
  for (const s of pkg.contributes?.snippets || []) {
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

  // Código JS de la extensión (main) para el Extension Host
  let code: string | undefined
  const mainEntry = pkg.main
  if (typeof mainEntry === 'string' && mainEntry) {
    const raw = readText(`extension/${stripLeadingSlash(mainEntry)}`)
    if (raw && raw.length <= 500_000) code = raw
  }

  return {
    id: `${publisher}.${name}`,
    displayName: pkg.displayName || `${publisher}.${name}`,
    version: pkg.version || '1.0.0',
    description: pkg.description,
    themes,
    snippets,
    code,
  }
}
