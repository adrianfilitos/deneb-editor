import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'

interface MenuItemDef {
  label?: string
  shortcut?: string
  danger?: boolean
  sep?: boolean
  action?: () => void
}

const MENUS: { label: string; items: MenuItemDef[] }[] = [
  {
    label: 'Archivo',
    items: [
      { label: 'Abrir carpeta…', shortcut: 'Ctrl+O', action: () => void useEditorStore.getState().openWorkspace() },
      { label: 'Guardar', shortcut: 'Ctrl+S', action: () => void useEditorStore.getState().saveTab() },
      { label: 'Guardar todo', shortcut: 'Ctrl+Shift+S', action: () => void useEditorStore.getState().saveAll() },
      { label: 'Recargar ventana', action: () => window.denebDesktop?.menu.reload() },
      { sep: true },
      { label: 'Salir', action: () => window.denebDesktop?.windowControls.close() },
    ],
  },
  {
    label: 'Editar',
    items: [
      { label: 'Deshacer', shortcut: 'Ctrl+Z', action: () => window.denebDesktop?.menu.undo() },
      { label: 'Rehacer', shortcut: 'Ctrl+Y', action: () => window.denebDesktop?.menu.redo() },
      { sep: true },
      { label: 'Cortar', shortcut: 'Ctrl+X', action: () => window.denebDesktop?.menu.cut() },
      { label: 'Copiar', shortcut: 'Ctrl+C', action: () => window.denebDesktop?.menu.copy() },
      { label: 'Pegar', shortcut: 'Ctrl+V', action: () => window.denebDesktop?.menu.paste() },
      { label: 'Seleccionar todo', shortcut: 'Ctrl+A', action: () => window.denebDesktop?.menu.selectAll() },
    ],
  },
  {
    label: 'Ver',
    items: [
      { label: 'Alternar barra lateral', shortcut: 'Ctrl+B', action: () => useEditorStore.getState().toggleSidebar() },
      {
        label: 'Terminal',
        shortcut: 'Ctrl+`',
        action: () => {
          const s = useEditorStore.getState()
          s.setBottomView(s.bottomView === 'terminal' ? null : 'terminal')
        },
      },
      {
        label: 'Problemas',
        shortcut: 'Ctrl+Shift+M',
        action: () => {
          const s = useEditorStore.getState()
          s.setBottomView(s.bottomView === 'problems' ? null : 'problems')
        },
      },
      { label: 'Asistente de IA', shortcut: 'Ctrl+J', action: () => useEditorStore.getState().setSidebarView('ai') },
      { label: 'Modo Zen', shortcut: 'Ctrl+K Z', action: () => useEditorStore.getState().toggleZen() },
      { sep: true },
      { label: 'Acercar', action: () => window.denebDesktop?.menu.zoomIn() },
      { label: 'Alejar', action: () => window.denebDesktop?.menu.zoomOut() },
      { label: 'Restablecer zoom', action: () => window.denebDesktop?.menu.zoomReset() },
      { label: 'Pantalla completa', shortcut: 'F11', action: () => window.denebDesktop?.menu.toggleFullscreen() },
      { sep: true },
      { label: 'Herramientas de desarrollo', action: () => window.denebDesktop?.menu.devtools() },
    ],
  },
  {
    label: 'Ayuda',
    items: [
      {
        label: 'Referencia de atajos',
        shortcut: 'Ctrl+K Ctrl+S',
        action: () => window.dispatchEvent(new Event('deneb:show-shortcuts')),
      },
      { label: 'Acerca de Deneb', action: () => window.denebDesktop?.menu.about() },
    ],
  },
]

export function MenuBar() {
  const [open, setOpen] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="menubar" ref={ref}>
      {MENUS.map((menu) => (
        <div className="menubar__item" key={menu.label}>
          <button
            className={`menubar__label${open === menu.label ? ' menubar__label--open' : ''}`}
            onClick={() => setOpen(open === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>
          {open === menu.label && (
            <div className="menubar__dropdown" role="menu">
              {menu.items.map((item, i) =>
                item.sep ? (
                  <div key={i} className="menubar__separator" />
                ) : (
                  <button
                    key={i}
                    role="menuitem"
                    className={`menubar__entry${item.danger ? ' menubar__entry--danger' : ''}`}
                    onClick={() => {
                      setOpen(null)
                      item.action?.()
                    }}
                  >
                    <span className="menubar__entry-label">{item.label}</span>
                    {item.shortcut && <span className="menubar__entry-shortcut">{item.shortcut}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
