import { useEditorStore, type EditorGroup } from '../store/editorStore'
import { nodeFromHandle, readText, resolvePath, requestPermission, setBackend, type AnyHandle } from './fileSystem'

const SESSION_KEY = 'nova.session.v1'
const DB_NAME = 'nova-db'
const DB_STORE = 'handles'

interface StoredTab {
  path: string
  dirty?: boolean
  content?: string
}

interface SessionData {
  kind: 'demo' | 'native'
  tabs: StoredTab[]
  groups: { id: string; activePath: string | null }[]
  activeGroupId: string
  bottomView: 'terminal' | 'problems' | null
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexedDB no disponible'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const req = tx.objectStore(DB_STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

export async function persistSession(): Promise<void> {
  const s = useEditorStore.getState()
  if (!s.root) return
  const data: SessionData = {
    kind: s.demoMode ? 'demo' : 'native',
    tabs: s.openTabs.map((t) => ({
      path: t.path,
      dirty: t.dirty,
      content: t.dirty && t.content.length < 500_000 ? t.content : undefined,
    })),
    groups: s.groups.map((g) => ({ id: g.id, activePath: g.activePath })),
    activeGroupId: s.activeGroupId,
    bottomView: s.bottomView,
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded: retry without contents
    data.tabs = data.tabs.map((t) => ({ path: t.path, dirty: t.dirty }))
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
  }
  if (!s.demoMode && s.root.handle) {
    await idbSet('workspaceHandle', s.root.handle as FileSystemDirectoryHandle)
  }
}

let restoring = false

export async function restoreSession(): Promise<void> {
  if (restoring) return
  restoring = true
  let data: SessionData | null = null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) data = JSON.parse(raw) as SessionData
  } catch {
    data = null
  }
  if (!data) {
    restoring = false
    return
  }

  let root: import('../types').TreeNode | null = null
  let demo = data.kind === 'demo'

  if (data.kind === 'native') {
    const handle = await idbGet<FileSystemDirectoryHandle & { absPath?: string }>('workspaceHandle')
    if (handle) {
      try {
        if (typeof handle.absPath === 'string') {
          setBackend('desktop')
          const { desktopFs } = await import('./electronBridge')
          await desktopFs()?.setWorkspace(handle.absPath)
        }
        const ok = await requestPermission(handle)
        if (ok) {
          root = nodeFromHandle(handle)
          demo = false
        }
      } catch {
        root = null
      }
    }
  }

  if (!root && demo) {
    // demo workspace: recreate root via the store
    await useEditorStore.getState().loadDemoWorkspace()
    root = useEditorStore.getState().root
  }
  if (!root) return

  // Set the tree first so openFile can resolve handles
  useEditorStore.setState({ root, demoMode: demo, busy: false })

  // Reopen tabs
  const openedPaths: string[] = []
  for (const st of data.tabs) {
    const rel = stripRoot(root, st.path)
    const handle = await resolvePath(root.handle as AnyHandle, rel)
    if (!handle || handle.kind !== 'file') continue
    let content: string | null = st.dirty && st.content ? st.content : null
    if (content === null) {
      content = await readText(handle).catch(() => null)
    }
    if (content === null) continue
    const language = await import('../lib/languages').then((m) => m.languageFromPath(st.path))
    await useEditorStore.getState().openFileByPath(st.path)
    const after = useEditorStore.getState()
    if (!after.openTabs.find((t) => t.path === st.path)) continue
    useEditorStore.setState((s) => ({
      openTabs: s.openTabs.map((t) =>
        t.path === st.path
          ? { ...t, content: content!, savedContent: content!, dirty: !!st.dirty }
          : t,
      ),
    }))
    openedPaths.push(st.path)
    void language
  }

  // Restore groups
  const validGroups: EditorGroup[] = (data.groups || [])
    .filter((g) => !g.activePath || openedPaths.includes(g.activePath))
    .map((g) => ({ id: g.id, activePath: g.activePath }))
  const activeGroupId = validGroups.some((g) => g.id === data.activeGroupId)
    ? data.activeGroupId
    : validGroups[0]?.id || 'g1'
  const finalGroups: EditorGroup[] = validGroups.length ? validGroups : [{ id: 'g1', activePath: null }]
  const activePath = finalGroups.find((g) => g.id === activeGroupId)?.activePath ?? null

  useEditorStore.setState((s) => ({
    groups: finalGroups,
    activeGroupId,
    activePath,
    bottomView: data.bottomView || null,
  }))

  const s = useEditorStore.getState()
  if (s.root) void s.expandNode(s.root)
  restoring = false
}

function stripRoot(root: import('../types').TreeNode, path: string): string {
  const prefix = root.name + '/'
  if (path.startsWith(prefix)) return path.slice(prefix.length)
  return path
}

export { nodeFromHandle }
