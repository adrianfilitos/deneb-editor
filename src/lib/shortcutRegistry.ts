export interface DynamicShortcut {
  id: string
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  run: () => void
}

const list: DynamicShortcut[] = []

export function registerDynamicShortcut(shortcut: DynamicShortcut) {
  if (list.some((s) => s.id === shortcut.id)) return
  list.push(shortcut)
}

export function unregisterDynamicShortcut(id: string) {
  const i = list.findIndex((s) => s.id === id)
  if (i >= 0) list.splice(i, 1)
}

export function getDynamicShortcuts(): DynamicShortcut[] {
  return list
}
