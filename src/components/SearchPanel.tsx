import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { walkFiles, readText, writeText, type AnyHandle } from '../lib/fileSystem'
import { isBinaryName } from '../lib/fileIcons'
import type { SearchResult } from '../types'
import { Icons } from './icons'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', 'coverage', '.cache', '.vite', 'vendor'])

export function SearchPanel() {
  const root = useEditorStore((s) => s.root)
  const openFileByPath = useEditorStore((s) => s.openFileByPath)
  const setStatus = useEditorStore((s) => s.setStatus)
  const [query, setQuery] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [replacement, setReplacement] = useState('')
  const controllerRef = useRef<AbortController | null>(null)
  const handleMapRef = useRef<Map<string, AnyHandle>>(new Map())

  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const totalMatches = useMemo(() => results.reduce((n, r) => n + r.matches.length, 0), [results])

  async function runSearch() {
    if (!root?.handle || !query) {
      setResults([])
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setSearching(true)
    setResults([])
    handleMapRef.current.clear()
    const out: SearchResult[] = []
    let flags = 'g'
    if (!matchCase) flags += 'i'
    const needle = wholeWord ? `\\b${escapeRegex(query)}\\b` : regex ? query : escapeRegex(query)
    let pattern: RegExp
    try {
      pattern = new RegExp(needle, flags)
    } catch {
      setStatus('Expresión regular no válida', 2500)
      setSearching(false)
      return
    }

    await walkFiles(root.handle, async (path, handle) => {
      if (controller.signal.aborted) return
      const name = path.split('/').pop() || ''
      if (isBinaryName(name)) return
      const dirs = path.split('/').slice(0, -1)
      if (dirs.some((d) => SKIP_DIRS.has(d))) return
      handleMapRef.current.set(path, handle)
      try {
        const content = await readText(handle)
        if (content.length > 2_000_000) return
        pattern.lastIndex = 0
        const matches: SearchResult['matches'] = []
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          let m: RegExpExecArray | null
          while ((m = pattern.exec(line))) {
            matches.push({ line: i + 1, text: line.trim(), start: m.index, end: m.index + m[0].length })
            if (m[0].length === 0) pattern.lastIndex++
            if (matches.length > 200) break
          }
          if (matches.length > 200) break
        }
        if (matches.length) out.push({ path, matches })
      } catch {
        // unreadable
      }
    })

    if (!controller.signal.aborted) {
      out.sort((a, b) => a.path.localeCompare(b.path))
      setResults(out)
      setSearching(false)
      if (!out.length) setStatus('Sin resultados', 1500)
    }
  }

  async function replaceAll() {
    if (!root?.handle || !results.length) return
    if (!window.confirm(`¿Reemplazar "${query}" en ${results.length} archivo(s)?`)) return
    const controller = new AbortController()
    let count = 0
    for (const r of results) {
      if (controller.signal.aborted) break
      const node = handleMapRef.current.get(r.path)
      if (!node) continue
      try {
        const content = await readText(node)
        let flags = 'g'
        if (!matchCase) flags += 'i'
        const needle = wholeWord ? `\\b${escapeRegex(query)}\\b` : regex ? query : escapeRegex(query)
        const pattern = new RegExp(needle, flags)
        const next = content.replace(pattern, () => replacement)
        if (next !== content) {
          await writeText(node, next)
          count++
        }
      } catch {
        // skip
      }
    }
    setStatus(`Reemplazado en ${count} archivo(s)`, 2500)
    void runSearch()
  }

  function reveal(match: SearchResult['matches'][number], path: string) {
    void openFileByPath(path).then(() => {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('deneb:reveal-line', { detail: { path, line: match.line, col: match.start + 1 } }),
        )
      }, 60)
    })
  }

  return (
    <div className="search">
      <div className="search__controls">
        <div className="search__input-row">
          <Icons.search size={14} className="search__input-icon" />
          <input
            className="search__input"
            placeholder="Buscar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
          />
          {searching && <span className="spinner spinner--sm" />}
        </div>
        <div className="search__input-row search__input-row--replace">
          <Icons.refresh size={14} className="search__input-icon" />
          <input
            className="search__input"
            placeholder="Reemplazar"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          />
        </div>
        <div className="search__opts">
          <button
            className={`chip${matchCase ? ' chip--active' : ''}`}
            onClick={() => setMatchCase((v) => !v)}
            title="Coincidir mayúsculas"
          >
            Aa
          </button>
          <button
            className={`chip${wholeWord ? ' chip--active' : ''}`}
            onClick={() => setWholeWord((v) => !v)}
            title="Palabra completa"
          >
            \b
          </button>
          <button
            className={`chip${regex ? ' chip--active' : ''}`}
            onClick={() => setRegex((v) => !v)}
            title="Usar expresión regular"
          >
            .*
          </button>
          <button className="chip" onClick={() => void runSearch()} title="Buscar">
            <Icons.search size={12} />
          </button>
        </div>
        <div className="search__summary">
          <span>{totalMatches} coincidencia{totalMatches === 1 ? '' : 's'}</span>
          <span>· {results.length} archivo{results.length === 1 ? '' : 's'}</span>
        </div>
        {totalMatches > 0 && (
          <button className="search__replace-all" onClick={() => void replaceAll()}>
            <Icons.refresh size={12} /> Reemplazar todo
          </button>
        )}
      </div>

      <div className="search__results">
        {!query && <div className="search__hint">Escribe para buscar en los archivos del proyecto.</div>}
        {query && !searching && totalMatches === 0 && (
          <div className="search__hint">Sin resultados para "{query}".</div>
        )}
        {results.map((r) => (
          <div key={r.path} className="search-file">
            <div className="search-file__header" onClick={() => void openFileByPath(r.path)}>
              <Icons.file size={13} />
              <span className="search-file__name">{r.path.split('/').pop()}</span>
              <span className="search-file__path">{r.path}</span>
            </div>
            {r.matches.map((m, i) => (
              <div key={i} className="search-match" onClick={() => reveal(m, r.path)}>
                <span className="search-match__line">{m.line}</span>
                <span className="search-match__text">{highlightLine(m.text, query, matchCase)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightLine(text: string, query: string, matchCase: boolean): React.ReactNode {
  if (!query) return text
  try {
    const flags = matchCase ? 'g' : 'gi'
    const parts = text.split(new RegExp(`(${escapeRegex(query)})`, flags))
    return parts.map((p, i) =>
      parts.indexOf(p) === i && new RegExp(escapeRegex(query), matchCase ? 'g' : 'gi').test(p) && p.toLowerCase() === query.toLowerCase() ? (
        <mark key={i}>{p}</mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    )
  } catch {
    return text
  }
}
