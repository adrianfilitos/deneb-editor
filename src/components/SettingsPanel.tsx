import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { AI_PROVIDERS, providerPreset } from '../lib/ai'
import type { AIProvider } from '../types'
import { Icons } from './icons'

export function SettingsPanel() {
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
    <div className="settings">
      <div className="settings__group">
        <h4>Apariencia</h4>
        <div className="settings__row">
          <label>Tema</label>
          <div className="settings__themes">
            <button
              className={`theme-card${settings.theme === 'nova-dark' ? ' theme-card--active' : ''}`}
              onClick={() => update({ theme: 'nova-dark' })}
            >
              <span className="theme-card__preview theme-card__preview--dark" />
              <span>Nova Dark</span>
            </button>
            <button
              className={`theme-card${settings.theme === 'nova-light' ? ' theme-card--active' : ''}`}
              onClick={() => update({ theme: 'nova-light' })}
            >
              <span className="theme-card__preview theme-card__preview--light" />
              <span>Nova Light</span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings__group">
        <h4>Editor</h4>
        <div className="settings__row">
          <label>Fuente</label>
          <div className="settings__stepper">
            <button onClick={() => update({ fontSize: Math.max(10, settings.fontSize - 1) })}>−</button>
            <span className="mono">{settings.fontSize}px</span>
            <button onClick={() => update({ fontSize: Math.min(28, settings.fontSize + 1) })}>+</button>
          </div>
        </div>
        <div className="settings__row">
          <label>Tamaño de tabulación</label>
          <div className="settings__stepper">
            <button onClick={() => update({ tabSize: Math.max(2, settings.tabSize - 1) })}>−</button>
            <span className="mono">{settings.tabSize}</span>
            <button onClick={() => update({ tabSize: Math.min(8, settings.tabSize + 1) })}>+</button>
          </div>
        </div>
        <ToggleRow
          label="Minimapa"
          value={settings.minimap}
          onChange={(v) => update({ minimap: v })}
        />
        <ToggleRow
          label="Formato al guardar"
          value={settings.formatOnSave}
          onChange={(v) => update({ formatOnSave: v })}
        />
        <div className="settings__row">
          <label>Envolver línea</label>
          <div className="settings__segmented">
            <button className={settings.wordWrap === 'off' ? 'active' : ''} onClick={() => update({ wordWrap: 'off' })}>Off</button>
            <button className={settings.wordWrap === 'on' ? 'active' : ''} onClick={() => update({ wordWrap: 'on' })}>On</button>
          </div>
        </div>
        <div className="settings__row">
          <label>Números de línea</label>
          <div className="settings__segmented">
            {(['on', 'relative', 'off'] as const).map((m) => (
              <button key={m} className={settings.lineNumbers === m ? 'active' : ''} onClick={() => update({ lineNumbers: m })}>
                {m === 'on' ? 'On' : m === 'relative' ? 'Relativo' : 'Off'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings__group">
        <h4>Asistente de IA</h4>
        <div className="settings__row">
          <label>Proveedor</label>
          <select
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
                {p.label}{p.recommended ? ' — Recomendado' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="settings__row">
          <label>URL base</label>
          <input
            className="settings__input mono"
            value={settings.ai.baseUrl}
            onChange={(e) => update({ ai: { ...settings.ai, baseUrl: e.target.value } })}
            placeholder="https://api.openai.com/v1"
          />
        </div>
        <div className="settings__row">
          <label>Clave de API</label>
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
        </div>
        <div className="settings__row">
          <label>Modelo</label>
          <input
            className="settings__input mono"
            value={settings.ai.model}
            onChange={(e) => update({ ai: { ...settings.ai, model: e.target.value } })}
            placeholder="gpt-4o-mini"
          />
        </div>
        <div className="settings__row">
          <label>Temperatura · <span className="mono">{settings.ai.temperature.toFixed(2)}</span></label>
          <input
            className="settings__range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.ai.temperature}
            onChange={(e) => update({ ai: { ...settings.ai, temperature: Number(e.target.value) } })}
          />
        </div>
        <div className="settings__row">
          <label>Tokens máximos</label>
          <input
            className="settings__input mono"
            type="number"
            min={256}
            max={16000}
            value={settings.ai.maxTokens}
            onChange={(e) => update({ ai: { ...settings.ai, maxTokens: Number(e.target.value) || 2048 } })}
          />
        </div>
        <div className="settings__row">
          <label></label>
          <div className="settings__test">
            <button className="btn btn--primary" onClick={() => void testConnection()} disabled={testing || !settings.ai.apiKey}>
              {testing ? <span className="spinner spinner--sm" /> : <Icons.zap size={14} />}
              {testing ? ' Probando…' : ' Probar conexión'}
            </button>
            {testResult === 'ok' && <span className="settings__ok"><Icons.check size={13} /> Conexión correcta</span>}
            {testResult === 'fail' && <span className="settings__fail"><Icons.warning size={13} /> Error de conexión</span>}
          </div>
        </div>
        <p className="settings__note">
          Tu clave se guarda solo en este navegador (localStorage) y se envía únicamente a la URL base configurada.
        </p>
      </div>

      <div className="settings__group">
        <h4>Acerca de</h4>
        <div className="settings__about">
          <div className="settings__logo"><Icons.sparkles size={22} /></div>
          <div>
            <div className="settings__name">Nova Editor</div>
            <div className="settings__version">Versión 1.0.1-alpha · Editor de código con IA</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="settings__row">
      <label>{label}</label>
      <button className={`toggle${value ? ' toggle--on' : ''}`} onClick={() => onChange(!value)} role="switch" aria-checked={value}>
        <span className="toggle__knob" />
      </button>
    </div>
  )
}
