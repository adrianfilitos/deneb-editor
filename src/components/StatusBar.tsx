import { useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useGitStore } from '../store/gitStore'
import { displayLanguage } from '../lib/languages'
import { Icons } from './icons'

export function StatusBar() {
  const activeTab = useEditorStore((s) => s.openTabs.find((t) => t.path === s.activePath))
  const cursor = useEditorStore((s) => s.cursor)
  const settings = useEditorStore((s) => s.settings)
  const statusMessage = useEditorStore((s) => s.statusMessage)
  const openPalette = useEditorStore((s) => s.openPalette)
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar)
  const setSidebarView = useEditorStore((s) => s.setSidebarView)
  const demoMode = useEditorStore((s) => s.demoMode)
  const dirtyCount = useEditorStore((s) => s.openTabs.filter((t) => t.dirty).length)
  const bottomView = useEditorStore((s) => s.bottomView)
  const setBottomView = useEditorStore((s) => s.setBottomView)
  const toggleZen = useEditorStore((s) => s.toggleZen)
  const zenMode = useEditorStore((s) => s.zenMode)
  const gitAvailable = useGitStore((s) => s.available && s.isRepo)
  const gitBranch = useGitStore((s) => s.branch)
  const gitChanges = useGitStore((s) => s.changes.length)

  const [vimState, setVimState] = useState<'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL LINE' | 'SEARCH' | 'OFF'>(
    settings.vimMode ? 'NORMAL' : 'OFF',
  )

  useEffect(() => {
    const onMode = (e: Event) => {
      const detail = (e as CustomEvent).detail as typeof vimState
      if (detail) setVimState(detail)
    }
    window.addEventListener('nova:vim-mode', onMode)
    return () => window.removeEventListener('nova:vim-mode', onMode)
  }, [])

  const showVim = settings.vimMode && vimState !== 'OFF'
  const branch = gitAvailable ? gitBranch : ''

  return (
    <div className="statusbar">
      <div className="statusbar__left">
        {!activeTab ? (
          <>
            <button className="status-item" onClick={toggleSidebar}>
              <Icons.panel size={13} />
            </button>
            <span className="status-item status-item--text">Listo</span>
          </>
        ) : (
          <>
            <button className="status-item" onClick={toggleSidebar} title="Alternar barra lateral (Ctrl+B)">
              <Icons.panel size={13} />
            </button>
            <button className="status-item" onClick={() => openPalette('command')} title="Paleta de comandos">
              <Icons.command size={13} />
            </button>
            {showVim && (
              <span className={`status-item status-item--vim status-item--vim-${vimState.toLowerCase().replace(' ', '-')}`} title="Modo Vim">
                {vimState === 'VISUAL LINE' ? '-- VISUAL LÍNEA' : vimState === 'SEARCH' ? '-- BUSCAR' : `-- ${vimState}`}
              </span>
            )}
            {branch ? (
              <button className="status-item status-item--text" onClick={() => setSidebarView('git')} title="Control de código fuente">
                <Icons.git size={12} style={{ verticalAlign: -1 }} /> {branch}
                {gitChanges > 0 && <span className="status-item__dot">{gitChanges}</span>}
              </button>
            ) : (
              <span className="status-item status-item--text">
                <Icons.git size={12} style={{ verticalAlign: -1 }} /> main
              </span>
            )}
            <span className="status-item status-item--text status-item--accent">
              {dirtyCount > 0 ? `● ${dirtyCount} sin guardar` : 'Sincronizado'}
            </span>
            {statusMessage && <span className="status-item status-item--text status-item--message">{statusMessage}</span>}
          </>
        )}
      </div>

      <div className="statusbar__right">
        {activeTab && (
          <>
            <button className="status-item" onClick={() => setSidebarView('ai')} title="Asistente de IA (Ctrl+J)">
              <Icons.sparkles size={13} style={{ color: 'var(--purple)' }} />
            </button>
            <span className="status-item status-item--text">Ln {cursor.lineNumber}, Col {cursor.column}</span>
            <span className="status-item status-item--text">{displayLanguage(activeTab.path)}</span>
            <span className="status-item status-item--text">UTF-8</span>
          </>
        )}
        <button
          className={`status-item${bottomView === 'terminal' ? ' status-item--active' : ''}`}
          onClick={() => setBottomView(bottomView === 'terminal' ? null : 'terminal')}
          title="Terminal (Ctrl+`)"
        >
          <Icons.terminalIcon size={13} />
        </button>
        <button
          className={`status-item${bottomView === 'problems' ? ' status-item--active' : ''}`}
          onClick={() => setBottomView(bottomView === 'problems' ? null : 'problems')}
          title="Problemas (Ctrl+Shift+M)"
        >
          <Icons.warning size={13} />
        </button>
        <button className={`status-item${zenMode ? ' status-item--active' : ''}`} onClick={toggleZen} title="Modo Zen (Ctrl+K Z)">
          <Icons.zap size={13} />
        </button>
        <span className="status-item status-item--text">Espacios: {settings.tabSize}</span>
        <button className="status-item" onClick={() => setSidebarView('settings')} title="Ajustes">
          <Icons.gear size={13} />
        </button>
        <span className="status-item status-item--text">{demoMode ? 'Modo demo' : 'FSA'}</span>
        <span className="status-item status-item--model mono" title={settings.ai.model}>
          <Icons.zap size={12} style={{ color: 'var(--purple)' }} /> {settings.ai.model}
        </span>
      </div>
    </div>
  )
}
