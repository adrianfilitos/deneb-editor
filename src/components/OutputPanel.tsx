import { useExtUiStore } from '../store/extUiStore'
import { Icons } from './icons'

export function OutputPanel() {
  const outputs = useExtUiStore((s) => s.outputs)
  const active = useExtUiStore((s) => s.activeOutput)
  const showOutput = useExtUiStore((s) => s.showOutput)
  const clearOutput = useExtUiStore((s) => s.clearOutput)
  const ids = Object.keys(outputs)
  const current = (active && outputs[active] ? active : ids[0]) || null

  return (
    <div className="output">
      <div className="output__tabs">
        {ids.map((id) => (
          <button
            key={id}
            className={`output__tab${current === id ? ' output__tab--active' : ''}`}
            onClick={() => showOutput(id)}
          >
            {id}
          </button>
        ))}
        {current && (
          <button className="output__clear" title="Limpiar" onClick={() => clearOutput(current)}>
            <Icons.trash size={12} /> Limpiar
          </button>
        )}
      </div>
      <pre className="output__body mono">{current ? (outputs[current].lines.join('\n') || ' ') : 'Sin salida.'}</pre>
    </div>
  )
}
