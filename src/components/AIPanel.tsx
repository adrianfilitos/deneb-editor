import { useEffect, useRef, useState } from 'react'
import { useAIChatStore } from '../store/aiChatStore'
import { useEditorStore } from '../store/editorStore'
import { Markdown } from './Markdown'
import { Icons } from './icons'

const QUICK_ACTIONS = [
  { label: 'Explica este código', prompt: 'Explica el código actual del archivo con detalle.' },
  { label: 'Detecta errores', prompt: 'Busca errores o bugs en el archivo actual y propón correcciones.' },
  { label: 'Hazlo más limpio', prompt: 'Sugiere mejoras para hacer el código del archivo actual más limpio y mantenible.' },
  { label: 'Genera tests', prompt: 'Genera tests unitarios para el código del archivo actual.' },
]

export function AIPanel() {
  const messages = useAIChatStore((s) => s.messages)
  const loading = useAIChatStore((s) => s.loading)
  const streaming = useAIChatStore((s) => s.streaming)
  const error = useAIChatStore((s) => s.error)
  const send = useAIChatStore((s) => s.send)
  const reset = useAIChatStore((s) => s.resetConversation)
  const stop = useAIChatStore((s) => s.stopStreaming)
  const activePath = useEditorStore((s) => s.activePath)
  const settings = useEditorStore((s) => s.settings)
  const [input, setInput] = useState('')
  const [useContext, setUseContext] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, streaming])

  async function submit(content?: string) {
    const text = (content ?? input).trim()
    if (!text) return
    setInput('')
    await send(text, useContext)
    inputRef.current?.focus()
  }

  const noApiKey = !settings.ai.apiKey

  return (
    <div className="ai">
      <div className="ai__status">
        <span className={`ai__dot${streaming ? ' ai__dot--live' : ''}`} />
        <span className="ai__model mono">{settings.ai.model}</span>
        <span className="ai__status-text">{streaming ? 'generando…' : 'conectado'}</span>
        {messages.length > 0 && (
          <button className="ai__reset" title="Nueva conversación" onClick={reset}>
            <Icons.refresh size={13} />
          </button>
        )}
      </div>

      <div className="ai__scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="ai__welcome">
            <div className="ai__welcome-logo">
              <Icons.sparkles size={28} />
            </div>
            <h3>Asistente de IA</h3>
            <p>Pregunta sobre tu código, genera código nuevo o refactoriza con ayuda de IA.</p>
            <div className="ai__quick">
              {QUICK_ACTIONS.map((a) => (
                <button key={a.label} className="ai__quick-chip" onClick={() => void submit(a.prompt)}>
                  <Icons.zap size={13} /> {a.label}
                </button>
              ))}
            </div>
            {noApiKey && (
              <div className="ai__warn">
                <Icons.warning size={14} />
                <span>Configura tu clave de API en Ajustes para empezar.</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="ai__error">
            <Icons.warning size={14} />
            <span>{error}</span>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="ai__msg ai__msg--user">
              <div className="ai__bubble-user">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="ai__msg ai__msg--assistant">
              <div className="ai__avatar">
                <Icons.sparkles size={14} />
              </div>
              <div className="ai__bubble-assistant">
                {m.streaming && m.content === '' ? (
                  <div className="ai__typing">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <Markdown text={m.content} />
                )}
                {!m.streaming && m.content && <AssistantActions content={m.content} />}
              </div>
            </div>
          ),
        )}

        {loading && !messages.some((m) => m.streaming) && (
          <div className="ai__msg ai__msg--assistant">
            <div className="ai__avatar">
              <Icons.sparkles size={14} />
            </div>
            <div className="ai__typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="ai__composer">
        <div className="ai__ctx">
          <button
            className={`ai__ctx-toggle${useContext ? ' ai__ctx-toggle--on' : ''}`}
            onClick={() => setUseContext((v) => !v)}
            title="Usar el archivo activo como contexto"
          >
            <Icons.file size={12} />
            {useContext ? (activePath ? activePath.split('/').pop() : 'contexto') : 'sin contexto'}
          </button>
        </div>
        <div className="ai__input-row">
          <textarea
            ref={inputRef}
            className="ai__input"
            rows={1}
            placeholder="Escribe tu mensaje…  (Ctrl+Enter para enviar)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void submit()
              }
            }}
          />
          {streaming || loading ? (
            <button className="ai__send ai__send--stop" onClick={stop} title="Detener">
              <Icons.stop size={16} />
            </button>
          ) : (
            <button className="ai__send" onClick={() => void submit()} title="Enviar" disabled={!input.trim()}>
              <Icons.send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AssistantActions({ content }: { content: string }) {
  const apply = () => {
    const store = useEditorStore.getState()
    const tab = store.openTabs.find((t) => t.path === store.activePath)
    if (!tab) return
    const code = extractCode(content)
    store.applyAIBuffer(tab.path, code)
    store.setStatus('Sugerencia de IA aplicada al archivo', 2500)
  }
  return (
    <div className="ai__msg-actions">
      <button onClick={apply} title="Aplicar al archivo activo">
        <Icons.filePlus size={13} /> Aplicar al editor
      </button>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(content)
        }}
        title="Copiar respuesta"
      >
        <Icons.copy size={13} /> Copiar
      </button>
    </div>
  )
}

export function extractCode(content: string): string {
  const fenced = content.match(/```[a-zA-Z]*\n([\s\S]*?)```/)
  if (fenced) return fenced[1].replace(/\n$/, '')
  return content
}
