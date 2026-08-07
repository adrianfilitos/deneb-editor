import { useEditorStore } from '../store/editorStore'
import { NovaLogo } from './NovaLogo'
import { Icons } from './icons'

export function WelcomeScreen({ compact }: { compact?: boolean }) {
  const openWorkspace = useEditorStore((s) => s.openWorkspace)
  const loadDemo = useEditorStore((s) => s.loadDemoWorkspace)
  const openPalette = useEditorStore((s) => s.openPalette)
  const setSidebarView = useEditorStore((s) => s.setSidebarView)

  if (compact) {
    return (
      <div className="welcome welcome--compact">
        <div className="welcome__center">
          <div className="welcome__logo welcome__logo--sm">
            <NovaLogo size={30} />
          </div>
          <h1 className="welcome__title">Nova</h1>
          <p className="welcome__subtitle">Editor con IA integrada</p>
          <div className="welcome__cards welcome__cards--stack">
            <button className="welcome__card" onClick={() => void openWorkspace()}>
              <span className="welcome__card-icon welcome__card-icon--blue">
                <Icons.folder size={18} />
              </span>
              <span>
                <strong>Abrir carpeta</strong>
                <small>Explora tus proyectos</small>
              </span>
            </button>
            <button className="welcome__card" onClick={() => void loadDemo()}>
              <span className="welcome__card-icon welcome__card-icon--purple">
                <Icons.sparkles size={18} />
              </span>
              <span>
                <strong>Proyecto demo</strong>
                <small>Prueba sin tus archivos</small>
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="welcome">
      <div className="welcome__center">
        <div className="welcome__logo">
          <NovaLogo size={46} />
        </div>
        <h1 className="welcome__title">Nova</h1>
        <p className="welcome__subtitle">Editor de código con IA integrada</p>

        <div className="welcome__cards">
          <button className="welcome__card" onClick={() => void openWorkspace()}>
            <span className="welcome__card-icon welcome__card-icon--blue">
              <Icons.folder size={20} />
            </span>
            <span>
              <strong>Abrir carpeta</strong>
              <small>Explora y edita tus proyectos</small>
            </span>
          </button>
          <button className="welcome__card" onClick={() => void loadDemo()}>
            <span className="welcome__card-icon welcome__card-icon--purple">
              <Icons.sparkles size={20} />
            </span>
            <span>
              <strong>Proyecto de demostración</strong>
              <small>Prueba el editor sin tus archivos</small>
            </span>
          </button>
          <button className="welcome__card" onClick={() => openPalette('command')}>
            <span className="welcome__card-icon welcome__card-icon--green">
              <Icons.command size={20} />
            </span>
            <span>
              <strong>Paleta de comandos</strong>
              <small>Accede a todo con Ctrl+Shift+P</small>
            </span>
          </button>
          <button className="welcome__card" onClick={() => setSidebarView('ai')}>
            <span className="welcome__card-icon welcome__card-icon--orange">
              <Icons.zap size={20} />
            </span>
            <span>
              <strong>Asistente de IA</strong>
              <small>Explica, refactoriza y genera código</small>
            </span>
          </button>
        </div>

        <div className="welcome__shortcuts">
          <span><kbd>Ctrl</kbd>+<kbd>P</kbd> Abrir archivo</span>
          <span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> Comandos</span>
          <span><kbd>Ctrl</kbd>+<kbd>S</kbd> Guardar</span>
          <span><kbd>Ctrl</kbd>+<kbd>J</kbd> IA</span>
          <span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> Buscar</span>
        </div>
      </div>
    </div>
  )
}
