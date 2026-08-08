import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { AI_PROVIDERS, providerPreset } from '../lib/ai'
import { clearDenebData } from '../lib/storageReset'
import { THEME_PALETTES, THEME_IDS } from '../lib/monaco'
import { UpdatesSection } from './UpdatesSection'
import { getContributedConfigSections, type ContributedConfigProp } from '../lib/extensions/configRegistry'
import type { AIProvider, ThemeId } from '../types'
import { Icons } from './icons'
import { getConfigPath, openConfigInEditor, isNativeBackend } from '../lib/userConfig'

const THEME_NAMES: Record<ThemeId, string> = {
  'deneb-dark': 'Deneb Dark',
  'deneb-light': 'Deneb Light',
  'deneb-midnight': 'Midnight',
  'deneb-ocean': 'Ocean',
  'deneb-forest': 'Forest',
  'deneb-sunset': 'Sunset',
  'deneb-sakura': 'Sakura',
  'deneb-mono': 'Mono',
  'deneb-paper': 'Paper',
}

type SettingsTab = 'apariencia' | 'editor' | 'ia' | 'sistema' | 'extensiones' | 'archivos'

const TABS: { id: SettingsTab; label: string; icon: keyof typeof Icons }[] = [
  { id: 'apariencia', label: 'Apariencia', icon: 'sparkles' },
  { id: 'editor', label: 'Editor', icon: 'pencil' },
  { id: 'ia', label: 'Asistente de IA', icon: 'zap' },
  { id: 'sistema', label: 'Sistema', icon: 'gear' },
  { id: 'extensiones', label: 'Extensiones', icon: 'extension' },
  { id: 'archivos', label: 'settings.json', icon: 'file' },
]

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>('apariencia')

  return (
    <div className="settings">
      <div className="settings__tabs">
        {TABS.map(({ id, label, icon }) => {
          const Icon = Icons[icon]
          return (
            <button
              key={id}
              className={`settings__tab${tab === id ? ' settings__tab--active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>
      <div className="settings__scroll">
        {tab === 'apariencia' && <AppearanceTab />}
        {tab === 'editor' && <EditorTab />}
        {tab === 'ia' && <AITab />}
        {tab === 'sistema' && <SystemTab />}
        {tab === 'extensiones' && <ExtConfigTab />}
        {tab === 'archivos' && <ConfigFilesTab />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
//  APARIENCIA
// ---------------------------------------------------------------------------

function AppearanceTab() {
  const settings = useEditorStore((s) => s.settings)
  const update = useEditorStore((s) => s.updateSettings)
  return (
    <>
      <Group title="Tema" subtitle="El aspecto global de Deneb">
        <div className="settings__themes">
          {THEME_IDS.map((id) => {
            const p = THEME_PALETTES[id]
            return (
              <button
                key={id}
                className={`theme-card${settings.theme === id ? ' theme-card--active' : ''}`}
                onClick={() => update({ theme: id })}
                title={id}
              >
                <span className="theme-card__preview" style={{ background: `linear-gradient(135deg, ${p.bg} 0 60%, ${p.widgetBg} 60% 100%)` }}>
                  <span className="theme-card__preview-accent" style={{ background: p.cursor }} />
                </span>
                <span>{THEME_NAMES[id]}</span>
              </button>
            )
          })}
        </div>
      </Group>
    </>
  )
}

// ---------------------------------------------------------------------------
//  EDITOR
// ---------------------------------------------------------------------------

const CURSOR_BLINK_OPTIONS = [
  { value: 'blink', label: 'Parpadeo' },
  { value: 'smooth', label: 'Suave' },
  { value: 'phase', label: 'Fase' },
  { value: 'expand', label: 'Expandir' },
  { value: 'solid', label: 'Sólido' },
] as const

const CURSOR_STYLE_OPTIONS = [
  { value: 'line', label: 'Línea' },
  { value: 'block', label: 'Bloque' },
  { value: 'underline', label: 'Subrayado' },
] as const

const WHITESPACE_OPTIONS = [
  { value: 'none', label: 'Ninguno' },
  { value: 'selection', label: 'En selección' },
  { value: 'all', label: 'Todo' },
] as const

function EditorTab() {
  const settings = useEditorStore((s) => s.settings)
  const update = useEditorStore((s) => s.updateSettings)
  return (
    <>
      <Group title="Tipografía" subtitle="Fuente, tamaño y espaciado">
        <Row label="Tamaño de fuente">
          <Stepper value={settings.fontSize} min={10} max={28} onChange={(v) => update({ fontSize: v })} suffix="px" />
        </Row>
        <Row label="Altura de línea">
          <Stepper value={settings.lineHeight} min={1} max={2.2} step={0.1} onChange={(v) => update({ lineHeight: v })} />
        </Row>
        <Row label="Tabulación">
          <Stepper value={settings.tabSize} min={2} max={8} onChange={(v) => update({ tabSize: v })} suffix="esp" />
        </Row>
        <Row label="Ligaduras de fuente">
          <Toggle value={settings.fontLigatures} onChange={(v) => update({ fontLigatures: v })} />
        </Row>
      </Group>

      <Group title="Cursor" subtitle="Cómo se ve y se mueve el cursor">
        <Row label="Estilo">
          <Segmented options={CURSOR_STYLE_OPTIONS} value={settings.cursorStyle} onChange={(v) => update({ cursorStyle: v })} />
        </Row>
        <Row label="Parpadeo">
          <Segmented options={CURSOR_BLINK_OPTIONS} value={settings.cursorBlinking} onChange={(v) => update({ cursorBlinking: v })} />
        </Row>
      </Group>

      <Group title="Layout" subtitle="Minimapa, ajuste y numeración">
        <Row label="Envolver línea">
          <Segmented options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]} value={settings.wordWrap} onChange={(v) => update({ wordWrap: v as 'off' | 'on' })} />
        </Row>
        <Row label="Números de línea">
          <Segmented options={[{ value: 'on', label: 'On' }, { value: 'relative', label: 'Relativo' }, { value: 'off', label: 'Off' }]} value={settings.lineNumbers} onChange={(v) => update({ lineNumbers: v as 'on' | 'relative' | 'off' })} />
        </Row>
        <Row label="Minimapa">
          <Toggle value={settings.minimap} onChange={(v) => update({ minimap: v })} />
        </Row>
        <Row label="Espacios en blanco">
          <Segmented options={WHITESPACE_OPTIONS} value={settings.renderWhitespace} onChange={(v) => update({ renderWhitespace: v })} />
        </Row>
      </Group>

      <Group title="Asistencia" subtitle="Autocompletado y resaltado">
        <Row label="Sugerencias por palabra">
          <Toggle value={settings.wordBasedSuggestions} onChange={(v) => update({ wordBasedSuggestions: v })} />
        </Row>
        <Row label="Sugerencias de parámetros">
          <Toggle value={settings.parameterHints} onChange={(v) => update({ parameterHints: v })} />
        </Row>
        <Row label="Cerrar paréntesis automático">
          <Toggle value={settings.autoClosingBrackets} onChange={(v) => update({ autoClosingBrackets: v })} />
        </Row>
        <Row label="Plegado de código">
          <Toggle value={settings.folding} onChange={(v) => update({ folding: v })} />
        </Row>
      </Group>

      <Group title="Ayudas visuales" subtitle="Guías, brackets y scroll">
        <Row label="Color de brackets">
          <Toggle value={settings.bracketPairColorization} onChange={(v) => update({ bracketPairColorization: v })} />
        </Row>
        <Row label="Guías de indentación">
          <Toggle value={settings.indentGuides} onChange={(v) => update({ indentGuides: v })} />
        </Row>
        <Row label="Scroll pegajoso">
          <Toggle value={settings.stickyScroll} onChange={(v) => update({ stickyScroll: v })} />
        </Row>
        <Row label="Scroll suave">
          <Toggle value={settings.smoothScrolling} onChange={(v) => update({ smoothScrolling: v })} />
        </Row>
        <Row label="Scroll más allá del final">
          <Toggle value={settings.scrollBeyondLastLine} onChange={(v) => update({ scrollBeyondLastLine: v })} />
        </Row>
        <Row label="Zoom con la rueda (Ctrl)">
          <Toggle value={settings.mouseWheelZoom} onChange={(v) => update({ mouseWheelZoom: v })} />
        </Row>
      </Group>

      <Group title="Guardado" subtitle="Cuándo y cómo se guardan los archivos">
        <Row label="Formatear al guardar">
          <Toggle value={settings.formatOnSave} onChange={(v) => update({ formatOnSave: v })} />
        </Row>
        <Row label="Formatear al pegar">
          <Toggle value={settings.formatOnPaste} onChange={(v) => update({ formatOnPaste: v })} />
        </Row>
        <Row label="Auto-guardado">
          <Toggle value={settings.autoSave} onChange={(v) => update({ autoSave: v })} />
        </Row>
        <Row label="Preguntar al cerrar sucio">
          <Toggle value={settings.confirmBeforeClose} onChange={(v) => update({ confirmBeforeClose: v })} />
        </Row>
      </Group>

      <Group title="Vim" subtitle="Teclas de Vim en el editor">
        <Row label="Modo Vim">
          <Toggle value={settings.vimMode} onChange={(v) => update({ vimMode: v })} />
        </Row>
      </Group>
    </>
  )
}

// ---------------------------------------------------------------------------
//  IA
// ---------------------------------------------------------------------------

function AITab() {
  const settings = useEditorStore((s) => s.settings)
  const update = useEditorStore((s) => s.updateSettings)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const base = settings.ai.baseUrl.trim().replace(/\/+$/, '')
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${settings.ai.apiKey}` },
      })
      setTestResult(res.ok ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    }
    setTesting(false)
  }

  return (
    <>
      <Group title="Proveedor" subtitle="Con quién habla el asistente">
        <Row label="Proveedor">
          <select
            className="settings__input"
            value={settings.ai.provider}
            onChange={(e) => {
              const provider = e.target.value as AIProvider
              const preset = providerPreset(provider)
              update({
                ai: {
                  ...settings.ai,
                  provider,
                  baseUrl: preset?.baseUrl ?? settings.ai.baseUrl,
                  model: preset?.model ?? settings.ai.model,
                },
              })
            }}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.recommended ? ' — Recomendado' : ''}
              </option>
            ))}
          </select>
        </Row>
        <Row label="URL base">
          <input
            className="settings__input mono"
            value={settings.ai.baseUrl}
            onChange={(e) => update({ ai: { ...settings.ai, baseUrl: e.target.value } })}
            placeholder="https://api.openai.com/v1"
          />
        </Row>
        <Row label="Clave de API">
          <div className="settings__key-input">
            <input
              className="settings__input mono"
              type={showKey ? 'text' : 'password'}
              value={settings.ai.apiKey}
              onChange={(e) => update({ ai: { ...settings.ai, apiKey: e.target.value } })}
              placeholder="sk-…"
            />
            <button onClick={() => setShowKey((v) => !v)} title="Mostrar/ocultar">
              <Icons.info size={14} />
            </button>
          </div>
        </Row>
        <Row label="Modelo">
          <input
            className="settings__input mono"
            value={settings.ai.model}
            onChange={(e) => update({ ai: { ...settings.ai, model: e.target.value } })}
            placeholder="gpt-4o-mini"
          />
        </Row>
        <Row label={`Temperatura · ${settings.ai.temperature.toFixed(2)}`}>
          <input
            className="settings__range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.ai.temperature}
            onChange={(e) => update({ ai: { ...settings.ai, temperature: Number(e.target.value) } })}
          />
        </Row>
        <Row label="Tokens máximos">
          <input
            className="settings__input mono"
            type="number"
            min={256}
            max={16000}
            value={settings.ai.maxTokens}
            onChange={(e) => update({ ai: { ...settings.ai, maxTokens: Number(e.target.value) || 2048 } })}
          />
        </Row>
      </Group>
      <Group title="Conexión">
        <div className="settings__test">
          <button className="btn btn--primary" onClick={() => void testConnection()} disabled={testing || !settings.ai.apiKey}>
            {testing ? <span className="spinner spinner--sm" /> : <Icons.zap size={14} />}
            {testing ? ' Probando…' : ' Probar conexión'}
          </button>
          {testResult === 'ok' && <span className="settings__ok"><Icons.check size={13} /> Conexión correcta</span>}
          {testResult === 'fail' && <span className="settings__fail"><Icons.warning size={13} /> Error de conexión</span>}
        </div>
        <p className="settings__note">
          Tu clave se guarda solo en este navegador (localStorage) y se envía únicamente a la URL base configurada.
        </p>
      </Group>
    </>
  )
}

// ---------------------------------------------------------------------------
//  SISTEMA
// ---------------------------------------------------------------------------

function SystemTab() {
  return (
    <>
      <UpdatesSection />
      <Group title="Datos" subtitle="Restablece ajustes, sesión y extensiones">
        <div className="settings__row">
          <button
            className="btn btn--danger"
            onClick={() => {
              if (window.confirm('¿Borrar todos los datos de Deneb (ajustes, sesión y extensiones) y empezar de nuevo?')) {
                void clearDenebData().then(() => window.location.reload())
              }
            }}
          >
            <Icons.trash size={14} /> Restablecer todos los datos
          </button>
        </div>
      </Group>
      <Group title="Acerca de">
        <div className="settings__about">
          <div className="settings__logo"><Icons.sparkles size={22} /></div>
          <div>
            <div className="settings__name">Deneb Editor</div>
            <div className="settings__version">Versión 1.0.0 · Editor de código con IA</div>
          </div>
        </div>
      </Group>
    </>
  )
}

// ---------------------------------------------------------------------------
//  EXTENSIONES (configuración contribuida por extensiones)
// ---------------------------------------------------------------------------

function ExtConfigTab() {
  const settings = useEditorStore((s) => s.settings)
  const update = useEditorStore((s) => s.updateSettings)
  const sections = getContributedConfigSections()

  if (sections.length === 0) {
    return (
      <div className="settings__empty">
        <p>Sin ajustes contribuidos.</p>
        <p className="settings__note">
          Instala extensiones que declaren <span className="mono">contributes.configuration</span> (como Live Server) para
          ver sus ajustes aquí.
        </p>
      </div>
    )
  }

  const settingsMap = settings as unknown as Record<string, unknown>
  const read = (p: ContributedConfigProp) => {
    const v = settingsMap[p.key]
    return v !== undefined ? v : p.default
  }
  const write = (p: ContributedConfigProp, value: unknown) => {
    update({ [p.key]: value } as never)
  }

  return (
    <>
      {sections.map((sec) => (
        <Group key={sec.extId} title={sec.title} subtitle={sec.extId}>
          {sec.properties.map((p) => {
            const label = p.key.split('.').pop() || p.key
            const value = read(p)
            return (
              <Row key={p.key} label={`${label} · ${p.description || p.key}`}>
                {p.enum ? (
                  <select
                    className="settings__input"
                    value={String(value)}
                    onChange={(e) => write(p, e.target.value)}
                  >
                    {p.enum.map((opt) => (
                      <option key={String(opt)} value={String(opt)}>
                        {String(opt)}
                      </option>
                    ))}
                  </select>
                ) : p.type === 'boolean' ? (
                  <Toggle value={!!value} onChange={(v) => write(p, v)} />
                ) : p.type === 'number' || p.type === 'integer' ? (
                  <input
                    className="settings__input mono"
                    type="number"
                    min={p.minimum}
                    max={p.maximum}
                    value={String(value ?? '')}
                    onChange={(e) => write(p, Number(e.target.value))}
                  />
                ) : (
                  <input
                    className="settings__input mono"
                    type="text"
                    value={String(value ?? '')}
                    onChange={(e) => write(p, e.target.value)}
                  />
                )}
              </Row>
            )
          })}
        </Group>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
//  ARCHIVOS DE CONFIGURACIÓN (settings.json / keybindings.json)
// ---------------------------------------------------------------------------

function ConfigFilesTab() {
  const hasRoot = !!useEditorStore((s) => s.root)
  const paths = getConfigPath()

  return (
    <>
      <Group title="Archivos de configuración" subtitle="Ajustes y atajos en el espacio de trabajo (.deneb/)">
        <p className="settings__note">
          Los ajustes y atajos se pueden definir como archivos JSON en la carpeta <span className="mono">.deneb/</span>
          de tu espacio de trabajo. Tienen prioridad sobre la interfaz.
        </p>
        {!hasRoot ? (
          <p className="settings__note">
            Abre primero una carpeta para poder crear estos archivos en tu proyecto.
          </p>
        ) : (
          <div className="settings__row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <button className="btn btn--secondary" onClick={() => openConfigInEditor('settings')}>
              <Icons.file size={14} /> Editar settings.json
            </button>
            <button className="btn btn--secondary" onClick={() => openConfigInEditor('keybindings')}>
              <Icons.file size={14} /> Editar keybindings.json
            </button>
          </div>
        )}
      </Group>

      <Group title="Ejemplo" subtitle="Qué puedes poner">
        <pre className="settings__code">{`{
  "fontSize": 16,
  "wordWrap": "on",
  "editor.tabSize": 2,
  "liveServer.port": 5501
}`}</pre>
        <pre className="settings__code">{`[
  { "key": "ctrl+shift+s", "command": "workbench.action.files.saveAll" },
  { "key": "f6", "command": "workbench.action.debug.start" }
]`}</pre>
      </Group>

      <Group title="Snippets de usuario" subtitle="Autocompletado personalizado">
        <p className="settings__note">
          Crea un archivo <span className="mono">.deneb/snippets.json</span> con snippets como:
        </p>
        <pre className="settings__code">{`{
  "log": {
    "prefix": "log",
    "body": "console.log('$1', $2)",
    "description": "Console log"
  }
}`}</pre>
      </Group>
    </>
  )
}

// ---------------------------------------------------------------------------
//  Componentes de apoyo
// ---------------------------------------------------------------------------

function Group({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="settings__group">
      <div className="settings__group-head">
        <h4>{title}</h4>
        {subtitle && <span className="settings__group-sub">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings__row">
      <label>{label}</label>
      <div className="settings__control">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle${value ? ' toggle--on' : ''}`} onClick={() => onChange(!value)} role="switch" aria-checked={value}>
      <span className="toggle__knob" />
    </button>
  )
}

function Stepper({ value, min, max, step = 1, onChange, suffix }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step))
  return (
    <div className="settings__stepper">
      <button onClick={() => onChange(clamp(value - step))}>−</button>
      <span className="mono">{value.toFixed(step < 1 ? 1 : 0)}{suffix ? ` ${suffix}` : ''}</span>
      <button onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  )
}

function Segmented<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="settings__segmented">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
