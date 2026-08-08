import { useEffect, useMemo, useState } from 'react'
import * as monaco from 'monaco-editor'
import { useEditorStore } from '../store/editorStore'
import { Icons } from './icons'
import type { editor as monacoEditor } from 'monaco-editor'

interface ProblemItem {
  path: string
  marker: monacoEditor.IMarker
}

const SEVERITY: Record<number, { label: string; icon: React.FC; cls: string }> = {
  1: { label: 'Error', icon: () => <Icons.close size={11} />, cls: 'error' },
  2: { label: 'Warning', icon: () => <Icons.warning size={11} />, cls: 'warning' },
  4: { label: 'Info', icon: () => <Icons.info size={11} />, cls: 'info' },
  8: { label: 'Hint', icon: () => <Icons.info size={11} />, cls: 'hint' },
}

export function ProblemsPanel() {
  const openTabs = useEditorStore((s) => s.openTabs)
  const activePath = useEditorStore((s) => s.activePath)
  const openFileByPath = useEditorStore((s) => s.openFileByPath)
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState<number | null>(null)

  useEffect(() => {
    if (!monaco?.editor) return
    const sub = monaco.editor.onDidChangeMarkers(() => setTick((t) => t + 1))
    return () => sub.dispose()
  }, [])

  const items = useMemo(() => {
    if (!monaco?.editor) return []
    const out: ProblemItem[] = []
    for (const tab of openTabs) {
      const uri = monaco.Uri.parse(tab.path)
      const markers = monaco.editor.getModelMarkers({ resource: uri })
      for (const marker of markers) {
        if (filter !== null && marker.severity !== filter) continue
        out.push({ path: tab.path, marker })
      }
    }
    out.sort((a, b) => a.path.localeCompare(b.path) || a.marker.startLineNumber - b.marker.startLineNumber)
    return out
  }, [tick, openTabs, filter, activePath])

  function reveal(item: ProblemItem) {
    void openFileByPath(item.path).then(() => {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('deneb:reveal-line', {
            detail: { path: item.path, line: item.marker.startLineNumber, col: item.marker.startColumn },
          }),
        )
      }, 60)
    })
  }

  if (!openTabs.length) {
    return <div className="problems__empty">Abre un archivo para ver errores y advertencias en vivo.</div>
  }

  const counts = {
    error: items.filter((i) => i.marker.severity === 1).length,
    warning: items.filter((i) => i.marker.severity === 2).length,
  }

  return (
    <div className="problems">
      <div className="problems__toolbar">
        <button
          className={`problems__filter${filter === null ? ' problems__filter--active' : ''}`}
          onClick={() => setFilter(null)}
        >
          Todo ({items.length})
        </button>
        <button
          className={`problems__filter problems__filter--error${filter === 1 ? ' problems__filter--active' : ''}`}
          onClick={() => setFilter(filter === 1 ? null : 1)}
        >
          <Icons.close size={11} /> {counts.error}
        </button>
        <button
          className={`problems__filter problems__filter--warning${filter === 2 ? ' problems__filter--active' : ''}`}
          onClick={() => setFilter(filter === 2 ? null : 2)}
        >
          <Icons.warning size={11} /> {counts.warning}
        </button>
        <span className="problems__hint">Errores y advertencias del código en tiempo real</span>
      </div>
      <div className="problems__list">
        {items.length === 0 && <div className="problems__empty">Sin problemas detectados 🎉</div>}
        {items.map((item, i) => {
          const sev = SEVERITY[item.marker.severity] || SEVERITY[2]
          const Icon = sev.icon
          return (
            <div key={i} className="problems__item" onClick={() => reveal(item)}>
              <span className={`problems__sev problems__sev--${sev.cls}`} title={sev.label}>
                <Icon />
              </span>
              <span className="problems__msg">{item.marker.message}</span>
              <span className="problems__loc mono">
                {item.path.split('/').pop()}:{item.marker.startLineNumber}:{item.marker.startColumn}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
