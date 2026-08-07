import { useEffect, useState } from 'react'
import { Icons } from './icons'

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'General',
    items: [
      ['Ctrl+Shift+P / F1', 'Paleta de comandos'],
      ['Ctrl+P', 'Abrir archivo (quick open)'],
      ['Ctrl+Shift+F', 'Buscar en archivos'],
      ['Ctrl+,', 'Ajustes'],
      ['Ctrl+B', 'Alternar barra lateral'],
      ['Ctrl+Z', 'Modo Zen'],
      ['Ctrl+K Ctrl+S', 'Referencia de atajos'],
    ],
  },
  {
    title: 'Archivos',
    items: [
      ['Ctrl+S', 'Guardar'],
      ['Ctrl+Shift+S', 'Guardar todo'],
      ['Ctrl+W', 'Cerrar pestaña'],
      ['Ctrl+Shift+W', 'Cerrar todas las pestañas'],
      ['Ctrl+\\', 'Dividir editor'],
    ],
  },
  {
    title: 'Vistas',
    items: [
      ['Ctrl+Shift+E', 'Explorador'],
      ['Ctrl+Shift+M', 'Panel de problemas'],
      ['Ctrl+`', 'Terminal'],
      ['Ctrl+J', 'Asistente de IA'],
      ['Ctrl+Shift+J', 'IA: nueva conversación'],
    ],
  },
  {
    title: 'IA',
    items: [
      ['Ctrl+J', 'Abrir asistente de IA'],
      ['Ctrl+Shift+I', 'Aplicar sugerencia de IA al archivo'],
      ['Botón derecho', 'Acciones IA sobre la selección'],
      ['Escribir', 'Sugerencias ghost-text en vivo'],
    ],
  },
  {
    title: 'Editor',
    items: [
      ['Ctrl+F', 'Buscar en el archivo'],
      ['Ctrl+H', 'Reemplazar en el archivo'],
      ['Ctrl+G', 'Ir a línea'],
      ['Alt+↑ / Alt+↓', 'Mover línea'],
      ['Shift+Alt+↓', 'Duplicar línea'],
      ['Ctrl+D', 'Añadir siguiente coincidencia'],
      ['Ctrl+Shift+K', 'Eliminar línea'],
    ],
  },
]

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const query = q.trim().toLowerCase()

  return (
    <div className="shortcuts-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="shortcuts">
        <div className="shortcuts__header">
          <h3><Icons.command size={16} /> Referencia de atajos</h3>
          <button className="shortcuts__close" onClick={onClose}>
            <Icons.close size={15} />
          </button>
        </div>
        <div className="shortcuts__search">
          <Icons.search size={14} />
          <input autoFocus placeholder="Filtrar atajos…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="shortcuts__body">
          {GROUPS.filter((g) => !query || g.items.some(([k, d]) => (k + d).toLowerCase().includes(query))).map((g) => (
            <div key={g.title} className="shortcuts__group">
              <div className="shortcuts__group-title">{g.title}</div>
              {g.items
                .filter(([k, d]) => !query || (k + d).toLowerCase().includes(query))
                .map(([k, d]) => (
                  <div key={k} className="shortcuts__row">
                    <div className="shortcuts__keys">
                      {k.split(' ').map((part, i) => (
                        <span key={i}>
                          {part.includes('+') ? (
                            part.split('+').map((kk, j) => (
                              <span key={j}>
                                <kbd>{kk}</kbd>
                                {j < part.split('+').length - 1 && <span className="shortcuts__plus">+</span>}
                              </span>
                            ))
                          ) : (
                            <kbd>{part}</kbd>
                          )}
                          {i < k.split(' ').length - 1 && <span className="shortcuts__space">luego</span>}
                        </span>
                      ))}
                    </div>
                    <div className="shortcuts__desc">{d}</div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
