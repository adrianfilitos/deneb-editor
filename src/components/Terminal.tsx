import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { executeCommand, COMMANDS } from '../lib/terminal'
import { isDesktop, desktopPlatform } from '../lib/electronBridge'
import type { DesktopEntry } from '../types'
import { Icons } from './icons'

interface Line {
  id: number
  text: string
  isInput?: boolean
}

let lineCounter = 0

const COLORS: Record<string, string> = {
  '30': '#4a4f5c', '31': '#f7768e', '32': '#9ece6a', '33': '#e0af68',
  '34': '#82aaff', '35': '#c792ea', '36': '#7dcfff', '37': '#d5d9e6',
  '90': '#6b7280', '91': '#ff7a93', '92': '#b4e07a', '93': '#ffd087',
  '94': '#97b8ff', '95': '#d3a8f2', '96': '#8fdfff',
}

function parseAnsi(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const re = /\x1b\[([0-9;]*)m/g
  let last = 0
  let bold = false
  let fg: string | null = null
  let k = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(<span key={k++} style={{ fontWeight: bold ? 700 : 400, color: fg || undefined }}>{text.slice(last, m.index)}</span>)
    const codes = m[1].split(';')
    for (const c of codes) {
      if (c === '0') { bold = false; fg = null }
      else if (c === '1') bold = true
      else if (COLORS[c]) fg = COLORS[c]
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(<span key={k++} style={{ fontWeight: bold ? 700 : 400, color: fg || undefined }}>{text.slice(last)}</span>)
  return nodes
}

export function Terminal() {
  return isDesktop() ? <PowerShellTerminal /> : <DenebShell />
}

function PowerShellTerminal() {
  const [lines, setLines] = useState<Line[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [dead, setDead] = useState(false)
  const bufRef = useRef('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const root = useEditorStore((s) => s.root)

  const workspaceCwd = useCallback((): string | undefined => {
    const h = root?.handle as DesktopEntry | undefined
    return h?.absPath
  }, [root])

  const start = useCallback(() => {
    setLines([])
    bufRef.current = ''
    setDead(false)
    try {
      window.denebDesktop?.term.start(workspaceCwd()).catch(() => {})
    } catch {
      /* sin IPC: la terminal no es funcional en este entorno */
    }
  }, [workspaceCwd])

  useEffect(() => {
    const desktop = window.denebDesktop
    if (!desktop?.term) return
    const offData = desktop.term.onData((d) => pushChunk(d))
    const offExit = desktop.term.onExit(() => setDead(true))
    start()
    return () => {
      offData()
      offExit()
      try {
        void desktop.term.kill().catch(() => {})
      } catch {
        /* ignore */
      }
    }
  }, [start])

  function pushChunk(chunk: string) {
    bufRef.current += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const parts = bufRef.current.split('\n')
    bufRef.current = parts.pop() || ''
    if (parts.length) {
      setLines((ls) => [...ls, ...parts.map((t) => ({ id: lineCounter++, text: t }))])
    }
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lines, input])

  function send(cmd: string) {
    const desktop = window.denebDesktop
    if (dead) {
      if (!cmd.trim()) return
      start()
      return
    }
    const trimmed = cmd.replace(/\r/g, '')
    if (!trimmed) {
      try { void desktop?.term.write('\r\n').catch(() => {}) } catch {}
      setInput('')
      return
    }
    if (trimmed.toLowerCase() === 'cls' || trimmed.toLowerCase() === 'clear') {
      setLines([{ id: lineCounter++, text: '' }])
      setInput('')
      return
    }
    setHistory((h) => [trimmed, ...h])
    setHistIdx(-1)
    setLines((ls) => {
      const last = ls[ls.length - 1]
      if (last && last.text.trimEnd().endsWith('>')) {
        const next = [...ls]
        next[next.length - 1] = { ...last, text: last.text + ' ' + trimmed, isInput: true }
        return next
      }
      return [...ls, { id: lineCounter++, text: trimmed, isInput: true }]
    })
    try { void desktop?.term.write(trimmed + '\r\n').catch(() => {}) } catch {}
    setInput('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      send(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length) {
        const idx = histIdx < 0 ? 0 : Math.min(histIdx + 1, history.length - 1)
        setHistIdx(idx)
        setInput(history[idx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx >= 0) {
        const idx = histIdx - 1
        setHistIdx(idx)
        setInput(idx >= 0 ? history[idx] : '')
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      try { void window.denebDesktop?.term.write('\x03').catch(() => {}) } catch {}
      setInput('')
      setLines((ls) => [...ls, { id: lineCounter++, text: '^C', isInput: true }])
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([{ id: lineCounter++, text: '' }])
    }
  }

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal__header">
        <span><Icons.terminalIcon size={12} /> {desktopPlatform() === 'win32' ? 'PowerShell' : desktopPlatform() === 'darwin' ? 'zsh' : 'bash'}</span>
        <button className="terminal__clear" title="Limpiar (Ctrl+L)" onClick={() => setLines([{ id: lineCounter++, text: '' }])}>
          <Icons.delete size={12} />
        </button>
      </div>
      <div className="terminal__output" ref={scrollRef}>
        {lines.map((l) => (
          <div key={l.id} className={`terminal__line${l.isInput ? ' terminal__line--input' : ''}`}>
            {parseAnsi(l.text)}
          </div>
        ))}
        {dead && (
          <div className="terminal__line">
            <span style={{ color: 'var(--red, #f7768e)' }}>[proceso finalizado] — escribe un comando para reiniciar</span>
          </div>
        )}
        <div className="terminal__input-line">
          <span className="terminal__prompt">
            <span className="terminal__cwd">{workspaceCwd() ? workspaceCwd()!.split(/[\\/]/).pop() : '~'}</span>
            <span className="terminal__caret">❯</span>
          </span>
          <input
            ref={inputRef}
            className="terminal__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
        </div>
      </div>
    </div>
  )
}

function DenebShell() {
  const [lines, setLines] = useState<Line[]>(() => [
    { id: lineCounter++, text: '\u001b[1m\u001b[36mDeneb Shell\u001b[0m 1.0.0 — escribe \u001b[33mhelp\u001b[0m para ver los comandos' },
    { id: lineCounter++, text: '' },
  ])
  const [cwd, setCwd] = useState('')
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootName = useEditorStore((s) => s.root?.name)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lines, input])

  useEffect(() => {
    setCwd('')
  }, [rootName])

  async function run(command: string) {
    const root = useEditorStore.getState().root
    if (!root?.handle) return
    const trimmed = command.trim()
    if (!trimmed) {
      setLines((ls) => [...ls, { id: lineCounter++, text: '' }])
      return
    }
    setHistory((h) => [trimmed, ...h])
    setHistIdx(-1)

    const prompt = `\u001b[32m${displayCwd()}\u001b[0m \u001b[90m❯\u001b[0m `
    setLines((ls) => [
      ...ls,
      { id: lineCounter++, text: prompt + trimmed, isInput: true },
    ])
    setInput('')

    const result = await executeCommand(root.handle, cwd, trimmed)
    if (result.lines.length === 1 && result.lines[0] === '\u001b[2J\u001b[H') {
      setLines([{ id: lineCounter++, text: '' }])
    } else {
      setLines((ls) => [...ls, ...result.lines.map((t) => ({ id: lineCounter++, text: t }))])
    }
    if (result.cwd !== cwd) setCwd(result.cwd)
  }

  function displayCwd(): string {
    return cwd ? `~/${cwd}` : '~'
  }

  async function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void run(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length) {
        const idx = histIdx < 0 ? 0 : Math.min(histIdx + 1, history.length - 1)
        setHistIdx(idx)
        setInput(history[idx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx >= 0) {
        const idx = histIdx - 1
        setHistIdx(idx)
        setInput(idx >= 0 ? history[idx] : '')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const completion = await complete(input)
      if (completion) setInput(completion)
    } else if (e.key === 'c' && e.ctrlKey) {
      setInput('')
      setLines((ls) => [...ls, { id: lineCounter++, text: '^C' }])
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([{ id: lineCounter++, text: '' }])
    }
  }

  async function complete(raw: string): Promise<string | null> {
    const root = useEditorStore.getState().root
    if (!root?.handle) return null
    const parts = raw.split(/\s+/)
    const last = parts[parts.length - 1]
    if (parts.length === 1) {
      const hits = COMMANDS.filter((c) => c.startsWith(last))
      if (hits.length === 1) return hits[0]
      return null
    }
    // complete a path
    const { listAt } = await import('../lib/fileSystem')
    const base = last.includes('/') ? last.slice(0, last.lastIndexOf('/')) : cwd
    const token = last.includes('/') ? last.slice(last.lastIndexOf('/') + 1) : last
    const target = base ? `${cwd}/${base}` : cwd
    const entries = await listAt(root.handle, target)
    if (!entries) return null
    const matches = entries.filter((e) => e.name.startsWith(token)).slice(0, 12)
    if (matches.length === 1) {
      const name = matches[0].name + (matches[0].kind === 'directory' ? '/' : '')
      const sep = last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : ''
      return parts.slice(0, -1).join(' ') + (parts.length > 1 ? ' ' : '') + sep + name
    }
    if (matches.length > 1) {
      setLines((ls) => [
        ...ls,
        { id: lineCounter++, text: matches.map((m) => m.kind === 'directory' ? `\u001b[34m${m.name}/\u001b[0m` : m.name).join('  ') },
      ])
    }
    return null
  }

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal__header">
        <span><Icons.terminalIcon size={12} /> deneb</span>
        <button className="terminal__clear" title="Limpiar (Ctrl+L)" onClick={() => setLines([{ id: lineCounter++, text: '' }])}>
          <Icons.delete size={12} />
        </button>
      </div>
      <div className="terminal__output" ref={scrollRef}>
        {lines.map((l) => (
          <div key={l.id} className={`terminal__line${l.isInput ? ' terminal__line--input' : ''}`}>
            {parseAnsi(l.text)}
          </div>
        ))}
        <div className="terminal__input-line">
          <span className="terminal__prompt">
            <span className="terminal__cwd">{displayCwd()}</span>
            <span className="terminal__caret">❯</span>
          </span>
          <input
            ref={inputRef}
            className="terminal__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
        </div>
      </div>
    </div>
  )
}
