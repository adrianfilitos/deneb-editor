import { create } from 'zustand'
import { isDesktop, type DenebDesktopGit } from '../lib/electronBridge'
import { useEditorStore } from './editorStore'
import type { DesktopEntry } from '../types'

export type GitChangeKind = 'M' | 'A' | 'D' | 'R' | 'U'

export interface GitChange {
  path: string
  name: string
  kind: GitChangeKind
  staged: boolean
}

interface GitStore {
  available: boolean
  isRepo: boolean
  branch: string
  changes: GitChange[]
  log: string[]
  busy: boolean
  error: string | null

  refresh: () => Promise<void>
  init: () => Promise<void>
  stage: (paths: string[]) => Promise<void>
  unstage: (paths: string[]) => Promise<void>
  commit: (msg: string) => Promise<boolean>
  checkout: (name: string) => Promise<boolean>
  createBranch: (name: string) => Promise<boolean>
  getDiff: (file: string, staged?: boolean) => Promise<string>
  push: () => Promise<boolean>
  pull: () => Promise<boolean>
  fetch: () => Promise<boolean>
  openFile: (path: string) => Promise<void>
}

function gitApi(): DenebDesktopGit | null {
  return isDesktop() ? window.denebDesktop!.git ?? null : null
}

const KIND_LABEL: Record<GitChangeKind, string> = {
  M: 'Modificado',
  A: 'Añadido',
  D: 'Eliminado',
  R: 'Renombrado',
  U: 'Sin seguimiento',
}

function parsePorcelain(raw: string): GitChange[] {
  const out: GitChange[] = []
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('##')) continue
    const xy = line.slice(0, 2)
    let rest = line.slice(3)
    if (rest.includes(' -> ')) rest = rest.split(' -> ').pop() || rest
    const staged = xy[0] !== ' ' && xy[0] !== '?'
    let kind: GitChangeKind = 'M'
    for (const c of xy) {
      if (c !== ' ' && c !== '?') {
        kind = c as GitChangeKind
        break
      }
    }
    if (xy === '??') kind = 'U'
    out.push({ path: rest, name: rest.split('/').pop() || rest, kind, staged })
  }
  return out
}

export function kindLabel(kind: GitChangeKind): string {
  return KIND_LABEL[kind] ?? kind
}

function workspaceRootAbs(): string | null {
  const root = useEditorStore.getState().root
  if (!root) return null
  const handle = root.handle as DesktopEntry | null
  return handle && typeof handle.absPath === 'string' ? handle.absPath : null
}

let editorUnsub: (() => void) | null = null
let lastRootAbs: string | null = null

export const useGitStore = create<GitStore>((set, get) => ({
  available: false,
  isRepo: false,
  branch: '',
  changes: [],
  log: [],
  busy: false,
  error: null,

  init: async () => {
    const api = gitApi()
    if (!api) {
      set({ available: false, isRepo: false })
      return
    }
    set({ available: true })
    if (!editorUnsub) {
      editorUnsub = useEditorStore.subscribe((s) => {
        const abs = workspaceRootAbs()
        if (abs !== lastRootAbs) {
          lastRootAbs = abs
          void get().refresh()
        }
      })
    }
    await get().refresh()
  },

  refresh: async () => {
    const api = gitApi()
    if (!api) return
    set({ busy: true, error: null })
    try {
      const res = await api.status()
      if (!res.ok) {
        set({ isRepo: false, branch: '', changes: [], log: [], busy: false, error: res.error || 'No es un repositorio de Git' })
        return
      }
      set({
        isRepo: true,
        branch: res.branch,
        changes: parsePorcelain(res.status),
        log: res.log.split('\n').filter(Boolean),
        busy: false,
        error: null,
      })
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
    }
  },

  stage: async (paths) => {
    const api = gitApi()
    if (!api) return
    set({ busy: true, error: null })
    try {
      const r = await api.add(paths)
      set({ busy: false, error: r.ok ? null : r.error || 'Error al preparar' })
      await get().refresh()
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
    }
  },

  unstage: async (paths) => {
    const api = gitApi()
    if (!api) return
    set({ busy: true, error: null })
    try {
      const r = await api.reset(paths)
      set({ busy: false, error: r.ok ? null : r.error || 'Error al despreparar' })
      await get().refresh()
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
    }
  },

  commit: async (msg) => {
    const api = gitApi()
    if (!api) return false
    set({ busy: true, error: null })
    try {
      const r = await api.commit(msg)
      set({ busy: false, error: r.ok ? null : r.error || 'Error al hacer commit' })
      if (r.ok) await get().refresh()
      return r.ok
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
      return false
    }
  },

  checkout: async (name) => {
    const api = gitApi()
    if (!api) return false
    set({ busy: true, error: null })
    try {
      const r = await api.checkout(name)
      set({ busy: false, error: r.ok ? null : r.error || 'Error al cambiar de rama' })
      if (r.ok) await get().refresh()
      return r.ok
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
      return false
    }
  },

  createBranch: async (name) => {
    const api = gitApi()
    if (!api) return false
    set({ busy: true, error: null })
    try {
      const r = await api.createBranch(name)
      set({ busy: false, error: r.ok ? null : r.error || 'Error al crear la rama' })
      if (r.ok) await get().refresh()
      return r.ok
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
      return false
    }
  },

  getDiff: async (file, staged = false) => {
    const api = gitApi()
    if (!api) return ''
    try {
      const r = await api.diff(file, staged)
      return r.ok ? r.diff : ''
    } catch {
      return ''
    }
  },

  push: async () => {
    const api = gitApi()
    if (!api) return false
    set({ busy: true, error: null })
    try {
      const r = await api.push()
      set({ busy: false, error: r.ok ? null : r.error || 'Error al hacer push' })
      await get().refresh()
      return r.ok
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
      return false
    }
  },

  pull: async () => {
    const api = gitApi()
    if (!api) return false
    set({ busy: true, error: null })
    try {
      const r = await api.pull()
      set({ busy: false, error: r.ok ? null : r.error || 'Error al hacer pull' })
      await get().refresh()
      return r.ok
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
      return false
    }
  },

  fetch: async () => {
    const api = gitApi()
    if (!api) return false
    set({ busy: true, error: null })
    try {
      const r = await api.fetch()
      set({ busy: false, error: r.ok ? null : r.error || 'Error al hacer fetch' })
      await get().refresh()
      return r.ok
    } catch (e) {
      set({ busy: false, error: (e as Error).message })
      return false
    }
  },

  openFile: async (path) => {
    const abs = workspaceRootAbs()
    const store = useEditorStore.getState()
    if (!abs) {
      store.setStatus('No hay carpeta abierta', 2500)
      return
    }
    if (get().branch) {
      const root = store.root
      if (root && root.handle && 'absPath' in (root.handle as DesktopEntry) && (root.handle as DesktopEntry).absPath === abs) {
        await store.openFileByPath(`${root.name}/${path}`)
        return
      }
    }
    await store.openWorkspaceAt(abs)
    const newRoot = useEditorStore.getState().root
    if (newRoot) await useEditorStore.getState().openFileByPath(`${newRoot.name}/${path}`)
  },
}))
