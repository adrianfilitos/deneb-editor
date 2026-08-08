import { create } from 'zustand'

export interface QPItem {
  id: string
  label: string
  description?: string
  detail?: string
  kind?: number
}

export interface QuickPickState {
  open: boolean
  title?: string
  placeholder?: string
  items: QPItem[]
  resolve?: (item: QPItem | undefined) => void
}

export interface InputBoxState {
  open: boolean
  title?: string
  prompt?: string
  value?: string
  password?: boolean
  validate?: (value: string) => string | undefined | Promise<string | undefined>
  resolve?: (value: string | undefined) => void
}

export interface ExtStatusItem {
  id: string
  text: string
  tooltip?: string
  align: 0 | 1
  priority: number
  command?: string
  show: boolean
}

export interface ExtWebviewState {
  id: string
  title: string
  html: string
  open: boolean
}

export interface ExtTreeViewMeta {
  viewId: string
  title: string
  tick: number
}

interface ExtUiState {
  quickPick: QuickPickState
  inputBox: InputBoxState
  statusItems: Record<string, ExtStatusItem>
  outputs: Record<string, { lines: string[]; active: boolean }>
  webviews: Record<string, ExtWebviewState>
  treeViews: Record<string, ExtTreeViewMeta>
  activeOutput: string | null
  diagnosticsTick: number

  openQuickPick: (state: Omit<QuickPickState, 'open'>) => void
  closeQuickPick: () => void
  openInputBox: (state: Omit<InputBoxState, 'open'>) => void
  closeInputBox: () => void
  setStatusItem: (id: string, item: ExtStatusItem) => void
  removeStatusItem: (id: string) => void
  appendOutput: (id: string, text: string, activate?: boolean) => void
  clearOutput: (id: string) => void
  showOutput: (id: string) => void
  hideOutput: (id: string) => void
  addWebview: (w: ExtWebviewState) => void
  removeWebview: (id: string) => void
  setWebviewHtml: (id: string, html: string) => void
  setWebviewOpen: (id: string, open: boolean) => void
  addTreeView: (viewId: string, title: string) => void
  removeTreeView: (viewId: string) => void
  bumpTreeView: (viewId: string) => void
  bumpDiagnostics: () => void
}

export const useExtUiStore = create<ExtUiState>((set, get) => ({
  quickPick: { open: false, items: [] },
  inputBox: { open: false },
  statusItems: {},
  outputs: {},
  webviews: {},
  treeViews: {},
  activeOutput: null,
  diagnosticsTick: 0,

  openQuickPick: (state) => set({ quickPick: { open: true, ...state } }),
  closeQuickPick: () => {
    const qp = get().quickPick
    qp.resolve?.(undefined)
    set({ quickPick: { open: false, items: [] } })
  },

  openInputBox: (state) => set({ inputBox: { open: true, ...state } }),
  closeInputBox: () => {
    const ib = get().inputBox
    ib.resolve?.(undefined)
    set({ inputBox: { open: false } })
  },

  setStatusItem: (id, item) => set((s) => ({ statusItems: { ...s.statusItems, [id]: item } })),
  removeStatusItem: (id) =>
    set((s) => {
      const next = { ...s.statusItems }
      delete next[id]
      return { statusItems: next }
    }),

  appendOutput: (id, text, activate) =>
    set((s) => {
      const cur = s.outputs[id] || { lines: [], active: false }
      const lines = [...cur.lines]
      const parts = text.split('\n')
      if (parts.length === 1) {
        if (lines.length === 0) lines.push('')
        lines[lines.length - 1] += parts[0]
      } else {
        lines[lines.length - 1] += parts.shift() || ''
        lines.push(...parts)
      }
      return {
        outputs: { ...s.outputs, [id]: { lines, active: true } },
        activeOutput: activate ? id : s.activeOutput,
      }
    }),
  clearOutput: (id) =>
    set((s) => ({ outputs: { ...s.outputs, [id]: { lines: [], active: true } } })),
  showOutput: (id) => set({ activeOutput: id }),
  hideOutput: () => set({ activeOutput: null }),

  addWebview: (w) => set((s) => ({ webviews: { ...s.webviews, [w.id]: w } })),
  removeWebview: (id) =>
    set((s) => {
      const next = { ...s.webviews }
      delete next[id]
      return { webviews: next }
    }),
  setWebviewHtml: (id, html) =>
    set((s) => ({ webviews: { ...s.webviews, [id]: { ...(s.webviews[id] || { id, title: '', html: '', open: true }), html } } })),
  setWebviewOpen: (id, open) =>
    set((s) => ({ webviews: { ...s.webviews, [id]: { ...s.webviews[id], open } } })),

  addTreeView: (viewId, title) =>
    set((s) => ({ treeViews: { ...s.treeViews, [viewId]: { viewId, title, tick: 0 } } })),
  removeTreeView: (viewId) =>
    set((s) => {
      const next = { ...s.treeViews }
      delete next[viewId]
      return { treeViews: next }
    }),
  bumpTreeView: (viewId) =>
    set((s) => ({ treeViews: { ...s.treeViews, [viewId]: { ...s.treeViews[viewId], tick: (s.treeViews[viewId]?.tick || 0) + 1 } } })),

  bumpDiagnostics: () => set((s) => ({ diagnosticsTick: s.diagnosticsTick + 1 })),
}))
