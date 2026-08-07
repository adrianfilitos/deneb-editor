import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { commands } from '../commands'
import { walkFiles } from '../lib/fileSystem'
import { iconForFile, isBinaryName } from '../lib/fileIcons'
import { Icons, type IconName } from './icons'

interface FileEntry {
  name: string
  path: string
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t.startsWith(q)) return 100 + t.length
  let qi = 0
  let score = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 10
      if (i === 0 || t[i - 1] === '/' || t[i - 1] === '.' || t[i - 1] === '-') score += 20
      qi++
    }
  }
  return qi === q.length ? score : -1
}

export function CommandPalette() {
  const palette = useEditorStore((s) => s.palette)
  const close = useEditorStore((s) => s.closePalette)
  const setQuery = useEditorStore((s) => s.setPaletteQuery)
  const openFileByPath = useEditorStore((s) => s.openFileByPath)
  const setSidebarView = useEditorStore((s) => s.setSidebarView)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = palette.open

  useEffect(() => {
    if (!open) return
    setIndex(0)
    inputRef.current?.focus()
    if (palette.mode === 'file') {
      const root = useEditorStore.getState().root
      if (!root?.handle) {
        setFiles([])
        return
      }
      let cancelled = false
      const list: FileEntry[] = []
      void walkFiles(root.handle, (path, handle) => {
        const name = path.split('/').pop() || ''
        if (isBinaryName(name)) return
        list.push({ name, path })
      }).then(() => {
        if (!cancelled) setFiles(list)
      })
      return () => {
        cancelled = true
      }
    }
  }, [open, palette.mode])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const cmds = useMemo(() => {
    if (palette.mode !== 'command') return []
    const all = commands()
    const q = palette.query.trim().toLowerCase()
    if (!q) return all
    return all
      .map((c) => ({ c, s: fuzzyScore(q, `${c.category || ''} ${c.title}`) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c)
  }, [palette.mode, palette.query])

  const fileResults = useMemo(() => {
    if (palette.mode !== 'file') return []
    const q = palette.query.trim().toLowerCase()
    if (!q) return files
    return files
      .map((f) => ({ f, s: fuzzyScore(q, f.path) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.f)
      .slice(0, 80)
  }, [palette.mode, palette.query, files])

  const results = palette.mode === 'command' ? cmds : fileResults
  const itemCount = results.length

  useEffect(() => {
    setIndex((i) => (itemCount ? Math.min(i, itemCount - 1) : 0))
  }, [itemCount, palette.query])

  if (!open) return null

  const execute = (i: number) => {
    const item = results[i]
    if (!item) return
    close()
    if (palette.mode === 'command') {
      ;(item as ReturnType<typeof commands>[number]).run()
    } else {
      const f = item as FileEntry
      setSidebarView('explorer')
      void openFileByPath(f.path)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, itemCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      execute(index)
    }
  }

  return (
    <div className="palette-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="palette" role="dialog" aria-modal="true">
        <div className="palette__input-row">
          <span className="palette__icon">
            {palette.mode === 'command' ? <Icons.command size={18} /> : <Icons.search size={18} />}
          </span>
          <input
            ref={inputRef}
            className="palette__input"
            value={palette.query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={palette.mode === 'command' ? 'Escribe el nombre de un comando…' : 'Busca un archivo por nombre…'}
          />
          {palette.query && (
            <button className="palette__clear" onClick={() => setQuery('')}>
              <Icons.close size={14} />
            </button>
          )}
        </div>
        <div className="palette__body">
          {itemCount === 0 && <div className="palette__empty">No se encontraron resultados</div>}
          {results.map((item, i) =>
            palette.mode === 'command' ? (
              <div
                key={(item as ReturnType<typeof commands>[number]).id}
                className={`palette__item${i === index ? ' palette__item--active' : ''}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => execute(i)}
              >
                <span className="palette__item-icon">
                  <CmdIcon name={(item as ReturnType<typeof commands>[number]).icon} />
                </span>
                <span className="palette__item-title">{(item as ReturnType<typeof commands>[number]).title}</span>
                <span className="palette__item-category">{(item as ReturnType<typeof commands>[number]).category}</span>
                {(item as ReturnType<typeof commands>[number]).keybinding && (
                  <kbd className="palette__kbd">{(item as ReturnType<typeof commands>[number]).keybinding}</kbd>
                )}
              </div>
            ) : (
              <div
                key={(item as FileEntry).path}
                className={`palette__item${i === index ? ' palette__item--active' : ''}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => execute(i)}
              >
                <span className="palette__file-icon">
                  <FileMini name={(item as FileEntry).name} />
                </span>
                <span className="palette__item-title">{(item as FileEntry).name}</span>
                <span className="palette__item-path">{(item as FileEntry).path}</span>
              </div>
            ),
          )}
        </div>
        <div className="palette__footer">
          <span><Icons.sparkles size={12} /> Nova AI</span>
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> ejecutar</span>
          <span><kbd>Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  )
}

function CmdIcon({ name }: { name?: string }) {
  const key = (name || 'command') as IconName
  const C = Icons[key] || Icons.command
  return <C size={15} />
}

function FileMini({ name }: { name: string }) {
  const spec = iconForFile(name)
  return (
    <span className="file-glyph mono file-glyph--sm" style={{ background: `${spec.color}22`, color: spec.color, border: `1px solid ${spec.color}55` }}>
      {spec.name}
    </span>
  )
}
