import { create } from 'zustand'
import type { CursorPosition, EditorSettings, OpenTab, SidebarView, TreeNode } from '../types'
import {
  createDemoRoot,
  createEntry,
  deleteEntry,
  listChildren,
  openWorkspace as fsOpenWorkspace,
  openWorkspaceAt as fsOpenWorkspaceAt,
  readText,
  renameEntry,
  writeText,
} from '../lib/fileSystem'
import { languageFromPath } from '../lib/languages'
import { DEFAULT_AI_SETTINGS } from '../lib/ai'
import { isBinaryName } from '../lib/fileIcons'
import { setBackend } from '../lib/fileSystem'

const SETTINGS_KEY = 'nova.settings.v1'

export interface EditorGroup {
  id: string
  activePath: string | null
}

interface PaletteState {
  open: boolean
  mode: 'command' | 'file'
  query: string
}

interface EditorStore {
  root: TreeNode | null
  demoMode: boolean
  busy: boolean
  openTabs: OpenTab[]
  groups: EditorGroup[]
  activeGroupId: string
  activePath: string | null
  sidebarView: SidebarView
  sidebarVisible: boolean
  palette: PaletteState
  cursor: CursorPosition
  settings: EditorSettings
  statusMessage: string | null
  bottomView: 'terminal' | 'problems' | null
  bottomHeight: number
  zenMode: boolean

  openWorkspace: () => Promise<void>
  openWorkspaceAt: (absPath: string) => Promise<void>
  loadDemoWorkspace: () => Promise<void>
  setSidebarView: (v: SidebarView) => void
  toggleSidebar: () => void
  setSidebarVisible: (v: boolean) => void
  expandNode: (node: TreeNode) => Promise<void>
  collapseNode: (node: TreeNode) => void
  openFile: (node: TreeNode, groupId?: string) => Promise<void>
  openFileByPath: (path: string, groupId?: string) => Promise<void>
  closeTab: (path: string, force?: boolean) => void | Promise<void>
  setActiveTab: (path: string) => void
  setActiveGroup: (id: string) => void
  splitGroup: () => void
  closeGroup: (id: string) => void
  updateTabContent: (path: string, content: string) => void
  saveTab: (path?: string) => Promise<void>
  saveAll: () => Promise<void>
  revertTab: (path: string) => Promise<void>
  createFile: (parentPath: string, name: string) => Promise<void>
  createFolder: (parentPath: string, name: string) => Promise<void>
  renameNode: (parentPath: string, node: TreeNode, newName: string) => Promise<void>
  deleteNode: (parentPath: string, node: TreeNode) => Promise<void>
  openPalette: (mode?: PaletteState['mode']) => void
  closePalette: () => void
  setPaletteQuery: (q: string) => void
  setCursor: (pos: CursorPosition) => void
  updateSettings: (patch: Partial<EditorSettings>) => void
  setStatus: (msg: string | null, timeoutMs?: number) => void
  applyAIBuffer: (path: string, buffer: string) => void
  setBottomView: (v: 'terminal' | 'problems' | null) => void
  setBottomHeight: (h: number) => void
  toggleZen: () => void
  patch: (partial: Partial<EditorStore>) => void
}

function loadSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...{
          fontSize: 14,
          tabSize: 4,
          lineHeight: 1.5,
          wordWrap: 'off' as const,
          minimap: true,
          lineNumbers: 'on' as const,
          formatOnSave: false,
          formatOnPaste: false,
          vimMode: false,
          autoSave: false,
          confirmBeforeClose: true,
          cursorBlinking: 'smooth' as const,
          cursorStyle: 'line' as const,
          fontLigatures: true,
          renderWhitespace: 'selection' as const,
          smoothScrolling: true,
          stickyScroll: true,
          bracketPairColorization: true,
          indentGuides: true,
          scrollBeyondLastLine: false,
          autoClosingBrackets: true,
          mouseWheelZoom: true,
          wordBasedSuggestions: true,
          parameterHints: true,
          folding: true,
          theme: 'nova-dark' as const,
          ai: DEFAULT_AI_SETTINGS,
        },
        ...parsed,
        ai: { ...DEFAULT_AI_SETTINGS, ...parsed.ai },
      }
    }
  } catch {
    // ignore
  }
  return {
    fontSize: 14,
    tabSize: 4,
    lineHeight: 1.5,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: 'on',
    formatOnSave: false,
    formatOnPaste: false,
    vimMode: false,
    autoSave: false,
    confirmBeforeClose: true,
    cursorBlinking: 'smooth',
    cursorStyle: 'line',
    fontLigatures: true,
    renderWhitespace: 'selection',
    smoothScrolling: true,
    stickyScroll: true,
    bracketPairColorization: true,
    indentGuides: true,
    scrollBeyondLastLine: false,
    autoClosingBrackets: true,
    mouseWheelZoom: true,
    wordBasedSuggestions: true,
    parameterHints: true,
    folding: true,
    theme: 'nova-dark',
    ai: DEFAULT_AI_SETTINGS,
  }
}

let groupCounter = 1
function newGroup(activePath: string | null = null): EditorGroup {
  return { id: `g${groupCounter++}`, activePath }
}

function findNodeMutable(root: TreeNode, path: string): TreeNode | null {
  if (root.path === path) return root
  if (!root.children) return null
  for (const c of root.children) {
    const found = findNodeMutable(c, path)
    if (found) return found
  }
  return null
}

function treeMap(root: TreeNode, fn: (n: TreeNode) => TreeNode): TreeNode {
  const mapped = fn(root)
  const next = mapped === root ? { ...root } : mapped
  if (next.children) {
    next.children = next.children.map((c) => treeMap(c, fn))
  }
  return next
}

function updateTree(root: TreeNode, path: string, fn: (n: TreeNode) => TreeNode): TreeNode {
  return treeMap(root, (n) => (n.path === path ? fn(n) : n))
}

function insertChild(root: TreeNode, parentPath: string, child: TreeNode): TreeNode {
  return treeMap(root, (n) => {
    if (n.path === parentPath) {
      const children = [...(n.children || []), child]
      children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      return { ...n, children, loaded: true, expanded: true }
    }
    return n
  })
}

function remapNodePath(node: TreeNode, oldPath: string): TreeNode {
  const newPath = oldPath.replace(/[^/]+$/, node.name)
  return treeMap(node, (n) => {
    const suffix = n.path.startsWith(oldPath) ? n.path.slice(oldPath.length) : ''
    return { ...n, path: suffix ? `${newPath}${suffix}` : newPath }
  })
}

function cloneNode(node: TreeNode): TreeNode {
  return {
    ...node,
    children: node.children ? node.children.map(cloneNode) : undefined,
  }
}

let statusTimer: ReturnType<typeof setTimeout> | undefined

export const useEditorStore = create<EditorStore>((set, get) => {
  const syncActive = (groups: EditorGroup[], activeGroupId: string) => {
    const g = groups.find((x) => x.id === activeGroupId)
    return g ? g.activePath : null
  }

  return {
    root: null,
    demoMode: false,
    busy: false,
    openTabs: [],
    groups: [newGroup(null)],
    activeGroupId: 'g1',
    activePath: null,
    sidebarView: 'explorer',
    sidebarVisible: true,
    palette: { open: false, mode: 'command', query: '' },
    cursor: { lineNumber: 1, column: 1 },
    settings: loadSettings(),
    statusMessage: null,
    bottomView: null,
    bottomHeight: 190,
    zenMode: false,

    patch: (partial) => set(partial),

  openWorkspace: async () => {
      try {
        set({ busy: true })
        const { root, demo } = await fsOpenWorkspace()
        set({ root, demoMode: demo, busy: false, sidebarVisible: true, sidebarView: 'explorer' })
        void get().expandNode(root)
        get().setStatus(demo ? 'Espacio de demostración abierto' : 'Carpeta abierta', 2500)
      } catch (e) {
        set({ busy: false })
        if ((e as Error).name !== 'AbortError') {
          get().setStatus(`No se pudo abrir la carpeta: ${(e as Error).message}`, 4000)
        }
      }
    },

    openWorkspaceAt: async (absPath) => {
      try {
        set({ busy: true })
        const { root, demo } = await fsOpenWorkspaceAt(absPath)
        set({ root, demoMode: demo, busy: false, sidebarVisible: true, sidebarView: 'explorer' })
        void get().expandNode(root)
        get().setStatus('Carpeta abierta', 2500)
      } catch (e) {
        set({ busy: false })
        if ((e as Error).name !== 'AbortError') {
          get().setStatus(`No se pudo abrir la carpeta: ${(e as Error).message}`, 4000)
        }
      }
    },

    loadDemoWorkspace: async () => {
      setBackend('virtual')
      const root = createDemoRoot()
      set({ root, demoMode: true, busy: false, sidebarVisible: true, sidebarView: 'explorer' })
      void get().expandNode(root)
      get().setStatus('Espacio de demostración cargado', 2000)
    },

    setSidebarView: (v) => set({ sidebarView: v, sidebarVisible: true }),

    toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
    setSidebarVisible: (v) => set({ sidebarVisible: v }),

    expandNode: async (node) => {
      const root = get().root
      if (!root) return
      let children = node.children
      if (!node.loaded || !node.children) {
        try {
          children = await listChildren(node)
        } catch (e) {
          get().setStatus(`No se pudo leer la carpeta: ${(e as Error).message}`, 3000)
          return
        }
      }
      set({
        root: updateTree(root, node.path, (n) => ({
          ...n,
          children: children || [],
          loaded: true,
          expanded: true,
        })),
      })
    },

    collapseNode: (node) => {
      const root = get().root
      if (!root) return
      set({
        root: updateTree(root, node.path, (n) => ({ ...n, expanded: false })),
      })
    },

    openFile: async (node, groupId) => {
      if (node.kind !== 'file') return
      if (isBinaryName(node.name)) {
        get().setStatus('No se puede abrir un archivo binario', 2500)
        return
      }
      const existing = get().openTabs.find((t) => t.path === node.path)
      if (existing) {
        get().setActiveTab(node.path)
        return
      }
      try {
        const content = await readText(node.handle!)
        const tab: OpenTab = {
          path: node.path,
          name: node.name,
          language: languageFromPath(node.path),
          content,
          savedContent: content,
          dirty: false,
        }
        set((s) => {
          const gid = groupId || s.activeGroupId
          const groups = s.groups.map((g) => (g.id === gid ? { ...g, activePath: node.path } : g))
          return {
            openTabs: [...s.openTabs, tab],
            groups,
            activeGroupId: gid,
            activePath: syncActive(groups, gid),
          }
        })
      } catch (e) {
        get().setStatus(`Error al abrir: ${(e as Error).message}`, 3000)
      }
    },

    openFileByPath: async (path, groupId) => {
      const root = get().root
      if (!root) return
      const node = findNodeMutable(root, path)
      if (node) {
        await get().openFile(node, groupId)
        return
      }
      await ensurePathLoaded(root, path)
      const retry = findNodeMutable(get().root!, path)
      if (retry) await get().openFile(retry, groupId)
      else get().setStatus(`No se encontró ${path}`, 2500)
    },

    closeTab: async (path, force) => {
      const { openTabs, activePath, settings } = get()
      const tab = openTabs.find((t) => t.path === path)
      if (!tab) return
      if (tab.dirty && !force) {
        if (settings.confirmBeforeClose) {
          const keep = window.confirm(`El archivo "${tab.name}" tiene cambios sin guardar.\n\n¿Guardar los cambios?`)
          if (keep) {
            await get().saveTab(path)
          } else {
            return
          }
        } else {
          await get().saveTab(path)
        }
      }
      const remaining = openTabs.filter((t) => t.path !== path)
      let nextActive = activePath
      if (activePath === path) {
        const idx = openTabs.findIndex((t) => t.path === path)
        const neighbor = remaining[idx] || remaining[idx - 1] || null
        nextActive = neighbor ? neighbor.path : null
      }
      set((s) => {
        const groups = s.groups.map((g) => {
          if (g.activePath !== path) return g
          const idx = openTabs.findIndex((t) => t.path === path)
          const neighbor = remaining[idx] || remaining[idx - 1] || null
          return { ...g, activePath: neighbor ? neighbor.path : null }
        })
        return {
          openTabs: remaining,
          groups,
          activePath: nextActive,
        }
      })
    },

    setActiveTab: (path) =>
      set((s) => {
        const groups = s.groups.map((g) => (g.id === s.activeGroupId ? { ...g, activePath: path } : g))
        return { groups, activePath: path }
      }),

    setActiveGroup: (id) =>
      set((s) => ({
        activeGroupId: id,
        activePath: syncActive(s.groups, id),
      })),

    splitGroup: () =>
      set((s) => {
        const active = s.groups.find((g) => g.id === s.activeGroupId)
        const newG = newGroup(active ? active.activePath : null)
        return {
          groups: [...s.groups, newG],
          activeGroupId: newG.id,
          activePath: newG.activePath,
        }
      }),

    closeGroup: (id) =>
      set((s) => {
        if (s.groups.length === 1) {
          return {
            groups: [{ ...s.groups[0], activePath: null }],
            activePath: null,
          }
        }
        const idx = s.groups.findIndex((g) => g.id === id)
        const groups = s.groups.filter((g) => g.id !== id)
        const nextId = s.activeGroupId === id ? (groups[idx] || groups[idx - 1] || groups[0]).id : s.activeGroupId
        return {
          groups,
          activeGroupId: nextId,
          activePath: syncActive(groups, nextId),
        }
      }),

    updateTabContent: (path, content) =>
      set((s) => ({
        openTabs: s.openTabs.map((t) =>
          t.path === path ? { ...t, content, dirty: content !== t.savedContent } : t,
        ),
      })),

    saveTab: async (path) => {
      const target = path || get().activePath
      if (!target) return
      let tab = get().openTabs.find((t) => t.path === target)
      if (!tab) return
      const root = get().root
      const node = root ? findNodeMutable(root, target) : null
      if (!node || !node.handle) {
        get().setStatus('No se pudo localizar el archivo en disco', 2500)
        return
      }
      const editor = (window as unknown as { __novaEditor?: { getAction?: (id: string) => { run?: () => Promise<void> } | undefined } }).__novaEditor
      if (editor && get().settings.formatOnSave) {
        try {
          const formatAction = editor.getAction?.('editor.action.formatDocument')
          if (formatAction?.run) await formatAction.run()
          await new Promise((r) => setTimeout(r, 30))
        } catch {
          // ignore formatting errors
        }
        tab = get().openTabs.find((t) => t.path === target) || tab
      }
      try {
        await writeText(node.handle, tab.content)
        set((s) => ({
          openTabs: s.openTabs.map((t) =>
            t.path === target ? { ...t, savedContent: tab.content, dirty: false } : t,
          ),
        }))
        get().setStatus(`Guardado: ${node.name}`, 1500)
      } catch (e) {
        get().setStatus(`Error al guardar: ${(e as Error).message}`, 3000)
      }
    },

    saveAll: async () => {
      const dirtyTabs = get().openTabs.filter((t) => t.dirty)
      for (const t of dirtyTabs) {
        await get().saveTab(t.path)
      }
    },

    revertTab: async (path) => {
      const tab = get().openTabs.find((t) => t.path === path)
      if (!tab) return
      const root = get().root
      const node = root ? findNodeMutable(root, path) : null
      if (!node?.handle) return
      const content = await readText(node.handle)
      set((s) => ({
        openTabs: s.openTabs.map((t) =>
          t.path === path ? { ...t, content, savedContent: content, dirty: false } : t,
        ),
      }))
    },

    createFile: async (parentPath, name) => {
      const root = get().root
      if (!root) return
      const parent = findNodeMutable(root, parentPath)
      if (!parent || parent.kind !== 'directory' || !parent.handle) return
      try {
        const node = await createEntry(parent.handle, name, 'file')
        node.path = parentPath ? `${parentPath}/${name}` : name
        const withNew = insertChild(root, parentPath, node)
        set({ root: withNew })
        await get().openFile(findNodeMutable(withNew, node.path)!)
      } catch (e) {
        get().setStatus((e as Error).message, 3000)
      }
    },

    createFolder: async (parentPath, name) => {
      const root = get().root
      if (!root) return
      const parent = findNodeMutable(root, parentPath)
      if (!parent || parent.kind !== 'directory' || !parent.handle) return
      try {
        const node = await createEntry(parent.handle, name, 'directory')
        node.path = parentPath ? `${parentPath}/${name}` : name
        set({ root: insertChild(root, parentPath, node) })
      } catch (e) {
        get().setStatus((e as Error).message, 3000)
      }
    },

    renameNode: async (parentPath, node, newName) => {
      const root = get().root
      if (!root) return
      const parent = findNodeMutable(root, parentPath)
      if (!parent?.handle) return
      const oldPath = node.path
      try {
        await renameEntry(parent.handle, node.name, newName)
        const nodeCopy = cloneNode(node)
        nodeCopy.name = newName
        const renamed = remapNodePath(nodeCopy, oldPath)
        const tree = updateTree(root, parentPath, (p) => ({
          ...p,
          children: (p.children || []).map((c) => (c.path === oldPath ? renamed : c)),
        }))
        set((s) => ({
          root: tree,
          openTabs: s.openTabs.map((t) => {
            if (t.path === oldPath) {
              return { ...t, path: renamed.path, name: newName, language: languageFromPath(renamed.path) }
            }
            return t
          }),
          groups: s.groups.map((g) => (g.activePath === oldPath ? { ...g, activePath: renamed.path } : g)),
          activePath: s.activePath === oldPath ? renamed.path : s.activePath,
        }))
      } catch (e) {
        get().setStatus((e as Error).message, 3000)
      }
    },

    deleteNode: async (parentPath, node) => {
      const root = get().root
      if (!root) return
      const parent = findNodeMutable(root, parentPath)
      if (!parent?.handle) return
      try {
        await deleteEntry(parent.handle, node.name)
        const tree = updateTree(root, parentPath, (p) => ({
          ...p,
          children: (p.children || []).filter((c) => c.path !== node.path),
        }))
        const tabs = get().openTabs.filter((t) => t.path !== node.path && !t.path.startsWith(node.path + '/'))
        set((s) => ({
          root: tree,
          openTabs: tabs,
          groups: s.groups.map((g) =>
            g.activePath === node.path || g.activePath?.startsWith(node.path + '/') ? { ...g, activePath: null } : g,
          ),
          activePath: s.activePath === node.path || s.activePath?.startsWith(node.path + '/') ? null : s.activePath,
        }))
        get().setStatus(`Eliminado: ${node.name}`, 2000)
      } catch (e) {
        get().setStatus((e as Error).message, 3000)
      }
    },

    openPalette: (mode) =>
      set((s) => ({ palette: { open: true, mode: mode || s.palette.mode, query: '' } })),

    closePalette: () => set((s) => ({ palette: { ...s.palette, open: false } })),

    setPaletteQuery: (q) => set((s) => ({ palette: { ...s.palette, query: q } })),

    setCursor: (pos) => set({ cursor: pos }),

    updateSettings: (patch) =>
      set((s) => {
        const next = { ...s.settings, ...patch, ai: { ...s.settings.ai, ...(patch.ai || {}) } }
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
        } catch {
          // ignore
        }
        return { settings: next }
      }),

    setStatus: (msg, timeoutMs) => {
      if (statusTimer) clearTimeout(statusTimer)
      set({ statusMessage: msg })
      if (timeoutMs) {
        statusTimer = setTimeout(() => set({ statusMessage: null }), timeoutMs)
      }
    },

    applyAIBuffer: (path, buffer) => {
      set((s) => ({
        openTabs: s.openTabs.map((t) =>
          t.path === path ? { ...t, content: buffer, dirty: buffer !== t.savedContent } : t,
        ),
      }))
    },

    setBottomView: (v) => set({ bottomView: v }),
    setBottomHeight: (h) => set({ bottomHeight: Math.max(90, Math.min(500, h)) }),
    toggleZen: () => set((s) => ({ zenMode: !s.zenMode })),
  }
})

// ---- helpers exported for selectors ----

export function getActiveTab(s: { openTabs: OpenTab[]; activePath: string | null }): OpenTab | undefined {
  return s.openTabs.find((t) => t.path === s.activePath)
}

async function ensurePathLoaded(root: TreeNode, path: string) {
  const parts = path.split('/').slice(0, -1)
  let tree = root
  let curPath = root.path
  for (const segment of parts) {
    if (segment === root.name) continue
    const nextPath = curPath ? `${curPath}/${segment}` : segment
    if (findNodeMutable(tree, nextPath)) {
      curPath = nextPath
      continue
    }
    const parent = findNodeMutable(tree, curPath)
    if (!parent || parent.kind !== 'directory') return
    let children = parent.children
    if (!parent.loaded || !children) {
      try {
        children = await listChildren(parent)
      } catch {
        return
      }
      tree = updateTree(tree, curPath, (n) => ({ ...n, children: children || [], loaded: true }))
    }
    const child = (children || []).find((c) => c.name === segment)
    if (!child) return
    curPath = nextPath
  }
  useEditorStore.setState({ root: tree })
}
