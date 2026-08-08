import { useEffect, useRef, useState } from 'react'
import { useExtUiStore } from '../store/extUiStore'
import { Icons } from './icons'

export function ExtModal() {
  const quickPick = useExtUiStore((s) => s.quickPick)
  const inputBox = useExtUiStore((s) => s.inputBox)
  const closeQuickPick = useExtUiStore((s) => s.closeQuickPick)
  const closeInputBox = useExtUiStore((s) => s.closeInputBox)
  const [query, setQuery] = useState('')
  const [value, setValue] = useState(inputBox.value || '')
  const [error, setError] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (quickPick.open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [quickPick.open])

  useEffect(() => {
    if (inputBox.open) {
      setValue(inputBox.value || '')
      setError(undefined)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [inputBox.open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (quickPick.open) closeQuickPick()
        if (inputBox.open) closeInputBox()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [quickPick.open, inputBox.open, closeQuickPick, closeInputBox])

  if (!quickPick.open && !inputBox.open) return null

  if (quickPick.open) {
    const filtered = quickPick.items.filter((i) => {
      const q = query.toLowerCase()
      return !q || i.label.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)
    })
    return (
      <div className="palette-overlay" onMouseDown={closeQuickPick}>
        <div className="palette palette--ext" onMouseDown={(e) => e.stopPropagation()}>
          {quickPick.title && <div className="palette__title">{quickPick.title}</div>}
          <div className="palette__input">
            <Icons.search size={14} />
            <input
              ref={inputRef}
              value={query}
              placeholder={quickPick.placeholder || 'Selecciona una opción…'}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="palette__list">
            {filtered.map((item) => (
              <button
                key={item.id}
                className="palette__item"
                onClick={() => {
                  quickPick.resolve?.(item)
                  closeQuickPick()
                }}
              >
                <span className="palette__label">{item.label}</span>
                {item.description && <span className="palette__desc">{item.description}</span>}
                {item.detail && <span className="palette__detail mono">{item.detail}</span>}
              </button>
            ))}
            {filtered.length === 0 && <div className="palette__empty">Sin resultados</div>}
          </div>
        </div>
      </div>
    )
  }

  const submit = () => {
    void (async () => {
      const msg = await inputBox.validate?.(value)
      if (msg) {
        setError(msg)
        return
      }
      inputBox.resolve?.(value)
      closeInputBox()
    })()
  }

  return (
    <div className="palette-overlay" onMouseDown={closeInputBox}>
      <div className="palette palette--ext" onMouseDown={(e) => e.stopPropagation()}>
        {inputBox.title && <div className="palette__title">{inputBox.title}</div>}
        {inputBox.prompt && <div className="palette__prompt">{inputBox.prompt}</div>}
        <input
          ref={inputRef}
          className="palette__input palette__input--text mono"
          type={inputBox.password ? 'password' : 'text'}
          value={value}
          placeholder="Escribe y pulsa Enter"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
        {error && <div className="palette__error">{error}</div>}
        <div className="palette__actions">
          <button className="btn btn--primary" onClick={submit}>
            Aceptar
          </button>
          <button className="btn" onClick={closeInputBox}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
