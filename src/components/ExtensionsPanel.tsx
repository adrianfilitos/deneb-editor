import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { Icons } from './icons'

interface ExtDef {
  id: string
  name: string
  publisher: string
  version: string
  description: string
  icon: string
  color: string
  installs: string
  rating: number
  action?: 'formatOnSave' | 'minimap' | 'wordWrap' | 'aiProvider'
}

const FEATURED: ExtDef[] = [
  {
    id: 'nova.auto-format',
    name: 'Auto-Formato',
    publisher: 'Nova Labs',
    version: '1.2.0',
    description: 'Formatea automáticamente el código al guardar el archivo.',
    icon: 'sparkles',
    color: '#82aaff',
    installs: '2.1M',
    rating: 4.8,
    action: 'formatOnSave',
  },
  {
    id: 'nova.ai-copilot',
    name: 'Copilot de Código',
    publisher: 'Nova AI',
    version: '2.0.1',
    description: 'Sugerencias de código en tiempo real con IA mientras escribes.',
    icon: 'zap',
    color: '#c792ea',
    installs: '5.3M',
    rating: 4.9,
    action: 'aiProvider',
  },
  {
    id: 'nova.minimap',
    name: 'Minimapa Mejorado',
    publisher: 'Nova Labs',
    version: '3.1.0',
    description: 'Mapa general del archivo con resaltado de código y navegación.',
    icon: 'file',
    color: '#7dcfff',
    installs: '1.8M',
    rating: 4.6,
    action: 'minimap',
  },
  {
    id: 'nova.word-wrap',
    name: 'Ajuste de Línea',
    publisher: 'Nova Labs',
    version: '1.0.4',
    description: 'Envuelve automáticamente las líneas largas en todos los editores.',
    icon: 'panel',
    color: '#9ece6a',
    installs: '890K',
    rating: 4.5,
    action: 'wordWrap',
  },
  {
    id: 'nova.theme-nova',
    name: 'Tema Nova Dark+',
    publisher: 'Nova Theme',
    version: '4.3.2',
    description: 'Tema oscuro moderno con colores vibrantes y alto contraste.',
    icon: 'sparkles',
    color: '#f7768e',
    installs: '1.2M',
    rating: 4.7,
  },
  {
    id: 'nova.language-packs',
    name: 'Paquetes de Lenguaje ES',
    publisher: 'Microsoft-like',
    version: '1.94.0',
    description: 'Traduce la interfaz a más de 100 idiomas.',
    icon: 'git',
    color: '#e0af68',
    installs: '12M',
    rating: 4.9,
  },
  {
    id: 'nova.error-lens',
    name: 'Error Lens',
    publisher: 'Community',
    version: '3.18.0',
    description: 'Muestra los errores y advertencias en línea, junto al código.',
    icon: 'warning',
    color: '#f7768e',
    installs: '4.4M',
    rating: 4.8,
  },
  {
    id: 'nova.prettier',
    name: 'Prettier',
    publisher: 'Prettier Team',
    version: '10.5.0',
    description: 'Formateador de código opinado para JS, TS, CSS y más.',
    icon: 'bold',
    color: '#e44d26',
    installs: '9.2M',
    rating: 4.9,
  },
]

function ExtIcon({ name }: { name: string }) {
  const C = Icons[name as keyof typeof Icons] || Icons.file
  return <C size={18} />
}

export function ExtensionsPanel() {
  const [installed, setInstalled] = useState<Set<string>>(() => new Set(['nova.theme-nova', 'nova.language-packs']))
  const updateSettings = useEditorStore((s) => s.updateSettings)

  function toggle(ext: ExtDef) {
    const next = new Set(installed)
    if (next.has(ext.id)) {
      next.delete(ext.id)
    } else {
      next.add(ext.id)
      if (ext.action === 'formatOnSave') updateSettings({ formatOnSave: true })
      if (ext.action === 'minimap') updateSettings({ minimap: true })
      if (ext.action === 'wordWrap') updateSettings({ wordWrap: 'on' })
    }
    setInstalled(next)
  }

  return (
    <div className="extensions">
      <div className="extensions__search">
        <Icons.search size={14} />
        <input placeholder="Buscar extensiones en el marketplace…" />
      </div>
      <div className="extensions__section-title">Popular</div>
      <div className="extensions__list">
        {FEATURED.map((ext) => {
          const isInstalled = installed.has(ext.id)
          return (
            <div key={ext.id} className="ext-card">
              <div className="ext-card__icon" style={{ background: `${ext.color}22`, color: ext.color, border: `1px solid ${ext.color}55` }}>
                <ExtIcon name={ext.icon} />
              </div>
              <div className="ext-card__body">
                <div className="ext-card__name">{ext.name}</div>
                <div className="ext-card__meta">
                  {ext.publisher} · v{ext.version}
                </div>
                <div className="ext-card__desc">{ext.description}</div>
                <div className="ext-card__stats">
                  <span>{ext.installs}</span>
                  <span>★ {ext.rating.toFixed(1)}</span>
                </div>
              </div>
              <button
                className={`ext-card__install${isInstalled ? ' ext-card__install--installed' : ''}`}
                onClick={() => toggle(ext)}
              >
                {isInstalled ? <><Icons.check size={12} /> Instalada</> : 'Instalar'}
              </button>
            </div>
          )
        })}
      </div>
      <div className="extensions__footer">Marketplace de Nova · 84.201 extensiones disponibles</div>
    </div>
  )
}
