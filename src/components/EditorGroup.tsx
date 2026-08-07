import { useEditorStore } from '../store/editorStore'
import { TabBar } from './TabBar'
import { EditorPane } from './EditorPane'
import { WelcomeScreen } from './WelcomeScreen'
import { ErrorBoundary } from './ErrorBoundary'
import { Icons } from './icons'

export function EditorGroup({ groupId }: { groupId: string }) {
  const activePath = useEditorStore((s) => s.groups.find((g) => g.id === groupId)?.activePath ?? null)
  const groupCount = useEditorStore((s) => s.groups.length)
  const activeGroupId = useEditorStore((s) => s.activeGroupId)
  const splitGroup = useEditorStore((s) => s.splitGroup)
  const closeGroup = useEditorStore((s) => s.closeGroup)
  const isActive = activeGroupId === groupId

  return (
    <div className={`editor-group${isActive ? ' editor-group--active' : ''}`} data-group={groupId}>
      <div className="editor-group__bar">
        <div className="editor-group__tabs-wrap">
          <TabBar groupId={groupId} />
        </div>
        <div className="editor-group__actions">
          <button title="Dividir editor (Ctrl+\\)" onClick={splitGroup} disabled={!activePath}>
            <Icons.panel size={13} />
          </button>
          {groupCount > 1 && (
            <button title="Cerrar grupo" onClick={() => closeGroup(groupId)}>
              <Icons.close size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="editor-group__body">
        <ErrorBoundary label="este editor">
          {activePath ? <EditorPane groupId={groupId} /> : <WelcomeScreen compact />}
        </ErrorBoundary>
      </div>
    </div>
  )
}
