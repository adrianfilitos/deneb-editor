export type ExtType = 'native' | 'vsix'

export interface ExtThemeDef {
  id: string
  label: string
  base: 'vs-dark' | 'vs'
  colors: Record<string, string>
  rules: { token: string; foreground?: string; fontStyle?: string }[]
}

export interface ExtSnippetItem {
  label: string
  detail?: string
  description?: string
  insertText: string
}

export interface ExtSnippetDef {
  language: string
  items: ExtSnippetItem[]
}

export interface ExtCommandDef {
  id: string
  title: string
  category?: string
  run: () => void
}

export interface ExtShortcutDef {
  id: string
  key: string
  shift?: boolean
  commandId: string
  run: () => void
}

export interface ExtSetTheme {
  id: string
  themeId: string
  label?: string
}

/** Contribución serializable (se guarda en localStorage) */
export interface ExtContribData {
  settings?: Record<string, unknown>
  themes?: ExtThemeDef[]
  snippets?: ExtSnippetDef[]
  setTheme?: ExtSetTheme
}

export interface InstalledExt {
  id: string
  type: ExtType
  name: string
  version: string
  description?: string
  icon?: string
  enabled: boolean
  contrib: ExtContribData
  /** Código JS de la extensión (main del .vsix) para el Extension Host */
  code?: string
}
