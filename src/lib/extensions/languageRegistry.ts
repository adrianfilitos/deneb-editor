import * as monaco from 'monaco-editor'

// Mapa de extensiones de archivo (minúsculas) -> languageId, y nombres -> languageId
const extMap = new Map<string, string>()
const nameMap = new Map<string, string>()
const owned = new Map<string, Set<string>>() // extId -> langIds contribuidos

export function registerLanguageContrib(
  extId: string,
  langId: string,
  extensions?: string[],
  filenames?: string[],
) {
  let set = owned.get(extId)
  if (!set) {
    set = new Set()
    owned.set(extId, set)
  }
  set.add(langId)
  for (const e of extensions || []) extMap.set(e.toLowerCase(), langId)
  for (const n of filenames || []) nameMap.set(n.toLowerCase(), langId)
  registerMonacoLanguage(langId)
}

export function unregisterLanguageContrib(extId: string, langId: string) {
  const set = owned.get(extId)
  if (!set) return
  set.delete(langId)
  if (set.size === 0) owned.delete(extId)
  for (const [k, v] of [...extMap]) if (v === langId) extMap.delete(k)
  for (const [k, v] of [...nameMap]) if (v === langId) nameMap.delete(k)
}

/** Consulta un languageId contribuido por extensiones para una ruta. */
export function lookupContributedLanguage(path: string): string | undefined {
  const name = path.split(/[\\/]/).pop() || path
  const byName = nameMap.get(name.toLowerCase())
  if (byName) return byName
  const i = name.lastIndexOf('.')
  if (i >= 0) return extMap.get(name.slice(i).toLowerCase())
  return undefined
}

/** Asegura que el languageId existe en Monaco (para resaltado por lenguaje contribuido). */
export function registerMonacoLanguage(langId: string) {
  try {
    const exists = monaco.languages.getLanguages().some((l) => l.id === langId)
    if (!exists) {
      monaco.languages.register({ id: langId })
    }
  } catch {
    // ignore
  }
}
