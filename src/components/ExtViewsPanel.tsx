import { useEffect, useMemo, useState } from 'react'
import { useExtUiStore } from '../store/extUiStore'
import { getTreeProvider, type ExtTreeItem } from '../lib/extensions/treeViewRegistry'
import { executeExtensionCommand } from '../lib/extHost/vscodeShim'
import { Icons } from './icons'

interface NodeState {
  element: unknown
  item: ExtTreeItem
  children: NodeState[]
  expanded: boolean
  loaded: boolean
}

function toItem(raw: ExtTreeItem | undefined, fallback: unknown): ExtTreeItem {
  if (raw && typeof raw.label === 'string') return raw
  return { label: String(fallback) }
}

function NodeView({
  viewId,
  node,
  depth,
  onToggle,
  onPick,
}: {
  viewId: string
  node: NodeState
  depth: number
  onToggle: (n: NodeState) => void
  onPick: (n: NodeState) => void
}) {
  const collapsible = (node.item.collapsibleState || 0) > 0
  return (
    <div>
      <div
        className="ext-tree__node"
        style={{ paddingLeft: depth * 12 + 6 }}
        onClick={() => {
          if (collapsible) onToggle(node)
          else onPick(node)
        }}
      >
        <span className="ext-tree__chevron">
          {collapsible ? (node.expanded ? <Icons.chevronDown size={12} /> : <Icons.chevronRight size={12} />) : null}
        </span>
        <span className="ext-tree__label">{node.item.label}</span>
        {node.item.description && <span className="ext-tree__desc">{node.item.description}</span>}
      </div>
      {collapsible && node.expanded && (
        <Children viewId={viewId} parent={node} depth={depth + 1} onToggle={onToggle} onPick={onPick} />
      )}
    </div>
  )
}

function Children({
  viewId,
  parent,
  depth,
  onToggle,
  onPick,
}: {
  viewId: string
  parent: NodeState
  depth: number
  onToggle: (n: NodeState) => void
  onPick: (n: NodeState) => void
}) {
  if (parent.loaded) {
    return (
      <>
        {parent.children.map((child, i) => (
          <NodeView key={i} viewId={viewId} node={child} depth={depth} onToggle={onToggle} onPick={onPick} />
        ))}
      </>
    )
  }
  return (
    <div className="ext-tree__node" style={{ paddingLeft: depth * 12 + 6 }}>
      <span className="spinner spinner--sm" />
    </div>
  )
}

export function ExtViewsPanel() {
  const treeViews = useExtUiStore((s) => s.treeViews)
  const views = Object.values(treeViews)
  if (views.length === 0) {
    return (
      <div className="ext-views__empty">
        Las extensiones con vistas las muestran aquí (p. ej. un explorador de servidores).
      </div>
    )
  }
  return (
    <div className="ext-views">
      {views.map((meta) => (
        <TreeView key={meta.viewId} viewId={meta.viewId} title={meta.title} tick={meta.tick} />
      ))}
    </div>
  )
}

function TreeView({ viewId, title, tick }: { viewId: string; title: string; tick: number }) {
  const [root, setRoot] = useState<NodeState | null>(null)
  const bump = useExtUiStore((s) => s.bumpTreeView)
  const provider = useMemo(() => getTreeProvider(viewId), [viewId, tick])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const p = getTreeProvider(viewId)
      if (!p) return
      const childrenRaw = await p.getChildren(undefined)
      if (cancelled) return
      const children = await Promise.all(
        childrenRaw.map(async (el) => ({ element: el, item: toItem(await p.getTreeItem(el), el), children: [] as NodeState[], expanded: false, loaded: true })),
      )
      setRoot({ element: undefined, item: { label: title }, children, expanded: true, loaded: true })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, tick])

  async function loadChildren(node: NodeState): Promise<NodeState> {
    if (node.loaded) return node
    const p = getTreeProvider(viewId)
    if (!p) return node
    const raw = await p.getChildren(node.element)
    const children = await Promise.all(
      raw.map(async (el) => ({ element: el, item: toItem(await p.getTreeItem(el), el), children: [] as NodeState[], expanded: false, loaded: true })),
    )
    return { ...node, children, loaded: true }
  }

  async function toggle(n: NodeState) {
    if (!n.expanded) {
      const loaded = await loadChildren(n)
      setRoot((r) => (r ? { ...r, children: r.children.map((c) => (c.element === n.element ? { ...loaded, expanded: true } : c)) } : r))
    } else {
      setRoot((r) => (r ? { ...r, children: r.children.map((c) => (c.element === n.element ? { ...c, expanded: false } : c)) } : r))
    }
  }

  async function pick(n: NodeState) {
    const item = await getTreeProvider(viewId)?.getTreeItem(n.element)
    const cmd = item?.command as { command?: string } | undefined
    if (cmd?.command) executeExtensionCommand(cmd.command)
  }

  return (
    <div className="ext-tree">
      <div className="ext-tree__header">
        <span>{title}</span>
        <button title="Refrescar" onClick={() => bump(viewId)}>
          <Icons.refresh size={12} />
        </button>
      </div>
      <div className="ext-tree__body">
        {root &&
          root.children.map((child, i) => (
            <NodeView key={i} viewId={viewId} node={child} depth={0} onToggle={(n) => void toggle(n)} onPick={(n) => void pick(n)} />
          ))}
        {root && root.children.length === 0 && <div className="ext-tree__empty">Vacío</div>}
      </div>
    </div>
  )
}
