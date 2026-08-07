import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import {
  searchOpenVSX,
  iconUrl,
  downloadUrl,
  extDisplayName,
  extPublisher,
  extId,
  extFileName,
  formatDownloads,
  type OpenVSXExtension,
} from '../lib/openvsx'
import { isDesktop } from '../lib/electronBridge'
import { Icons } from './icons'

const INSTALLED_KEY = 'nova.extensions.installed.v1'

interface InstalledMeta {
  version: string
  when: number
}

function loadInstalled(): Record<string, InstalledMeta> {
  try {
    const raw = localStorage.getItem(INSTALLED_KEY)
    if (raw) return JSON.parse(raw) as Record<string, InstalledMeta>
  } catch {
    // ignore
  }
  return {}
}

function saveInstalled(map: Record<string, InstalledMeta>) {
  try {
    localStorage.setItem(INSTALLED_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function ExtensionsPanel() {
  const setStatus = useEditorStore((s) => s.setStatus)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OpenVSXExtension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [installed, setInstalled] = useState<Record<string, InstalledMeta>>(loadInstalled)
  const [busyId, setBusyId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void load(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function load(q: string) {
    setLoading(true)
    setError(null)
    try {
      const list = await searchOpenVSX(q, 30, q.trim() ? 'relevance' : 'downloadCount')
      setResults(list)
    } catch (e) {
      setError((e as Error).message)
      setResults([])
    }
    setLoading(false)
  }

  async function install(ext: OpenVSXExtension) {
    const url = downloadUrl(ext)
    if (!url) {
      setStatus('Esta extensión no tiene archivo de descarga', 3000)
      return
    }
    setBusyId(extId(ext))
    try {
      if (isDesktop() && window.novaDesktop?.ext) {
        const r = await window.novaDesktop.ext.install(url, extFileName(ext))
        if (!r.ok) {
          setStatus(`Error al instalar: ${r.error}`, 3500)
          setBusyId(null)
          return
        }
        setStatus(`Instalada ${extDisplayName(ext)} en la carpeta de extensiones`, 2500)
      } else {
        // Web: la descarga del .vsix la gestiona el navegador
        const a = document.createElement('a')
        a.href = url
        a.download = extFileName(ext)
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setStatus(`Descargando ${extFileName(ext)}…`, 2500)
      }
      const next = { ...installed, [extId(ext)]: { version: ext.version, when: Date.now() } }
      setInstalled(next)
      saveInstalled(next)
    } catch (e) {
      setStatus(`Error al instalar: ${(e as Error).message}`, 3500)
    }
    setBusyId(null)
  }

  function uninstall(ext: OpenVSXExtension) {
    const next = { ...installed }
    delete next[extId(ext)]
    setInstalled(next)
    saveInstalled(next)
    setStatus(`${extDisplayName(ext)} desinstalada`, 2000)
  }

  return (
    <div className="extensions">
      <div className="extensions__search">
        <Icons.search size={14} />
        <input
          placeholder="Buscar en el marketplace (Open VSX)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="extensions__clear" onClick={() => setQuery('')} title="Limpiar">
            <Icons.close size={13} />
          </button>
        )}
      </div>

      <div className="extensions__toolbar">
        <span className="extensions__source">
          <Icons.extension size={13} />
          Marketplace abierto · open-vsx.org
        </span>
        <button className="extensions__refresh" title="Recargar" onClick={() => void load(query)}>
          <Icons.refresh size={13} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="extensions__error">
          No se pudo contactar con Open VSX: {error}. Comprueba tu conexión e inténtalo de nuevo.
        </div>
      )}

      {loading ? (
        <div className="extensions__loading">
          <span className="spinner spinner--sm" />
          Consultando el marketplace…
        </div>
      ) : (
        <div className="extensions__list">
          {results.length === 0 && !error && (
            <div className="extensions__empty">
              No se encontraron extensiones para «{query || '…'}»
            </div>
          )}
          {results.map((ext) => {
            const id = extId(ext)
            const meta = installed[id]
            const icon = iconUrl(ext)
            return (
              <div key={id} className="ext-card">
                <div className="ext-card__icon">
                  {icon ? (
                    <img src={icon} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                  ) : (
                    <Icons.extension size={18} />
                  )}
                </div>
                <div className="ext-card__body">
                  <div className="ext-card__name">{extDisplayName(ext)}</div>
                  <div className="ext-card__meta">
                    {extPublisher(ext)} · v{ext.version}
                    {ext.preview && <span className="ext-card__preview">preview</span>}
                  </div>
                  <div className="ext-card__desc">{ext.description}</div>
                  <div className="ext-card__stats">
                    <span><Icons.download size={11} /> {formatDownloads(ext.downloadCount)}</span>
                    {ext.averageRating ? <span>★ {ext.averageRating.toFixed(1)}</span> : null}
                  </div>
                </div>
                {meta ? (
                  <button className="ext-card__install ext-card__install--installed" onClick={() => uninstall(ext)}>
                    <Icons.check size={12} /> Instalada
                  </button>
                ) : (
                  <button className="ext-card__install" onClick={() => void install(ext)} disabled={busyId === id}>
                    {busyId === id ? <span className="spinner spinner--sm" /> : <Icons.download size={12} />}
                    Instalar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="extensions__footer">
        {isDesktop()
          ? 'En el escritorio, las extensiones se guardan en la carpeta de extensiones de Nova.'
          : 'En la web, Instalar descarga el archivo .vsix a tu equipo.'}
      </div>
    </div>
  )
}
