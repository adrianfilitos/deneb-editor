import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { iconForFile } from '../lib/fileIcons'
import { Icons } from './icons'
import type { TreeNode } from '../types'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { getContributedMenu } from '../lib/extensions/menuRegistry'
import { executeExtensionCommand } from '../lib/extHost/vscodeShim'

interface ExplorerProps {
  onOpenFile?: (path: string) => void
}

export function Explorer({ onOpenFile }: ExplorerProps) {
  const root = useEditorStore((s) => s.root)
  const demoMode = useEditorStore((s) => s.demoMode)
  const openWorkspace = useEditorStore((s) => s.openWorkspace)
  const loadDemo = useEditorStore((s) => s.loadDemoWorkspace)
  const activePath = useEditorStore((s) => s.activePath)

  if (!root) {
    return (
      <div className="explorer__empty">
        <div className="explorer__empty-glow">
          <Icons.sparkles size={40} />
        </div>
        <h3>Ninguna carpeta abierta</h3>
        <p>Explora, edita y escribe código con IA.</p>
        <div className="explorer__empty-actions">
          <button className="btn btn--primary" onClick={() => void openWorkspace()}>
            <Icons.folder size={15} /> Abrir carpeta
          </button>
          {!demoMode && (
            <button className="btn" onClick={() => void loadDemo()}>
              <Icons.sparkles size={15} /> Probar demo
            </button>
          )}
        </div>
        <div className="explorer__empty-tip">
          <Icons.info size={13} /> Consejo: abre una carpeta para empezar a editar
        </div>
      </div>
    )
  }

  return (
    <div className="explorer">
      <div className="explorer__workspace">
        <div className="explorer__workspace-label">
          <Icons.folderOpen size={14} />
          <span>{root.name}</span>
          {demoMode && <span className="badge">demo</span>}
        </div>
        <ExplorerActions parent={root} />
      </div>
      <div className="explorer__tree">
        <TreeView node={root} depth={0} activePath={activePath} onOpenFile={onOpenFile} />
      </div>
    </div>
  )
}

function ExplorerActions({ parent }: { parent: TreeNode }) {
  const createFile = useEditorStore((s) => s.createFile)
  const createFolder = useEditorStore((s) => s.createFolder)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [creatingFor, setCreatingFor] = useState<TreeNode | null>(null)

  const startCreate = (kind: 'file' | 'folder', node: TreeNode) => {
    setMenu(null)
    setCreating(kind)
    setCreatingFor(node)
  }

  const onConfirm = async (name: string) => {
    if (!creatingFor || !creating || !name.trim()) {
      setCreating(null)
      setCreatingFor(null)
      return
    }
    const clean = name.trim()
    if (creating === 'file') await createFile(creatingFor.path, clean)
    else await createFolder(creatingFor.path, clean)
    setCreating(null)
    setCreatingFor(null)
  }

  return (
    <>
      <div className="explorer__workspace-actions">
        <button title="Nuevo archivo" onClick={() => startCreate('file', parent)}>
          <Icons.filePlus size={14} />
        </button>
        <button title="Nueva carpeta" onClick={() => startCreate('folder', parent)}>
          <Icons.folderPlus size={14} />
        </button>
        <button title="Más acciones" onClick={(e) => setMenu({ x: e.clientX, y: e.clientY })}>
          <Icons.more size={14} />
        </button>
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Nuevo archivo', icon: 'filePlus', run: () => startCreate('file', parent) },
            { label: 'Nueva carpeta', icon: 'folderPlus', run: () => startCreate('folder', parent) },
            { label: 'Refrescar', icon: 'refresh', run: () => useEditorStore.setState({}) },
          ]}
        />
      )}
      {creating && (
        <InlineRename
          placeholder={creating === 'file' ? 'nombre.archivo' : 'nombre-carpeta'}
          initial=""
          onCancel={() => {
            setCreating(null)
            setCreatingFor(null)
          }}
          onConfirm={onConfirm}
        />
      )}
    </>
  )
}

function TreeView({
  node,
  depth,
  activePath,
  onOpenFile,
}: {
  node: TreeNode
  depth: number
  activePath: string | null
  onOpenFile?: (path: string) => void
}) {
  const expandNode = useEditorStore((s) => s.expandNode)
  const collapseNode = useEditorStore((s) => s.collapseNode)
  const openFile = useEditorStore((s) => s.openFile)
  const createFile = useEditorStore((s) => s.createFile)
  const createFolder = useEditorStore((s) => s.createFolder)
  const renameNode = useEditorStore((s) => s.renameNode)
  const deleteNode = useEditorStore((s) => s.deleteNode)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [busy, setBusy] = useState(false)

  const isDir = node.kind === 'directory'
  const isExpanded = !!node.expanded
  const isActive = activePath === node.path
  const pendingRef = useRef(false)
  const lastExpandAt = useRef(0)

  const handleClick = useCallback(async () => {
    if (pendingRef.current) return
    if (isDir) {
      if (isExpanded) {
        if (Date.now() - lastExpandAt.current < 400) return
        collapseNode(node)
        return
      }
      pendingRef.current = true
      setBusy(true)
      try {
        await expandNode(node)
        lastExpandAt.current = Date.now()
      } finally {
        setBusy(false)
        pendingRef.current = false
      }
    } else {
      try {
        await openFile(node)
      } finally {
        onOpenFile?.(node.path)
      }
    }
  }, [isDir, isExpanded, node, collapseNode, expandNode, openFile, onOpenFile])

  const items: MenuItem[] = []
  if (isDir) {
    items.push(
      { label: 'Nuevo archivo', icon: 'filePlus', run: () => setCreating('file') },
      { label: 'Nueva carpeta', icon: 'folderPlus', run: () => setCreating('folder') },
    )
  }
  items.push({ label: isDir ? 'Abrir' : 'Abrir', icon: 'chevronRight', run: () => void handleClick() })
  if (isDir) {
    items.push({ label: 'Refrescar', icon: 'refresh', run: () => void expandNode(node) })
  }
  items.push({ label: 'Renombrar', icon: 'pencil', run: () => setRenaming(true) })
  items.push({ label: 'Eliminar', icon: 'trash', danger: true, run: () => void deleteItem() })

  // Menú contextual aportado por extensiones (contributes.menus → explorer/context)
  for (const m of getContributedMenu('explorer/context')) {
    items.push({
      label: m.label,
      run: () => {
        try {
          const r = executeExtensionCommand(m.command)
          if (r && typeof r.then === 'function') r.catch(() => {})
        } catch {
          // ignore
        }
      },
    })
  }

  async function deleteItem() {
    if (!window.confirm(`¿Eliminar "${node.name}"? Esta acción no se puede deshacer.`)) return
    const parent = findParentNode(node)
    if (parent) await deleteNode(parent.path, node)
  }

  function findParentNode(target: TreeNode): TreeNode | null {
    const stack: TreeNode[] = [useEditorStore.getState().root!]
    while (stack.length) {
      const cur = stack.pop()!
      if (cur.children?.some((c) => c.path === target.path)) return cur
      if (cur.children) stack.push(...cur.children)
    }
    return null
  }

  async function onRename(name: string) {
    setRenaming(false)
    if (!name.trim() || name.trim() === node.name) return
    const parent = findParentNode(node)
    if (parent) await renameNode(parent.path, node, name.trim())
  }

  async function onCreate(name: string) {
    setCreating(null)
    if (!name.trim()) return
    if (creating === 'file') await createFile(node.path, name.trim())
    else await createFolder(node.path, name.trim())
  }

  return (
    <>
      <div
        className={`tree-node${isActive ? ' tree-node--active' : ''}`}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => void handleClick()}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <span className="tree-node__chevron">
          {isDir ? (busy ? <Icons.refresh size={12} className="spin" /> : isExpanded ? <Icons.chevronDown size={12} /> : <Icons.chevronRight size={12} />) : null}
        </span>
        {isDir ? (
          <Icons.folder size={15} style={{ color: isExpanded ? 'var(--accent)' : 'var(--purple)' }} />
        ) : (
          <FileGlyph name={node.name} />
        )}
        <span className="tree-node__name">{node.name}</span>
      </div>

      {renaming && (
        <div style={{ paddingLeft: depth * 12 + 26 }}>
          <InlineRename
            initial={node.name}
            onCancel={() => setRenaming(false)}
            onConfirm={onRename}
          />
        </div>
      )}
      {creating && (
        <div style={{ paddingLeft: depth * 12 + 26 }}>
          <InlineRename
            initial=""
            placeholder={creating === 'file' ? 'nombre.archivo' : 'nombre-carpeta'}
            onCancel={() => setCreating(null)}
            onConfirm={onCreate}
          />
        </div>
      )}

      {isDir && isExpanded && node.children && (
        <div className="tree-node__children">
          {node.children.length === 0 && (
            <div className="tree-node__empty" style={{ paddingLeft: depth * 12 + 26 }}>
              Carpeta vacía
            </div>
          )}
          {node.children.map((child) => (
            <TreeView
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={items}
        />
      )}
    </>
  )
}

function FileGlyph({ name }: { name: string }) {
  const spec = iconForFile(name)
  return (
    <span
      className="file-glyph mono"
      style={{ background: `${spec.color}22`, color: spec.color, border: `1px solid ${spec.color}55` }}
    >
      {spec.name}
    </span>
  )
}

export function InlineRename({
  initial,
  onConfirm,
  onCancel,
  placeholder,
}: {
  initial: string
  onConfirm: (value: string) => void
  onCancel: () => void
  placeholder?: string
}) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onConfirm(value)
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onConfirm, onCancel])

  return (
    <input
      ref={ref}
      className="inline-input mono"
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onConfirm(value)}
    />
  )
}
