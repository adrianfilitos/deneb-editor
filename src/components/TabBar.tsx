import { useEditorStore } from '../store/editorStore'
import { iconForFile } from '../lib/fileIcons'
import { Icons } from './icons'

export function TabBar({ groupId }: { groupId?: string }) {
  const openTabs = useEditorStore((s) => s.openTabs)
  const activePath = useEditorStore((s) =>
    groupId ? s.groups.find((g) => g.id === groupId)?.activePath ?? null : s.activePath,
  )
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const closeTab = useEditorStore((s) => s.closeTab)
  const openPalette = useEditorStore((s) => s.openPalette)

  if (openTabs.length === 0) return null

  return (
    <div className="tabbar tabbar--group">
      <div className="tabbar__tabs">
        {openTabs.map((tab) => {
          const active = tab.path === activePath
          const spec = iconForFile(tab.name)
          return (
            <div
              key={tab.path}
              className={`tab${active ? ' tab--active' : ''}`}
              onClick={() => setActiveTab(tab.path)}
              onAuxClick={(e) => {
                if (e.button === 1) void closeTab(tab.path)
              }}
              onMouseDown={(e) => {
                if (e.button === 1) e.preventDefault()
              }}
              title={tab.path}
            >
              <span
                className="file-glyph mono"
                style={{ background: `${spec.color}22`, color: spec.color, border: `1px solid ${spec.color}55` }}
              >
                {spec.name}
              </span>
              <span className="tab__name">{tab.name}</span>
              <button
                className="tab__close"
                onClick={(e) => {
                  e.stopPropagation()
                  void closeTab(tab.path)
                }}
                title="Cerrar"
              >
                <Icons.close size={13} />
              </button>
              {tab.dirty && <span className="tab__dirty" />}
            </div>
          )
        })}
      </div>
      <button className="tabbar__plus" title="Abrir archivo (Ctrl+P)" onClick={() => openPalette('file')}>
        <Icons.plus size={15} />
      </button>
    </div>
  )
}
