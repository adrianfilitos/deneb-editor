import { create } from 'zustand'
import type { InstalledExt } from '../lib/extensionTypes'
import { applyExtension, undoExtension } from '../lib/extensionRuntime'
import { NATIVE_MAP } from '../lib/nativeExtensions'
import {
  parseVsix,
  cacheParsedVsix,
  dropParsedVsix,
  loadParsedVsixFromStore,
} from '../lib/vsixParser'
import { putVsix, deleteVsix } from '../lib/extensions/blobStore'

const STORAGE_KEY = 'deneb.extensions.installed.v2'

function loadInstalled(): Record<string, InstalledExt> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, InstalledExt>
  } catch {
    // ignore
  }
  return {}
}

function persistInstalled(installed: Record<string, InstalledExt>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(installed))
  } catch {
    // ignore
  }
}

interface ExtensionStore {
  installed: Record<string, InstalledExt>
  init: () => Promise<void>
  installNative: (id: string) => void
  installVsixFromBytes: (bytes: Uint8Array, fallbackName: string, fallbackIcon?: string) => string | null
  setEnabled: (id: string, on: boolean) => void
  uninstall: (id: string) => void
}

export const useExtensionStore = create<ExtensionStore>((set, get) => ({
  installed: loadInstalled(),

  init: async () => {
    const installed = get().installed
    for (const ext of Object.values(installed)) {
      if (!ext.enabled) continue
      if (ext.type === 'vsix' && ext.archive) {
        const parsed = await loadParsedVsixFromStore(ext.id)
        if (parsed) cacheParsedVsix(ext.id, parsed)
      }
      applyExtension(ext)
    }
  },

  installNative: (id) => {
    const def = NATIVE_MAP[id]
    if (!def) return
    const existing = get().installed[id]
    if (existing) {
      get().setEnabled(id, true)
      return
    }
    const ext: InstalledExt = {
      id,
      type: 'native',
      name: def.name,
      version: def.version,
      description: def.description,
      icon: def.icon,
      enabled: true,
      contrib: def.contrib,
      code: def.code,
    }
    set((s) => {
      const installed = { ...s.installed, [id]: ext }
      persistInstalled(installed)
      return { installed }
    })
    applyExtension(ext)
  },

  installVsixFromBytes: (bytes, fallbackName, fallbackIcon) => {
    let parsed
    try {
      parsed = parseVsix(bytes)
    } catch {
      return null
    }
    cacheParsedVsix(parsed.id, parsed)
    const ext: InstalledExt = {
      id: parsed.id,
      type: 'vsix',
      name: parsed.displayName || fallbackName,
      version: parsed.version,
      description: parsed.description,
      icon: fallbackIcon,
      enabled: true,
      contrib: { themes: parsed.themes, snippets: parsed.snippets },
      code: parsed.code,
      archive: true,
    }
    void putVsix(parsed.id, bytes)
    set((s) => {
      const installed = { ...s.installed, [ext.id]: ext }
      persistInstalled(installed)
      return { installed }
    })
    applyExtension(ext)
    return ext.id
  },

  setEnabled: (id, on) => {
    const ext = get().installed[id]
    if (!ext || ext.enabled === on) return
    const next = { ...ext, enabled: on }
    if (on) {
      if (next.type === 'vsix' && next.archive) {
        void loadParsedVsixFromStore(id).then((parsed) => {
          if (parsed) cacheParsedVsix(id, parsed)
        })
      }
      applyExtension(next)
    } else {
      undoExtension(ext)
    }
    set((s) => {
      const installed = { ...s.installed, [id]: next }
      persistInstalled(installed)
      return { installed }
    })
  },

  uninstall: (id) => {
    const ext = get().installed[id]
    if (!ext) return
    if (ext.enabled) undoExtension(ext)
    if (ext.type === 'vsix') {
      void deleteVsix(id)
      dropParsedVsix(id)
    }
    set((s) => {
      const installed = { ...s.installed }
      delete installed[id]
      persistInstalled(installed)
      return { installed }
    })
  },
}))
