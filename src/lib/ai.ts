import type { AISettings, AIProvider } from '../types'

export interface ChatChunk {
  text: string
  done: boolean
  error?: string
}

export interface AIProviderPreset {
  id: AIProvider
  label: string
  baseUrl: string
  model: string
  recommended?: boolean
}

export const AI_PROVIDERS: AIProviderPreset[] = [
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', recommended: true },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-3-5-sonnet-20241022' },
  { id: 'local', label: 'Servidor local (compatible OpenAI)', baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
]

export function providerPreset(id: AIProvider): AIProviderPreset | undefined {
  return AI_PROVIDERS.find((p) => p.id === id)
}

interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

type LLMRole = 'system' | 'user' | 'assistant' | 'tool'

interface ApiToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface LLMMessage {
  role: LLMRole
  content: string
  tool_calls?: ApiToolCall[]
  tool_call_id?: string
}

export interface ToolCall {
  id: string
  name: string
  args: string
}

export interface ToolResult {
  ok: boolean
  output: string
}

export interface ChatEvent {
  text?: string
  done?: boolean
  error?: string
  toolCall?: ToolCall
  toolResult?: { id: string; name: string; ok: boolean; summary: string }
}

export type ToolExecutor = (name: string, argsJson: string) => Promise<ToolResult>

interface ToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: unknown
  }
}

const TOOLS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'Lista el contenido de un directorio del espacio de trabajo (ruta relativa a la raíz, p. ej. "." o "src").',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Ruta relativa del directorio a listar' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lee el contenido completo de un archivo del espacio de trabajo (ruta relativa).',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Ruta relativa del archivo' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Busca un patrón (regex) en los archivos del espacio de trabajo y devuelve coincidencias con número de línea.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Patrón regex a buscar' },
          path: { type: 'string', description: 'Subcarpeta relativa opcional' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Crea o reemplaza un archivo completo del espacio de trabajo (ruta relativa). Requiere aprobación del usuario.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Ruta relativa del archivo a escribir' },
          content: { type: 'string', description: 'Contenido completo del archivo' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Ejecuta un comando de shell (PowerShell en Windows, sh en macOS/Linux) dentro del espacio de trabajo y devuelve su salida. Requiere aprobación del usuario.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Comando de shell a ejecutar' } },
        required: ['command'],
      },
    },
  },
]

function normalizeBaseUrl(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//.test(b)) return `https://${b}`
  return b
}

interface TurnResult {
  text: string
  toolCalls: ToolCall[] | null
  error?: string
}

async function streamOpenAI(
  cfg: LLMConfig,
  messages: LLMMessage[],
  signal: AbortSignal,
  onText: (text: string) => void,
): Promise<TurnResult> {
  const url = `${normalizeBaseUrl(cfg.baseUrl)}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      stream: true,
      tools: TOOLS,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { text: '', toolCalls: null, error: `Error ${res.status}: ${text.slice(0, 300)}` }
  }
  if (!res.body) return { text: '', toolCalls: null, error: 'Sin cuerpo de respuesta' }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  const calls: { index: number; id?: string; name?: string; args?: string }[] = []

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const choice = json.choices?.[0]
        if (!choice) continue
        const delta = choice.delta
        if (delta?.content) {
          text += delta.content
          onText(delta.content)
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? calls.length
            let entry = calls[idx]
            if (!entry) {
              entry = { index: idx }
              calls[idx] = entry
            }
            if (tc.id) entry.id = tc.id
            if (tc.function?.name) entry.name = tc.function.name
            if (tc.function?.arguments) entry.args = (entry.args || '') + tc.function.arguments
          }
        }
      } catch {
        // ignore malformed frames
      }
    }
  }

  if (calls.length) {
    return {
      text,
      toolCalls: calls.map((c, i) => ({ id: c.id || `call_${i}`, name: c.name || '', args: c.args || '{}' })),
    }
  }
  return { text, toolCalls: null }
}

async function streamAnthropic(
  cfg: LLMConfig,
  messages: LLMMessage[],
  signal: AbortSignal,
  onChunk: (c: ChatChunk) => void,
): Promise<void> {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
  const conversation = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }))
  const url = normalizeBaseUrl(cfg.baseUrl).replace(/\/v1$/, '')
  const res = await fetch(`${url}/v1/messages`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      system: system || undefined,
      messages: conversation,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      stream: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Error ${res.status}: ${text.slice(0, 300)}`)
  }
  if (!res.body) throw new Error('Sin cuerpo de respuesta')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('event:') && !trimmed.startsWith('data:')) continue
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload) continue
      try {
        const json = JSON.parse(payload)
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          onChunk({ text: json.delta.text, done: false })
        }
        if (json.type === 'message_stop') {
          onChunk({ text: '', done: true })
        }
      } catch {
        // ignore
      }
    }
  }
  onChunk({ text: '', done: true })
}

const MAX_TOOL_TURNS = 5

function summarizeResult(r: ToolResult, name: string): string {
  if (!r.ok) return `error: ${r.output.slice(0, 120)}`
  const out = r.output.trim()
  if (out.length <= 90) return out || '(sin salida)'
  return out.slice(0, 90) + '…'
}

export async function chatWithTools(
  settings: AISettings,
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  signal: AbortSignal,
  onEvent: (e: ChatEvent) => void,
  runTool: ToolExecutor,
): Promise<void> {
  const cfg: LLMConfig = {
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
  }

  if (!cfg.apiKey) {
    onEvent({ error: 'No hay una clave de API configurada. Ábrela en Ajustes.' })
    return
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ]

  // Anthropic: chat simple sin herramientas (formato distinto de function calling)
  if (settings.provider === 'anthropic') {
    await streamAnthropic(cfg, messages, signal, (c) => {
      if (c.error) onEvent({ error: c.error })
      else if (c.text) onEvent({ text: c.text })
    })
    onEvent({ done: true })
    return
  }

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const { text, toolCalls, error } = await streamOpenAI(cfg, messages, signal, (t) => onEvent({ text: t }))
    if (error) {
      onEvent({ error })
      return
    }
    if (!toolCalls || toolCalls.length === 0) {
      onEvent({ done: true })
      return
    }
    messages.push({
      role: 'assistant',
      content: text,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.args },
      })),
    })
    for (const tc of toolCalls) {
      onEvent({ toolCall: tc })
      const result = await runTool(tc.name, tc.args)
      onEvent({ toolResult: { id: tc.id, name: tc.name, ok: result.ok, summary: summarizeResult(result, tc.name) } })
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result.output || '(sin salida)' })
    }
  }
  onEvent({ done: true })
}

export const SYSTEM_PROMPT = `Eres Nova AI, el asistente de programación integrado en Nova, un editor de código con IA.

## Tu rol
- Eres un experto en desarrollo de software: escribes, corriges, explicas, refactorizas y revisas código en cualquier lenguaje.
- Respondes SIEMPRE en el idioma del usuario (por defecto español; si el código o la pregunta están en otro idioma, responde en ese idioma).
- Sé conciso, directo y práctico. Da soluciones completas, pero sin relleno ni disclaimers innecesarios.

## Qué puedes hacer
- Analizar el código que el editor te envía como contexto (el archivo abierto y, si existe, el fragmento seleccionado). Si no recibes contexto, puedes pedir que lo incluyan o trabajar con lo que el usuario pegue.
- Responder preguntas, explicar fragmentos, detectar y corregir errores, sugerir mejoras, generar código, tests, documentación y comandos.
- Pedir aclaraciones cuando la petición sea ambigua o falte información importante.

## Herramientas disponibles
Tienes herramientas integradas para trabajar con el espacio de trabajo abierto en el editor:
- 'list_dir(ruta)' — lista el contenido de un directorio.
- 'read_file(ruta)' — lee un archivo.
- 'search_files(patrón, ruta?)' — busca texto en los archivos.
- 'write_file(ruta, contenido)' — crea o reemplaza un archivo (requiere aprobación del usuario).
- 'run_command(comando)' — ejecuta un comando de shell (requiere aprobación del usuario).

Reglas de uso:
- Usa 'list_dir', 'read_file' y 'search_files' cuando necesites información real del proyecto en lugar de inventarla.
- 'write_file' y 'run_command' solo se ejecutan si el usuario los aprueba. Si se rechazan, respeta la decisión y propón alternativas.
- No repitas un comando que ya falló; intenta un enfoque distinto.
- Nunca afirmes haber hecho algo que no hiciste: si una herramienta falla o es rechazada, dilo con claridad.

## Qué NO puedes hacer
- No tienes acceso a internet ni a otros sistemas.
- Solo ves el espacio de trabajo abierto y el contexto que el editor te pasa (archivo activo y selección).
- Si no hay un espacio de trabajo abierto o falta contexto, pídelo.

## Formato
- Muestra el código en bloques con su lenguaje (\`\`\`lenguaje).
- Si propones cambios en un archivo, indica el archivo o función afectada y muestra solo el fragmento relevante.
- Cuando sea útil, separa claramente la explicación, el código y los comandos.`

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.3,
  maxTokens: 2048,
}

export function buildContextPrompt(language: string, content: string, selection?: string): string {
  const code = selection || content
  const head = content === code ? '' : 'A continuación tienes el archivo completo como contexto y, después, el fragmento seleccionado.\n\n'
  return `${head}Archivo (${language}):\n\`\`\`${language}\n${content}\n\`\`\`\n\n${selection ? `Selección:\n\`\`\`${language}\n${selection}\n\`\`\`` : ''}`
}
