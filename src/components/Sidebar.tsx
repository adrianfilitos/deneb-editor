import { useEditorStore } from '../store/editorStore'
import { Explorer } from './Explorer'
import { SearchPanel } from './SearchPanel'
import { AIPanel } from './AIPanel'
import { ExtensionsPanel } from './ExtensionsPanel'
import { SettingsPanel } from './SettingsPanel'
import { OutlinePanel } from './OutlinePanel'
import { ErrorBoundary } from './ErrorBoundary'
import { Icons } from './icons'

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  explorer: { title: 'Explorador' },
  search: { title: 'Buscar', subtitle: 'en archivos' },
  ai: { title: 'Asistente de IA', subtitle: 'Nova AI' },
  extensions: { title: 'Extensiones' },
  settings: { title: 'Ajustes' },
  outline: { title: 'Esquema', subtitle: 'símbolos' },
}

export function Sidebar() {
  const view = useEditorStore((s) => s.sidebarView)
  const setSidebarVisible = useEditorStore((s) => s.setSidebarVisible)
  const meta = TITLES[view]

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__title">
          {meta.title}
          {meta.subtitle && <span className="sidebar__subtitle">{meta.subtitle}</span>}
        </div>
        <div className="sidebar__actions">
          <SidebarActions view={view} />
          <button
            className="sidebar__collapse"
            title="Ocultar barra lateral (Ctrl+B)"
            onClick={() => setSidebarVisible(false)}
          >
            <Icons.chevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="sidebar__body">
        <ErrorBoundary label="el explorador">
          {view === 'explorer' && <Explorer />}
          {view === 'search' && <SearchPanel />}
          {view === 'ai' && <AIPanel />}
          {view === 'extensions' && <ExtensionsPanel />}
          {view === 'settings' && <SettingsPanel />}
          {view === 'outline' && <OutlinePanel />}
        </ErrorBoundary>
      </div>
    </aside>
  )
}

function SidebarActions({ view }: { view: string }) {
  const openPalette = useEditorStore((s) => s.openPalette)
  return (
    <div className="sidebar__actions">
      {view === 'explorer' && (
        <button title="Nuevo archivo" onClick={() => openPalette('file')}>
          <Icons.plus size={14} />
        </button>
      )}
      {view === 'ai' && (
        <button title="Paleta de comandos" onClick={() => openPalette('command')}>
          <Icons.command size={14} />
        </button>
      )}
    </div>
  )
}
