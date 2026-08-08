import { useEditorStore } from '../store/editorStore'
import { useGitStore } from '../store/gitStore'
import { Icons, type IconName } from './icons'
import { NovaLogo } from './NovaLogo'
import type { SidebarView } from '../types'

const NAV: { view: SidebarView; icon: IconName; label: string; ai?: boolean }[] = [
  { view: 'explorer', icon: 'folder', label: 'Explorador' },
  { view: 'search', icon: 'search', label: 'Buscar' },
  { view: 'git', icon: 'git', label: 'Control de código fuente' },
  { view: 'ai', icon: 'sparkles', label: 'Asistente de IA', ai: true },
  { view: 'outline', icon: 'list', label: 'Esquema' },
  { view: 'extensions', icon: 'extension', label: 'Extensiones' },
  { view: 'extviews', icon: 'folderOpen', label: 'Vistas de extensiones' },
]

export function ActivityBar() {
  const sidebarView = useEditorStore((s) => s.sidebarView)
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible)
  const setSidebarView = useEditorStore((s) => s.setSidebarView)
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar)
  const openPalette = useEditorStore((s) => s.openPalette)
  const bottomView = useEditorStore((s) => s.bottomView)
  const setBottomView = useEditorStore((s) => s.setBottomView)
  const gitChanges = useGitStore((s) => (s.available && s.isRepo ? s.changes.length : 0))

  return (
    <div className="activity-bar" role="navigation" aria-label="Barra de actividad">
      <div className="activity-bar__logo" title="Nova — Editor de código">
        <NovaLogo size={22} />
      </div>
      {NAV.map(({ view, icon, label, ai }) => {
        const Icon = Icons[icon]
        return (
          <button
            key={view}
            className={`activity-btn${ai ? ' activity-btn--ai' : ''}${sidebarVisible && sidebarView === view ? ' activity-btn--active' : ''}`}
            onClick={() => setSidebarView(view)}
            title={label}
          >
            <Icon size={20} />
            {view === 'git' && gitChanges > 0 && <span className="activity-btn__badge">{gitChanges}</span>}
          </button>
        )
      })}
      <div className="activity-bar__bottom">
        <button
          className={`activity-btn${bottomView === 'terminal' ? ' activity-btn--active' : ''}`}
          onClick={() => setBottomView(bottomView === 'terminal' ? null : 'terminal')}
          title="Terminal (Ctrl+`)"
        >
          <Icons.terminalIcon size={20} />
        </button>
        <button
          className={`activity-btn${bottomView === 'problems' ? ' activity-btn--active' : ''}`}
          onClick={() => setBottomView(bottomView === 'problems' ? null : 'problems')}
          title="Problemas (Ctrl+Shift+M)"
        >
          <Icons.warning size={20} />
        </button>
        <button className="activity-btn" onClick={() => openPalette('command')} title="Paleta de comandos (Ctrl+Shift+P)">
          <Icons.command size={20} />
        </button>
        <button className="activity-btn" onClick={toggleSidebar} title="Alternar barra lateral (Ctrl+B)">
          <Icons.panel size={20} />
        </button>
        <button
          className={`activity-btn${sidebarVisible && sidebarView === 'settings' ? ' activity-btn--active' : ''}`}
          onClick={() => setSidebarView('settings')}
          title="Ajustes"
        >
          <Icons.gear size={20} />
        </button>
      </div>
    </div>
  )
}
