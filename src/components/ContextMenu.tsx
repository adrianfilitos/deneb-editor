import { useEffect, useRef } from 'react'
import { Icons, type IconName } from './icons'

export interface MenuItem {
  label: string
  icon?: IconName
  danger?: boolean
  shortcut?: string
  disabled?: boolean
  run: () => void
}

export interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  const menuWidth = 220
  const style: React.CSSProperties = {}
  style.left = Math.min(x, window.innerWidth - menuWidth - 8)
  style.top = Math.min(y, window.innerHeight - items.length * 34 - 24)

  return (
    <div ref={ref} className="context-menu" style={style}>
      {items.map((item, i) =>
        item.disabled ? (
          <div key={i} className="context-menu__item context-menu__item--disabled">
            {item.icon && <span className="context-menu__icon">{Icon(item.icon, 14)}</span>}
            <span className="context-menu__label">{item.label}</span>
            {item.shortcut && <span className="context-menu__shortcut">{item.shortcut}</span>}
          </div>
        ) : (
          <button
            key={i}
            className={`context-menu__item${item.danger ? ' context-menu__item--danger' : ''}`}
            onClick={() => {
              onClose()
              item.run()
            }}
          >
            {item.icon && <span className="context-menu__icon">{Icon(item.icon, 14)}</span>}
            <span className="context-menu__label">{item.label}</span>
            {item.shortcut && <span className="context-menu__shortcut">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  )
}

function Icon(name: IconName, size: number) {
  const C = Icons[name]
  return <C size={size} />
}
