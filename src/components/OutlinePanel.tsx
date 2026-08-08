import { useMemo, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { extractSymbols, kindIcon, type SymbolInfo } from '../lib/symbols'
import { Icons } from './icons'

const KIND_COLOR: Record<SymbolInfo['kind'], string> = {
  function: '#c792ea',
  class: '#e0af68',
  method: '#7dcfff',
  variable: '#9ece6a',
  interface: '#82aaff',
  struct: '#f7768e',
  type: '#d5d9e6',
  enum: '#ff9e64',
  selector: '#7dcfff',
  heading: '#e0af68',
  import: '#8a93a8',
  other: '#8a93a8',
}

export function OutlinePanel() {
  const activeTab = useEditorStore((s) => s.openTabs.find((t) => t.path === s.activePath))
  const openFileByPath = useEditorStore((s) => s.openFileByPath)
  const [search, setSearch] = useState('')

  const symbols = useMemo(() => {
    if (!activeTab) return []
    return extractSymbols(activeTab.content, activeTab.language)
  }, [activeTab])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return symbols
    return symbols.filter((s) => s.name.toLowerCase().includes(q))
  }, [symbols, search])

  if (!activeTab) {
    return <div className="outline__empty">Abre un archivo para ver sus símbolos.</div>
  }
  const tab = activeTab

  function go(sym: SymbolInfo) {
    window.dispatchEvent(
      new CustomEvent('deneb:reveal-line', {
        detail: { path: tab.path, line: sym.line, col: 1 },
      }),
    )
    void openFileByPath(tab.path)
  }

  return (
    <div className="outline">
      <div className="outline__search">
        <Icons.search size={13} />
        <input
          placeholder="Filtrar símbolos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="outline__list">
        {filtered.length === 0 && <div className="outline__empty">Sin símbolos en este archivo.</div>}
        {filtered.map((sym, i) => (
          <div
            key={`${sym.line}-${i}`}
            className="outline__item"
            style={{ paddingLeft: 10 + sym.depth * 14 }}
            onClick={() => go(sym)}
          >
            <span className="outline__glyph mono" style={{ color: KIND_COLOR[sym.kind] }}>
              {kindIcon(sym.kind)}
            </span>
            <span className="outline__name">{sym.name}</span>
            <span className="outline__line mono">{sym.line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
