import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useExtensionStore } from '../store/extensionStore'
import { NATIVE_EXTENSIONS } from '../lib/nativeExtensions'
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

type Tab = 'explore' | 'native' | 'installed'

export function ExtensionsPanel() {
  const setStatus = useEditorStore((s) => s.setStatus)
  const installed = useExtensionStore((s) => s.installed)
  const [tab, setTab] = useState<Tab>('explore')

  return (
    <div className="extensions">
      <div className="extensions__tabs">
        <button className={`extensions__tab${tab === 'explore' ? ' extensions__tab--active' : ''}`} onClick={() => setTab('explore')}>
          Explorar
        </button>
        <button className={`extensions__tab${tab === 'native' ? ' extensions__tab--active' : ''}`} onClick={() => setTab('native')}>
          Nativas
        </button>
        <button className={`extensions__tab${tab === 'installed' ? ' extensions__tab--active' : ''}`} onClick={() => setTab('installed')}>
          Instaladas {Object.keys(installed).length > 0 && <span className="extensions__tab-count">{Object.keys(installed).length}</span>}
        </button>
      </div>

      {tab === 'explore' && <ExploreTab onStatus={setStatus} installed={installed} />}
      {tab === 'native' && <NativeTab />}
      {tab === 'installed' && <InstalledTab onStatus={setStatus} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
//  EXPLORAR — marketplace real Open VSX
// ---------------------------------------------------------------------------

function ExploreTab({
  onStatus,
  installed,
}: {
  onStatus: (msg: string, timeout?: number) => void
  installed: ReturnType<typeof useExtensionStore.getState>['installed']
}) {
  const installVsixFromBytes = useExtensionStore((s) => s.installVsixFromBytes)
  const setEnabled = useExtensionStore((s) => s.setEnabled)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OpenVSXExtension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  async function installExt(ext: OpenVSXExtension) {
    const url = downloadUrl(ext)
    if (!url) {
      onStatus('Esta extensión no tiene archivo de descarga', 3000)
      return
    }
    setBusyId(extId(ext))
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = new Uint8Array(await res.arrayBuffer())
      if (isDesktop() && window.novaDesktop?.ext) {
        await window.novaDesktop.ext.save(extFileName(ext), buf)
      }
      const parsedId = installVsixFromBytes(buf, extDisplayName(ext))
      if (!parsedId) throw new Error('No se pudo leer el .vsix (formato no compatible)')
      onStatus(`Instalada ${extDisplayName(ext)}: temas y snippets aplicados`, 3000)
    } catch (e) {
      onStatus(`Error al instalar: ${(e as Error).message}`, 3500)
    }
    setBusyId(null)
  }

  return (
    <>
      <div className="extensions__search">
        <Icons.search size={14} />
        <input placeholder="Buscar en Open VSX…" value={query} onChange={(e) => setQuery(e.target.value)} />
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

      {error && <div className="extensions__error">No se pudo contactar con Open VSX: {error}</div>}

      {loading ? (
        <div className="extensions__loading">
          <span className="spinner spinner--sm" />
          Consultando el marketplace…
        </div>
      ) : (
        <div className="extensions__list">
          {results.length === 0 && !error && <div className="extensions__empty">No se encontraron extensiones para «{query || '…'}»</div>}
          {results.map((ext) => {
            const id = extId(ext)
            const isInstalled = !!installed[id]
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
                {isInstalled ? (
                  <button
                    className="ext-card__install ext-card__install--installed"
                    onClick={() => {
                      const meta = installed[id]
                      setEnabled(id, !meta.enabled)
                      onStatus(meta.enabled ? `${extDisplayName(ext)} desactivada` : `${extDisplayName(ext)} activada`, 2000)
                    }}
                    title="Activar/desactivar"
                  >
                    <Icons.check size={12} /> {installed[id].enabled ? 'Activa' : 'Inactiva'}
                  </button>
                ) : (
                  <button className="ext-card__install" onClick={() => void installExt(ext)} disabled={busyId === id}>
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
        Instalar descarga el .vsix y aplica sus temas y snippets. Requiere conexión.
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
//  NATIVAS — extensiones de Nova que sí funcionan
// ---------------------------------------------------------------------------

function NativeTab() {
  const installed = useExtensionStore((s) => s.installed)
  const installNative = useExtensionStore((s) => s.installNative)
  const setEnabled = useExtensionStore((s) => s.setEnabled)
  const uninstall = useExtensionStore((s) => s.uninstall)

  return (
    <>
      <div className="extensions__section-title">Extensiones de Nova</div>
      <div className="extensions__list">
        {NATIVE_EXTENSIONS.map((ext) => {
          const meta = installed[ext.id]
          return (
            <div key={ext.id} className="ext-card">
              <div className="ext-card__icon" style={{ color: ext.icon, background: `${ext.icon}22`, border: `1px solid ${ext.icon}55` }}>
                <Icons.extension size={18} />
              </div>
              <div className="ext-card__body">
                <div className="ext-card__name">{ext.name}</div>
                <div className="ext-card__meta">Nova Labs · v{ext.version}</div>
                <div className="ext-card__desc">{ext.description}</div>
                <div className="ext-card__stats">
                  <span>Nativa</span>
                  <span>{ext.contrib.settings ? 'ajustes' : ext.contrib.themes ? 'tema' : ext.contrib.snippets ? 'snippets' : ext.commands ? 'comandos' : ''}</span>
                </div>
              </div>
              {meta ? (
                <div className="ext-card__actions">
                  <button
                    className={`ext-card__install${meta.enabled ? ' ext-card__install--on' : ''}`}
                    onClick={() => setEnabled(ext.id, !meta.enabled)}
                  >
                    {meta.enabled ? <Icons.check size={12} /> : <Icons.play size={12} />}
                    {meta.enabled ? 'Activa' : 'Inactiva'}
                  </button>
                  <button className="ext-card__uninstall" title="Desinstalar" onClick={() => uninstall(ext.id)}>
                    <Icons.trash size={13} />
                  </button>
                </div>
              ) : (
                <button className="ext-card__install" onClick={() => installNative(ext.id)}>
                  <Icons.download size={12} /> Instalar
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="extensions__footer">Las extensiones nativas aplican ajustes, temas, snippets, comandos y atajos.</div>
    </>
  )
}

// ---------------------------------------------------------------------------
//  INSTALADAS
// ---------------------------------------------------------------------------

function InstalledTab({ onStatus }: { onStatus: (msg: string, timeout?: number) => void }) {
  const installed = useExtensionStore((s) => s.installed)
  const setEnabled = useExtensionStore((s) => s.setEnabled)
  const uninstall = useExtensionStore((s) => s.uninstall)
  const list = Object.values(installed)

  if (list.length === 0) {
    return (
      <>
        <div className="extensions__empty" style={{ padding: 32 }}>
          <p>No hay extensiones instaladas.</p>
          <p className="extensions__hint">Prueba las nativas o instala una del marketplace de Open VSX.</p>
        </div>
        <div className="extensions__footer">Nova aplica los temas, snippets y ajustes de las extensiones activas.</div>
      </>
    )
  }

  return (
    <>
      <div className="extensions__list">
        {list.map((ext) => (
          <div key={ext.id} className="ext-card">
            <div
              className="ext-card__icon"
              style={{
                color: ext.icon || 'var(--accent)',
                background: `${ext.icon || '#82aaff'}22`,
                border: `1px solid ${ext.icon || '#82aaff'}55`,
              }}
            >
              <Icons.extension size={18} />
            </div>
            <div className="ext-card__body">
              <div className="ext-card__name">{ext.name}</div>
              <div className="ext-card__meta">
                {ext.type === 'native' ? 'Nativa' : 'VSIX'} · v{ext.version} · <span className="mono">{ext.id}</span>
              </div>
              {ext.description && <div className="ext-card__desc">{ext.description}</div>}
              <div className="ext-card__stats">
                <span>{ext.contrib.themes?.length ? `tema${ext.contrib.themes.length > 1 ? 's' : ''}` : ''}</span>
                <span>{ext.contrib.snippets?.length ? 'snippets' : ''}</span>
                <span>{ext.contrib.settings ? 'ajustes' : ''}</span>
              </div>
            </div>
            <div className="ext-card__actions">
              <button
                className={`ext-card__install${ext.enabled ? ' ext-card__install--on' : ''}`}
                onClick={() => {
                  setEnabled(ext.id, !ext.enabled)
                  onStatus(`${ext.name} ${ext.enabled ? 'desactivada' : 'activada'}`, 2000)
                }}
              >
                {ext.enabled ? <Icons.check size={12} /> : <Icons.play size={12} />}
                {ext.enabled ? 'Activa' : 'Inactiva'}
              </button>
              <button className="ext-card__uninstall" title="Desinstalar" onClick={() => uninstall(ext.id)}>
                <Icons.trash size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="extensions__footer">Desactivar revierte los cambios que la extensión aplicó al editor.</div>
    </>
  )
}
