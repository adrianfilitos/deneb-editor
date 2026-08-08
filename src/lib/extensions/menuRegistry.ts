export type MenuLocation =
  | 'commandPalette'
  | 'editor/title'
  | 'editor/context'
  | 'editor/title/context'
  | 'explorer/context'
  | 'explorer/title'
  | 'view/title'
  | 'view/item/context'

export interface ContributedMenuEntry {
  extId: string
  command: string
  label: string
  group?: string
  when?: string
  alt?: string
}

export interface WhenContext {
  resourceLangId?: string
  resourceExtname?: string
  resourceFilename?: string
  explorerResourceIsFolder?: boolean
  editorLangId?: string
  resourceScheme?: string
}

const registry = new Map<MenuLocation, ContributedMenuEntry[]>()

// ---------------------------------------------------------------------------
// Evaluador de cláusulas "when" de VS Code (subconjunto práctico)
// ---------------------------------------------------------------------------

function tokenizeWhen(src: string): string[] {
  const spaced = src.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ')
  return spaced.match(/&&|\|\||!=|==|\(|\)|!|\S+/g) || []
}

export function evaluateWhen(when: string | undefined, ctx: WhenContext): boolean {
  if (!when) return true
  const toks = tokenizeWhen(when)
  let i = 0
  const peek = () => toks[i]
  const eat = () => toks[i++]
  const lookup = (key: string): unknown => {
    const k = key.replace(/^context\./, '')
    return (ctx as unknown as Record<string, unknown>)[k]
  }
  const strip = (s: string) => (s.length >= 2 && ((s[0] === "'" && s[s.length - 1] === "'") || (s[0] === '"' && s[s.length - 1] === '"')) ? s.slice(1, -1) : s)
  const parseOr = (): boolean => {
    let v = parseAnd()
    while (peek() === '||') {
      eat()
      v = v || parseAnd()
    }
    return v
  }
  const parseAnd = (): boolean => {
    let v = parseFactor()
    while (peek() === '&&') {
      eat()
      v = v && parseFactor()
    }
    return v
  }
  const parseFactor = (): boolean => {
    if (peek() === '!') {
      eat()
      return !parseFactor()
    }
    if (peek() === '(') {
      eat()
      const v = parseOr()
      eat() // ')'
      return v
    }
    const a = eat()
    const op = peek()
    if (op === '==' || op === '!=') {
      eat()
      const b = strip(eat())
      const res = String(lookup(a) ?? '') === String(b)
      return op === '==' ? res : !res
    }
    return !!lookup(a)
  }
  try {
    return parseOr()
  } catch {
    return true
  }
}

export function registerContributedMenu(
  extId: string,
  location: MenuLocation,
  items: { command: string; group?: string; when?: string; alt?: string }[],
  titles: Map<string, string>,
) {
  const list = registry.get(location) || []
  for (const it of items) {
    list.push({
      extId,
      command: it.command,
      label: titles.get(it.command) || it.command,
      group: it.group,
      when: it.when,
      alt: it.alt,
    })
  }
  registry.set(location, list)
}

export function unregisterContributedMenu(extId: string, location: MenuLocation) {
  const list = (registry.get(location) || []).filter((e) => e.extId !== extId)
  registry.set(location, list)
}

/** Elementos de un menú, ordenados por grupo (VS Code ordena por group + order). */
export function getContributedMenu(location: MenuLocation, ctx?: WhenContext): ContributedMenuEntry[] {
  const list = registry.get(location) || []
  return [...list]
    .filter((e) => evaluateWhen(e.when, ctx || {}))
    .sort((a, b) => {
      const ga = (a.group || 'z_commands').replace(/^\d+_/, '')
      const gb = (b.group || 'z_commands').replace(/^\d+_/, '')
      if (ga !== gb) return ga < gb ? -1 : 1
      return 0
    })
}

export function hasContributedMenu(location: MenuLocation): boolean {
  return (registry.get(location)?.length || 0) > 0
}

export function allContributedMenus(): MenuLocation[] {
  return [...registry.keys()]
}

/** Notifica a la UI (menús del editor/explorador) que debe re-renderizarse. */
export function notifyMenusChanged() {
  window.dispatchEvent(new CustomEvent('deneb:ext-menus-changed'))
}
