import { useEditorStore } from '../store/editorStore'
import { Icons, type IconName } from './icons'
import { NovaLogo } from './NovaLogo'
import type { SidebarView } from '../types'

const NAV: { view: SidebarView; icon: IconName; label: string; ai?: boolean }[] = [
  { view: 'explorer', icon: 'folder', label: 'Explorador' },
  { view: 'search', icon: 'search', label: 'Buscar' },
  { view: 'ai', icon: 'sparkles', label: 'Asistente de IA', ai: true },
  { view: 'outline', icon: 'list', label: 'Esquema' },
  { view: 'extensions', icon: 'filePlus', label: 'Extensiones' },
]

export function ActivityBar() {
  const sidebarView = useEditorStore((s) => s.sidebarView)
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible)
  const setSidebarView = useEditorStore((s) => s.setSidebarView)

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
          </button>
        )
      })}
      <div className="activity-bar__bottom">
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
