import { useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import {
  getDebuggerState,
  subscribeDebugger,
  startDebug,
  stopDebug,
  continueDebug,
  stepOver,
  toggleBreakpoint,
  clearBreakpoints,
  type DebuggerState,
} from '../lib/debugger'
import { Icons } from './icons'

export function DebugPanel() {
  const [st, setSt] = useState<DebuggerState>(getDebuggerState())
  const activePath = useEditorStore((s) => s.activePath)

  useEffect(() => {
    return subscribeDebugger(setSt)
  }, [])

  const fileBps = st.breakpoints.filter((b) => b.path === activePath)
  const bps = st.breakpoints

  return (
    <div className="debug">
      <div className="debug__toolbar">
        {!st.running || st.stopped ? (
          <button className="debug__btn debug__btn--run" onClick={() => void startDebug()} title="Iniciar depuración (F5)">
            <Icons.play size={13} /> Iniciar
          </button>
        ) : st.paused ? (
          <>
            <button className="debug__btn" onClick={continueDebug} title="Continuar (F5)">
              <Icons.play size={13} /> Continuar
            </button>
            <button className="debug__btn" onClick={stepOver} title="Paso a paso (F10)">
              <Icons.arrowDown size={13} /> Paso
            </button>
          </>
        ) : (
          <span className="debug__running"><span className="spinner spinner--sm" /> Ejecutando…</span>
        )}
        <button className="debug__btn" onClick={stopDebug} title="Detener (Shift+F5)" disabled={!st.running}>
          <Icons.stop size={13} /> Detener
        </button>
        <button className="debug__btn debug__btn--ghost" onClick={clearBreakpoints} title="Quitar todos los breakpoints">
          <Icons.trash size={13} /> Limpiar BPs
        </button>
      </div>

      {st.error && (
        <div className="debug__error">
          <Icons.warning size={13} /> {st.error}
        </div>
      )}

      <div className="debug__section">
        <div className="debug__section-title">Breakpoints ({bps.length})</div>
        <div className="debug__bp-list">
          {bps.length === 0 && <span className="debug__empty-hint">Haz clic en el margen izquierdo del editor para añadir un breakpoint.</span>}
          {bps.map((b, i) => (
            <div key={`${b.path}:${b.line}`} className="debug__bp">
              <button className="debug__bp-remove" onClick={() => toggleBreakpoint(b.path, b.line)} title="Quitar">
                <Icons.close size={11} />
              </button>
              <code>{b.path.split('/').pop()}:{b.line}</code>
            </div>
          ))}
          {fileBps.length > 0 && (
            <button className="debug__bp-clear-file" onClick={() => fileBps.forEach((b) => toggleBreakpoint(b.path, b.line))}>
              Quitar del archivo activo
            </button>
          )}
        </div>
      </div>

      <div className="debug__section">
        <div className="debug__section-title">Pila de llamadas</div>
        {st.paused ? (
          st.frames.length ? (
            <div className="debug__frames">
              {st.frames.map((f, i) => (
                <div key={i} className={`debug__frame${i === 0 ? ' debug__frame--active' : ''}`}>
                  <code>{f.name}</code>
                  <span>{f.file.split('/').pop()}:{f.line}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="debug__empty-hint">—</span>
          )
        ) : (
          <span className="debug__empty-hint">{st.running ? 'ejecutando…' : 'pausado en un breakpoint para ver la pila'}</span>
        )}
      </div>

      <div className="debug__section">
        <div className="debug__section-title">Variables</div>
        {st.paused ? (
          st.variables.length ? (
            <div className="debug__vars">
              {st.variables.map((v, i) => (
                <div key={i} className="debug__var">
                  <code className="debug__var-name">{v.name}</code>
                  <code className="debug__var-value">{v.value}</code>
                </div>
              ))}
            </div>
          ) : (
            <span className="debug__empty-hint">Sin variables capturadas</span>
          )
        ) : (
          <span className="debug__empty-hint">—</span>
        )}
      </div>

      <div className="debug__status">
        {st.paused ? 'Pausado' : st.running ? 'Ejecutando' : st.stopped ? 'Detenido' : 'Listo'}
      </div>
    </div>
  )
}
