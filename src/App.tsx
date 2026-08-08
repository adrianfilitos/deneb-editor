import { useEffect, useState } from 'react'
import { useEditorStore } from './store/editorStore'
import { useExtensionStore } from './store/extensionStore'
import { ActivityBar } from './components/ActivityBar'
import { Sidebar } from './components/Sidebar'
import { Breadcrumbs } from './components/Breadcrumbs'
import { EditorGroup } from './components/EditorGroup'
import { StatusBar } from './components/StatusBar'
import { CommandPalette } from './components/CommandPalette'
import { BottomPanel } from './components/BottomPanel'
import { ShortcutsModal } from './components/ShortcutsModal'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { restoreSession, persistSession } from './lib/session'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TitleBar } from './components/TitleBar'
import { ExtModal } from './components/ExtModal'
import { ExtWebviewHost } from './components/ExtWebviewHost'

export default function App() {
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible)
  const groups = useEditorStore((s) => s.groups)
  const settings = useEditorStore((s) => s.settings)
  const zenMode = useEditorStore((s) => s.zenMode)
  const dirtyCount = useEditorStore((s) => s.openTabs.filter((t) => t.dirty).length)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useGlobalShortcuts()

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    document.body.style.fontSize = `${settings.fontSize - 3}px`
  }, [settings.fontSize])

  // Auto-guardado: guarda las pestañas sucias tras un momento de inactividad
  useEffect(() => {
    if (!settings.autoSave || dirtyCount === 0) return
    const t = setTimeout(() => {
      void useEditorStore.getState().saveAll()
    }, 1200)
    return () => clearTimeout(t)
  }, [dirtyCount, settings.autoSave])

  // Session restore + persist
  useEffect(() => {
    void restoreSession()
  }, [])

  // Aplicar extensiones habilitadas al arrancar
  useEffect(() => {
    useExtensionStore.getState().init()
  }, [])

  // Mensajes de estado emitidos por extensiones (comando "deneb:status")
  useEffect(() => {
    const onStatus = (e: Event) => {
      const msg = (e as CustomEvent).detail as string | undefined
      if (msg) useEditorStore.getState().setStatus(msg, 2500)
    }
    window.addEventListener('deneb:status', onStatus)
    return () => window.removeEventListener('deneb:status', onStatus)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => persistSession(), 600)
    return () => clearTimeout(t)
  }, [groups, settings])

  // Global listener for opening the shortcuts modal
  useEffect(() => {
    const onShortcuts = () => setShortcutsOpen((v) => !v)
    window.addEventListener('deneb:show-shortcuts', onShortcuts)
    return () => window.removeEventListener('deneb:show-shortcuts', onShortcuts)
  }, [])

  return (
    <div className={`app-shell${zenMode ? ' app-shell--zen' : ''}`}>
      <TitleBar />
      <div className="app-body">
        <ActivityBar />
        {sidebarVisible && !zenMode && (
          <ErrorBoundary label="la barra lateral">
            <Sidebar />
          </ErrorBoundary>
        )}
        <main className="main-col">
          <ErrorBoundary label="la ruta del archivo">
            <Breadcrumbs />
          </ErrorBoundary>
          <div className="editor-columns">
            {groups.map((g) => (
              <ErrorBoundary key={g.id} label="un editor">
                <EditorGroup key={g.id} groupId={g.id} />
              </ErrorBoundary>
            ))}
          </div>
          <ErrorBoundary label="el panel inferior">
            <BottomPanel />
          </ErrorBoundary>
          <ErrorBoundary label="la barra de estado">
            <StatusBar />
          </ErrorBoundary>
        </main>
      </div>
      <ErrorBoundary label="la paleta de comandos">
        <CommandPalette />
      </ErrorBoundary>
      <ExtModal />
      <ExtWebviewHost />
      {shortcutsOpen && (
        <ErrorBoundary label="la referencia de atajos">
          <ShortcutsModal onClose={() => setShortcutsOpen(false)} />
        </ErrorBoundary>
      )}
    </div>
  )
}
