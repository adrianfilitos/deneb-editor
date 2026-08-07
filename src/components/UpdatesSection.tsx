import { useEffect } from 'react'
import { useUpdateStore } from '../store/updateStore'
import { Icons } from './icons'

export function UpdatesSection() {
  const s = useUpdateStore()
  const check = useUpdateStore((st) => st.check)
  const install = useUpdateStore((st) => st.install)

  useEffect(() => {
    void useUpdateStore.getState().init()
  }, [])

  return (
    <div className="settings__group">
      <h4>Actualizaciones</h4>

      {s.supported ? (
        <>
          <div className="settings__row">
            <label>Versión instalada</label>
            <span className="settings__version-text mono">{s.version}</span>
          </div>

          {s.status === 'checking' && (
            <div className="settings__update-status">
              <span className="spinner spinner--sm" />
              Buscando actualizaciones…
            </div>
          )}

          {s.status === 'not-available' && (
            <div className="settings__update-status settings__update-status--ok">
              <Icons.check size={13} /> Estás al día (v{s.version})
            </div>
          )}

          {s.status === 'available' && (
            <div className="settings__update-status">
              <Icons.download size={13} /> Nueva versión <b>{s.newVersion}</b> disponible, descargando…
            </div>
          )}

          {s.status === 'downloading' && (
            <div className="settings__update-status">
              <span className="spinner spinner--sm" />
              Descargando {s.newVersion}… {s.percent ?? 0}%
              <div className="settings__progress">
                <div className="settings__progress-fill" style={{ width: `${s.percent ?? 0}%` }} />
              </div>
            </div>
          )}

          {s.status === 'downloaded' && (
            <div className="settings__update-status settings__update-status--ok">
              <Icons.check size={13} /> v{s.newVersion} lista para instalar
            </div>
          )}

          {s.status === 'error' && (
            <div className="settings__update-status settings__update-status--error">
              <Icons.warning size={13} /> {s.error}
            </div>
          )}

          <div className="settings__row">
            <label></label>
            <div className="settings__test">
              {s.status === 'downloaded' ? (
                <button className="btn btn--primary" onClick={install}>
                  <Icons.download size={14} /> Instalar y reiniciar
                </button>
              ) : (
                <button className="btn" onClick={check} disabled={s.status === 'checking'}>
                  Buscar actualizaciones
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="settings__note">
          {s.portable
            ? 'La versión portable no se actualiza automáticamente. Descarga la nueva versión desde GitHub Releases.'
            : 'Las actualizaciones automáticas están disponibles en la versión instalada de escritorio (no en la web).'}
        </p>
      )}
    </div>
  )
}
