import { create } from 'zustand'
import type { ChatMessage, DesktopEntry } from '../types'
import { chatWithTools, SYSTEM_PROMPT, type ToolResult } from '../lib/ai'
import { desktopFs } from '../lib/electronBridge'
import { useEditorStore } from './editorStore'

interface AIChatStore {
  messages: ChatMessage[]
  loading: boolean
  streaming: boolean
  error: string | null
  conversationTitle: string

  send: (content: string, withContext?: boolean) => Promise<void>
  resetConversation: () => void
  stopStreaming: () => void
}

let abortController: AbortController | null = null
let counter = 0

function uid(): string {
  counter += 1
  return `msg-${Date.now()}-${counter}`
}

function joinRel(base: string, rel: string): string {
  const clean = String(rel)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
  const root = base.replace(/[\\/]+$/, '')
  return clean ? `${root}/${clean}` : root
}

function displayRel(base: string, abs: string): string {
  const a = base.replace(/\\/g, '/').replace(/\/+$/, '')
  const b = abs.replace(/\\/g, '/')
  if (b.startsWith(a + '/')) return b.slice(a.length + 1)
  return b
}

async function runTool(name: string, argsJson: string): Promise<ToolResult> {
  const dFs = desktopFs()
  const state = useEditorStore.getState()
  const rootHandle = state.root?.handle as DesktopEntry | undefined
  const rootAbs = rootHandle?.absPath

  const needRoot = (): string | null => (rootAbs ? rootAbs : null)
  const unavailable = { ok: false, output: 'Herramienta no disponible sin un espacio de trabajo abierto en el escritorio.' }

  try {
    const args = JSON.parse(argsJson || '{}')
    switch (name) {
      case 'list_dir': {
        const base = needRoot()
        if (!base || !dFs) return unavailable
        const entries = await dFs.list(joinRel(base, args.path || '.'))
        const dirs = entries.filter((e) => e.kind === 'directory').map((e) => e.name + '/')
        const files = entries.filter((e) => e.kind === 'file').map((e) => e.name)
        return { ok: true, output: [...dirs.sort(), ...files.sort()].join('\n') || '(vacío)' }
      }
      case 'read_file': {
        const base = needRoot()
        if (!base || !dFs) return unavailable
        const text = await dFs.readFile(joinRel(base, String(args.path ?? '')))
        const max = 12000
        return text.length > max
          ? { ok: true, output: `${text.slice(0, max)}\n… (truncado de ${text.length} caracteres)` }
          : { ok: true, output: text }
      }
      case 'search_files': {
        const base = needRoot()
        if (!base || !dFs) return unavailable
        let re: RegExp
        try {
          re = new RegExp(String(args.pattern), 'i')
        } catch {
          return { ok: false, output: 'Patrón regex no válido.' }
        }
        const sub = args.path ? joinRel(base, String(args.path)) : base
        const files = await dFs.walk(sub)
        const out: string[] = []
        for (const f of files) {
          let text = ''
          try {
            text = await dFs.readFile(f)
          } catch {
            continue
          }
          if (text.length > 200_000) continue
          const rel = displayRel(base, f)
          const lines = text.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) out.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 150)}`)
          }
        }
        return { ok: true, output: out.slice(0, 60).join('\n') || 'Sin coincidencias.' }
      }
      case 'write_file': {
        const base = needRoot()
        if (!base || !dFs) return unavailable
        const target = joinRel(base, String(args.path ?? ''))
        const content = String(args.content ?? '')
        const ok = window.confirm(`Deneb AI quiere escribir el archivo:\n${args.path}\n\n¿Permitirlo?`)
        if (!ok) return { ok: false, output: 'El usuario rechazó escribir el archivo.' }
        await dFs.writeFile(target, content)
        return { ok: true, output: `Archivo escrito: ${args.path} (${content.length} caracteres)` }
      }
      case 'run_command': {
        const ok = window.confirm(`Deneb AI quiere ejecutar el comando:\n${args.command}\n\n¿Permitirlo?`)
        if (!ok) return { ok: false, output: 'El usuario rechazó ejecutar el comando.' }
        if (!dFs) return unavailable
        const out = await dFs.exec(needRoot() || undefined, String(args.command ?? ''))
        return { ok: true, output: out || '(sin salida)' }
      }
      default:
        return { ok: false, output: `Herramienta desconocida: ${name}` }
    }
  } catch (e) {
    return { ok: false, output: String((e as Error).message || e) }
  }
}

export const useAIChatStore = create<AIChatStore>((set, get) => ({
  messages: [],
  loading: false,
  streaming: false,
  error: null,
  conversationTitle: 'Nueva conversación',

  send: async (content, withContext) => {
    const state = get()
    if (state.streaming) return
    const { settings } = useEditorStore.getState()

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content,
      createdAt: Date.now(),
    }

    let fullUser = content
    if (withContext) {
      const { openTabs, activePath } = useEditorStore.getState()
      const tab = openTabs.find((t) => t.path === activePath)
      if (tab) {
        fullUser = `${content}\n\n[Contexto del archivo ${tab.path}]\n\`\`\`${tab.language}\n${tab.content.slice(0, 20000)}\n\`\`\``
      }
    }

    const history: { role: 'user' | 'assistant'; content: string }[] = [
      ...state.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: fullUser },
    ]
    const assistantId = uid()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      streaming: true,
    }

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      loading: true,
      streaming: true,
      error: null,
      conversationTitle: content.slice(0, 60),
    }))

    abortController = new AbortController()

    try {
      await chatWithTools(settings.ai, SYSTEM_PROMPT, history, abortController.signal, (ev) => {
        if (ev.error) {
          set({ error: ev.error, streaming: false, loading: false })
          return
        }
        if (ev.text) {
          set((s) => ({
            messages: s.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + ev.text } : m)),
          }))
          return
        }
        if (ev.toolCall) {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: `${m.content}\n\n> [herramienta] **${ev.toolCall!.name}**` } : m,
            ),
          }))
          return
        }
        if (ev.toolResult) {
          const label = ev.toolResult.ok ? '[resultado]' : '[error]'
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: `${m.content}\n> ${label} ${ev.toolResult!.summary}` }
                : m,
            ),
          }))
          return
        }
        if (ev.done) {
          set((s) => ({
            messages: s.messages.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
            loading: false,
            streaming: false,
          }))
        }
      }, runTool)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        set({ error: (e as Error).message, streaming: false, loading: false })
      } else {
        set((s) => ({
          messages: s.messages.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
          streaming: false,
          loading: false,
        }))
      }
    }
  },

  resetConversation: () => set({ messages: [], streaming: false, loading: false, error: null, conversationTitle: 'Nueva conversación' }),

  stopStreaming: () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    set((s) => ({
      messages: s.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
      streaming: false,
      loading: false,
    }))
  },
}))
