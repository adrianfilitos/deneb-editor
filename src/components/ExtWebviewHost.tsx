import { useExtUiStore } from '../store/extUiStore'
import { Icons } from './icons'

export function ExtWebviewHost() {
  const webviews = useExtUiStore((s) => s.webviews)
  const setWebviewOpen = useExtUiStore((s) => s.setWebviewOpen)

  const list = Object.values(webviews).filter((w) => w.open)
  if (list.length === 0) return null

  return (
    <>
      {list.map((w) => (
        <div key={w.id} className="ext-webview">
          <div className="ext-webview__bar">
            <span className="ext-webview__title">{w.title}</span>
            <button className="ext-webview__close" title="Cerrar" onClick={() => setWebviewOpen(w.id, false)}>
              <Icons.close size={13} />
            </button>
          </div>
          <iframe
            className="ext-webview__frame"
            sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
            srcDoc={w.html}
          />
        </div>
      ))}
    </>
  )
}
