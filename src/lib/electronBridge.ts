export interface DesktopFsEntry {
  name: string
  kind: 'file' | 'directory'
  absPath: string
}

export interface NovaDesktopFs {
  openWorkspace: () => Promise<string | null>
  setWorkspace: (absPath: string) => Promise<boolean>
  list: (absPath: string) => Promise<DesktopFsEntry[]>
  stat: (absPath: string) => Promise<DesktopFsEntry | null>
  readFile: (absPath: string) => Promise<string>
  writeFile: (absPath: string, content: string) => Promise<boolean>
  create: (parentAbs: string, name: string, kind: 'file' | 'directory') => Promise<DesktopFsEntry>
  remove: (absPath: string) => Promise<boolean>
  rename: (parentAbs: string, oldName: string, newName: string) => Promise<boolean>
  walk: (absPath: string) => Promise<string[]>
  exec: (cwd: string | undefined, command: string) => Promise<string>
}

export interface NovaDesktopTerm {
  start: (cwd?: string) => Promise<boolean>
  write: (data: string) => Promise<boolean>
  kill: () => Promise<boolean>
  onData: (cb: (data: string) => void) => () => void
  onExit: (cb: () => void) => () => void
}

export interface NovaDesktopWindow {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  onMaximized: (cb: (maximized: boolean) => void) => () => void
}

export interface NovaDesktopMenu {
  undo: () => void
  redo: () => void
  cut: () => void
  copy: () => void
  paste: () => void
  selectAll: () => void
  reload: () => void
  devtools: () => void
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  toggleFullscreen: () => void
  about: () => void
}

export interface GitResult {
  ok: boolean
  out?: string
  error?: string
}

export interface GitStatusResult {
  ok: boolean
  status: string
  branch: string
  log: string
  error?: string
}

export interface GitBranchesResult {
  ok: boolean
  branches: string[]
  current: string
  error?: string
}

export interface GitDiffResult {
  ok: boolean
  diff: string
  error?: string
}

export interface NovaDesktopGit {
  available: () => Promise<boolean>
  status: () => Promise<GitStatusResult>
  add: (paths: string[]) => Promise<GitResult>
  reset: (paths: string[]) => Promise<GitResult>
  commit: (msg: string) => Promise<GitResult>
  branches: () => Promise<GitBranchesResult>
  checkout: (name: string) => Promise<GitResult>
  createBranch: (name: string) => Promise<GitResult>
  diff: (file: string, staged?: boolean) => Promise<GitDiffResult>
  push: () => Promise<GitResult>
  pull: () => Promise<GitResult>
  fetch: () => Promise<GitResult>
  log: () => Promise<{ ok: boolean; log: string; error?: string }>
}

export interface NovaDesktopExt {
  install: (url: string, filename: string) => Promise<{ ok: boolean; path?: string; size?: number; error?: string }>
  save: (filename: string, data: Uint8Array) => Promise<{ ok: boolean; path?: string; size?: number; error?: string }>
  installed: () => Promise<{ file: string; size: number }[]>
  dir: () => Promise<string>
}

export interface NovaDesktopLiveServer {
  start: (port: number, root: string) => Promise<{ ok: boolean; port?: number; url?: string; error?: string }>
  stop: () => Promise<{ ok: boolean }>
  status: () => Promise<{ running: boolean; port?: number; root?: string; url?: string }>
  onStatus: (cb: (s: { running: boolean; port?: number; url?: string }) => void) => () => void
}

export type UpdateStatusType = 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'

export interface UpdateStatusPayload {
  type: UpdateStatusType
  version?: string
  percent?: number
  message?: string
}

export interface UpdateVersionInfo {
  version: string
  supported: boolean
  portable: boolean
  packaged: boolean
}

export interface NovaDesktopUpdates {
  version: () => Promise<UpdateVersionInfo>
  check: () => void
  install: () => void
  onStatus: (cb: (data: UpdateStatusPayload) => void) => () => void
}

export interface NovaDesktopDebugConfig {
  program: string
  args?: string[]
  env?: Record<string, string>
}

export interface NovaDesktopDebugEvent {
  type: string
  data: {
    reason?: string
    threadId?: number
    frames?: { id: number; name: string; line: number; column: number; source?: { path?: string }; callFrameId?: string }[]
  }
}

export interface NovaDesktopDebug {
  start: (cfg: NovaDesktopDebugConfig) => Promise<{ ok: boolean; error?: string }>
  setBreakpoints: (lines: number[], filePath: string) => Promise<{ verified: boolean; line: number; id?: string }[]>
  continue: () => Promise<unknown>
  next: () => Promise<unknown>
  stepIn: () => Promise<unknown>
  stepOut: () => Promise<unknown>
  pause: () => Promise<unknown>
  stackTrace: (threadId: number) => Promise<{ stackFrames: { id: number; name: string; line: number; column: number; source?: { name?: string; path?: string } }[] }>
  evaluate: (expression: string, frameId?: number) => Promise<{ result: string; variablesReference: number }>
  disconnect: () => Promise<boolean>
  onEvent: (cb: (ev: NovaDesktopDebugEvent) => void) => () => void
  onConsole: (cb: (data: { channel: string; text: string }) => void) => () => void
}

export interface NovaDesktopBridge {
  isDesktop: boolean
  platform?: string
  on: (channel: string, cb: (data?: unknown) => void) => () => void
  fs: NovaDesktopFs
  term: NovaDesktopTerm
  debug?: NovaDesktopDebug
  windowControls: NovaDesktopWindow
  menu: NovaDesktopMenu
  git?: NovaDesktopGit
  ext?: NovaDesktopExt
  liveServer?: NovaDesktopLiveServer
  updates?: NovaDesktopUpdates
}

declare global {
  interface Window {
    novaDesktop?: NovaDesktopBridge
  }
}

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!window.novaDesktop?.isDesktop
}

export function desktopPlatform(): string {
  return window.novaDesktop?.platform || 'web'
}

export function desktopFs(): NovaDesktopFs | null {
  return window.novaDesktop?.fs ?? null
}

export function desktopLiveServer(): NovaDesktopLiveServer | null {
  return window.novaDesktop?.liveServer ?? null
}

export function desktopDebug(): NovaDesktopDebug | null {
  return window.novaDesktop?.debug ?? null
}

export function setupElectronBridge() {
  if (!isDesktop()) return
  if ((window as unknown as { __novaBridge?: boolean }).__novaBridge) return
  ;(window as unknown as { __novaBridge?: boolean }).__novaBridge = true
  const bridge = window.novaDesktop!
  const store = () => import('../store/editorStore')

  bridge.on('nova:open-workspace', () => void store().then((s) => s.useEditorStore.getState().openWorkspace()))
  bridge.on('nova:save', () => void store().then((s) => s.useEditorStore.getState().saveTab()))
  bridge.on('nova:save-all', () => void store().then((s) => s.useEditorStore.getState().saveAll()))
  bridge.on('nova:toggle-sidebar', () => void store().then((s) => s.useEditorStore.getState().toggleSidebar()))
  bridge.on('nova:toggle-terminal', () =>
    void store().then((s) => {
      const st = s.useEditorStore.getState()
      st.setBottomView(st.bottomView === 'terminal' ? null : 'terminal')
    }),
  )
  bridge.on('nova:toggle-problems', () =>
    void store().then((s) => {
      const st = s.useEditorStore.getState()
      st.setBottomView(st.bottomView === 'problems' ? null : 'problems')
    }),
  )
  bridge.on('nova:show-ai', () => void store().then((s) => s.useEditorStore.getState().setSidebarView('ai')))
  bridge.on('nova:toggle-zen', () => void store().then((s) => s.useEditorStore.getState().toggleZen()))
  bridge.on('nova:show-shortcuts', () => window.dispatchEvent(new Event('nova:show-shortcuts')))
  bridge.on('nova:open-path', (data) => {
    void store().then((s) => {
      const st = s.useEditorStore
      const d = data as { abs: string; kind: 'directory' | 'file' } | undefined
      if (!d?.abs) return
      if (d.kind === 'directory') {
        void st.getState().openWorkspaceAt(d.abs)
        return
      }
      const parts = d.abs.replace(/\\/g, '/').split('/')
      const file = parts.pop() || ''
      const parent = parts.join('/')
      void (async () => {
        await st.getState().openWorkspaceAt(parent)
        const root = st.getState().root
        if (!root) return
        void st.getState().openFileByPath(`${root.name}/${file}`)
      })()
    })
  })
}
