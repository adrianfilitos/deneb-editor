import { useEffect, useState } from 'react'
import { isDesktop } from '../lib/electronBridge'
import { DenebLogo } from './DenebLogo'
import { Icons } from './icons'
import { MenuBar } from './MenuBar'

export function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!isDesktop()) return
    const off = window.denebDesktop?.windowControls.onMaximized(setMaximized)
    return () => off?.()
  }, [])

  if (!isDesktop()) return null
  const wc = window.denebDesktop?.windowControls

  return (
    <div className="titlebar" onDoubleClick={() => wc?.toggleMaximize()}>
      <div className="titlebar__brand">
        <DenebLogo size={16} />
        <span>Deneb</span>
      </div>
      <MenuBar />
      <div className="titlebar__drag" />
      <div className="titlebar__controls">
        <button className="titlebar__btn" title="Minimizar" onClick={() => wc?.minimize()}>
          <Icons.minus size={14} />
        </button>
        <button
          className="titlebar__btn"
          title={maximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => wc?.toggleMaximize()}
        >
          <Icons.square size={12} />
        </button>
        <button className="titlebar__btn titlebar__btn--close" title="Cerrar" onClick={() => wc?.close()}>
          <Icons.close size={14} />
        </button>
      </div>
    </div>
  )
}
