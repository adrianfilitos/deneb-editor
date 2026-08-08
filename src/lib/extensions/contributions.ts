import { registerDynamicCommand, unregisterDynamicCommand } from '../commandRegistry'
import { registerDynamicShortcut, unregisterDynamicShortcut } from '../shortcutRegistry'
import {
  registerContributedMenu,
  unregisterContributedMenu,
  notifyMenusChanged,
  type MenuLocation,
} from './menuRegistry'
import { registerLanguageContrib, unregisterLanguageContrib } from './languageRegistry'
import { registerConfiguration, unregisterConfiguration } from './configRegistry'
import { executeExtensionCommand } from '../extHost/vscodeShim'
import type { VsixParseResult } from '../vsixParser'

interface ContributedCmd {
  command?: string
  title?: string
  category?: string
  icon?: string
}

interface ContributedKeybinding {
  command?: string
  key?: string
  mac?: string
  win?: string
  linux?: string
  when?: string
}

interface ContributedLanguage {
  id?: string
  extensions?: string[]
  filenames?: string[]
  aliases?: string[]
}

interface ContributedMenuItems {
  command?: string
  group?: string
  when?: string
  alt?: string
}

/** Traduce un keybinding de VS Code (p. ej. "ctrl+shift+p") a nuestra forma. */
export function parseKeybinding(raw: string): { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean } | null {
  if (!raw) return null
  const parts = String(raw)
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
  if (!parts.length) return null
  const key = parts[parts.length - 1]
  if (!key) return null
  const out: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean } = { key }
  const mods = parts.slice(0, -1)
  for (const m of mods) {
    if (['ctrl', 'control', 'cmd', 'meta', 'command'].includes(m)) out.ctrl = true
    else if (m === 'shift') out.shift = true
    else if (['alt', 'option', 'opt'].includes(m)) out.alt = true
  }
  return out
}

/** Aplica contributes.* de un .vsix a la app. Devuelve una función para deshacer. */
export function applyContributions(extId: string, parsed: VsixParseResult): () => void {
  const contributes = (parsed.pkg.contributes || {}) as Record<string, unknown>
  const commandIds: string[] = []
  const shortcutIds: string[] = []
  const langIds: string[] = []

  const titles = new Map<string, string>()
  for (const c of (contributes.commands as ContributedCmd[] | undefined) || []) {
    if (c.command) titles.set(c.command, c.title || c.command)
  }

  // ---- lenguajes contribuidos (C#, Python, Java, C++, …) ----
  for (const l of (contributes.languages as ContributedLanguage[] | undefined) || []) {
    if (!l.id) continue
    registerLanguageContrib(extId, l.id, l.extensions, l.filenames)
    langIds.push(l.id)
  }

  // ---- comandos -> paleta de comandos ----
  for (const c of (contributes.commands as ContributedCmd[] | undefined) || []) {
    if (!c.command) continue
    registerDynamicCommand({
      id: c.command,
      title: c.title || c.command,
      category: c.category || 'Extensiones',
      run: () => {
        try {
          const r = executeExtensionCommand(c.command!)
          if (r && typeof r.then === 'function') r.catch(() => {})
        } catch {
          // ignore
        }
      },
    })
    commandIds.push(c.command)
  }

  // ---- keybindings -> atajos globales ----
  for (const kb of (contributes.keybindings as ContributedKeybinding[] | undefined) || []) {
    if (!kb.command) continue
    const keyRaw = kb.key || kb.win || kb.mac || kb.linux
    const parsedKb = parseKeybinding(keyRaw || '')
    if (!parsedKb) continue
    const sid = `${extId}:kb:${kb.command}`
    registerDynamicShortcut({
      id: sid,
      ...parsedKb,
      run: () => {
        try {
          const r = executeExtensionCommand(kb.command!)
          if (r && typeof r.then === 'function') r.catch(() => {})
        } catch {
          // ignore
        }
      },
    })
    shortcutIds.push(sid)
  }

  // ---- menús (editor/context, explorer/context, …) ----
  const menusRaw = contributes.menus as Partial<Record<MenuLocation, ContributedMenuItems[]>> | undefined
  for (const [loc, items] of Object.entries(menusRaw || {}) as [MenuLocation, ContributedMenuItems[]][]) {
    if (!Array.isArray(items)) continue
    const mapped = items
      .filter((it) => it && it.command)
      .map((it) => ({
        command: it.command!,
        group: it.group,
        when: it.when,
        alt: it.alt,
      }))
    if (mapped.length) registerContributedMenu(extId, loc, mapped, titles)
  }

  // ---- configuración -> registro (ajustes + API) ----
  const config = contributes.configuration as
    | { title?: string; properties?: Record<string, Record<string, unknown>> }
    | undefined
  if (config && typeof config === 'object') {
    registerConfiguration(extId, config)
  }

  notifyMenusChanged()

  return () => {
    for (const id of commandIds) unregisterDynamicCommand(id)
    for (const id of shortcutIds) unregisterDynamicShortcut(id)
    for (const langId of langIds) unregisterLanguageContrib(extId, langId)
    for (const loc of Object.keys(menusRaw || {}) as MenuLocation[]) {
      unregisterContributedMenu(extId, loc)
    }
    if (config) unregisterConfiguration(extId)
    notifyMenusChanged()
  }
}
