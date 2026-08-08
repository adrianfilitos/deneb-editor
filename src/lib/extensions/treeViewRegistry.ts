export interface ExtTreeItem {
  label: string
  description?: string
  tooltip?: string
  collapsibleState?: number
  iconPath?: unknown
  resourceUri?: { toString: () => string }
  command?: unknown
}

export interface ExtTreeProvider {
  getChildren: (element?: unknown) => (unknown[] | Promise<unknown[]>)
  getTreeItem: (element: unknown) => ExtTreeItem | Promise<ExtTreeItem>
  onDidChangeTreeData?: (listener: (e: unknown) => void) => { dispose: () => void }
}

const providers = new Map<string, ExtTreeProvider>()

export function registerTreeProvider(viewId: string, provider: ExtTreeProvider) {
  providers.set(viewId, provider)
}

export function unregisterTreeProvider(viewId: string) {
  providers.delete(viewId)
}

export function getTreeProvider(viewId: string): ExtTreeProvider | undefined {
  return providers.get(viewId)
}
