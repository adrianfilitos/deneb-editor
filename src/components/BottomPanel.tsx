import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { Terminal } from './Terminal'
import { ProblemsPanel } from './ProblemsPanel'
import { OutputPanel } from './OutputPanel'
import { Icons } from './icons'

export function BottomPanel() {
  const view = useEditorStore((s) => s.bottomView)
  const height = useEditorStore((s) => s.bottomHeight)
  const setBottomView = useEditorStore((s) => s.setBottomView)
  const setHeight = useEditorStore((s) => s.setBottomHeight)
  const dragging = useRef<number | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current === null) return
      const h = window.innerHeight - e.clientY - 24
      setHeight(h)
    }
    const onUp = () => {
      dragging.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [setHeight])

  if (!view) return null

  return (
    <div className="bottom-panel" style={{ height }}>
      <div
        className="bottom-panel__resizer"
        onMouseDown={(e) => {
          dragging.current = e.clientY
          document.body.style.cursor = 'row-resize'
          document.body.style.userSelect = 'none'
        }}
      />
      <div className="bottom-panel__tabs">
        <button
          className={`bottom-tab${view === 'terminal' ? ' bottom-tab--active' : ''}`}
          onClick={() => setBottomView('terminal')}
        >
          <Icons.terminalIcon size={12} /> Terminal
        </button>
        <button
          className={`bottom-tab${view === 'problems' ? ' bottom-tab--active' : ''}`}
          onClick={() => setBottomView('problems')}
        >
          <Icons.warning size={12} /> Problemas
        </button>
        <button
          className={`bottom-tab${view === 'output' ? ' bottom-tab--active' : ''}`}
          onClick={() => setBottomView('output')}
        >
          <Icons.terminalIcon size={12} /> Salida
        </button>
        <div className="bottom-panel__spacer" />
        <button className="bottom-panel__close" title="Cerrar panel (Ctrl+J)" onClick={() => setBottomView(null)}>
          <Icons.close size={13} />
        </button>
      </div>
      <div className="bottom-panel__body">
        {view === 'terminal' ? <Terminal /> : view === 'problems' ? <ProblemsPanel /> : <OutputPanel />}
      </div>
    </div>
  )
}
