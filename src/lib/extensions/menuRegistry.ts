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

const registry = new Map<MenuLocation, ContributedMenuEntry[]>()

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
export function getContributedMenu(location: MenuLocation): ContributedMenuEntry[] {
  const list = registry.get(location) || []
  return [...list].sort((a, b) => {
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
  window.dispatchEvent(new CustomEvent('nova:ext-menus-changed'))
}
