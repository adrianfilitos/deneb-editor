import * as monaco from 'monaco-editor'
import { useEditorStore } from '../store/editorStore'
import { useExtUiStore } from '../store/extUiStore'
import { instrumentCode, createWorkerSource } from './debuggerInstrumentation'

// Estado del depurador
interface Breakpoint {
  path: string
  line: number
  enabled: boolean
}

interface Frame {
  line: number
  name: string
  file: string
}

export interface DebuggerState {
  running: boolean
  paused: boolean
  stopped: boolean
  breakpoints: Breakpoint[]
  currentLine: number | null
  currentFile: string | null
  frames: Frame[]
  variables: { name: string; value: string; type: string }[]
  error: string | null
}

let state: DebuggerState = {
  running: false,
  paused: false,
  stopped: false,
  breakpoints: [],
  currentLine: null,
  currentFile: null,
  frames: [],
  variables: [],
  error: null,
}

type Listener = (s: DebuggerState) => void
const listeners = new Set<Listener>()

let worker: Worker | null = null
let resolveStep: (() => void) | null = null
let runId = 0
let bpLineMap = new Map<number, number>() // línea instrumentada → línea original

export function getDebuggerState(): DebuggerState {
  return state
}

export function subscribeDebugger(fn: Listener): () => void {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

function emit() {
  const next = { ...state, breakpoints: [...state.breakpoints], frames: [...state.frames], variables: [...state.variables] }
  state = next
  for (const fn of listeners) fn(state)
}

// ---------------------------------------------------------------------------
// Breakpoints (gutter del editor)
// ---------------------------------------------------------------------------

export function toggleBreakpoint(path: string, line: number): void {
  const idx = state.breakpoints.findIndex((b) => b.path === path && b.line === line)
  if (idx >= 0) state.breakpoints.splice(idx, 1)
  else state.breakpoints.push({ path, line, enabled: true })
  emit()
  updateBreakpointDecorations()
}

export function clearBreakpoints(): void {
  state.breakpoints = []
  emit()
  updateBreakpointDecorations()
}

export function breakpointsFor(path: string): number[] {
  return state.breakpoints.filter((b) => b.path === path && b.enabled).map((b) => b.line)
}

// Decoraciones de breakpoint en el editor activo
let bpDecorations: string[] = []
export function updateBreakpointDecorations() {
  const editor = (window as unknown as { __novaEditor?: monaco.editor.IStandaloneCodeEditor | undefined }).__novaEditor
  const path = (window as unknown as { __novaFocusPath?: string | undefined }).__novaFocusPath
  if (!editor || !path) return
  const lines = breakpointsFor(path)
  const model = editor.getModel()
  if (!model) return
  bpDecorations = editor.deltaDecorations(bpDecorations, [
    ...lines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        glyphMarginClassName: 'nova-breakpoint-glyph',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    })),
    ...(state.currentFile === path && state.currentLine
      ? [{
          range: new monaco.Range(state.currentLine, 1, state.currentLine, 1),
          options: {
            isWholeLine: true,
            className: 'nova-debug-current-line',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        }]
      : []),
  ])
}

// Click en el gutter para añadir/quitar breakpoint
export function handleGutterClick(line: number): void {
  const path = (window as unknown as { __novaFocusPath?: string | undefined }).__novaFocusPath
  if (path) toggleBreakpoint(path, line)
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

export async function startDebug(): Promise<void> {
  const store = useEditorStore.getState()
  const tab = store.openTabs.find((t) => t.path === store.activePath)
  if (!tab) return
  if (state.running) stopDebug()

  const root = store.root?.handle
  const code = tab.content

  // Solo soporta JS/TS por ahora
  const isJs = tab.language === 'javascript' || tab.language === 'typescript'
  if (!isJs) {
    state.error = `La depuración aún solo soporta JavaScript y TypeScript (abriste ${tab.language}).`
    state.stopped = true
    emit()
    return
  }

  runId++
  const myRun = runId
  state = {
    ...state,
    running: true,
    paused: false,
    stopped: false,
    currentLine: null,
    currentFile: null,
    frames: [],
    variables: [],
    error: null,
  }
  emit()
  openDebugView()

  // Instrumentar el código: inyectar chequeos de breakpoint por línea
  const { instrumented, lineMap } = instrumentCode(code)
  bpLineMap = lineMap
  const bps = breakpointsFor(tab.path)
  const bpSet = new Set(bps)

  try {
    const workerSrc = createWorkerSource(instrumented, [...bpSet], tab.path)
    worker?.terminate()
    worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'application/javascript' })))
    const terminator = worker
    terminator.onmessage = (e: MessageEvent) => {
      if (myRun !== runId) return
      handleWorkerMessage(e.data, terminator)
    }
    terminator.onerror = (e) => {
      if (myRun !== runId) return
      state.error = `Error en el worker: ${(e as ErrorEvent).message}`
      state.stopped = true
      state.running = false
      emit()
    }
  } catch (e) {
    state.error = `No se pudo iniciar la depuración: ${(e as Error).message}`
    state.running = false
    state.stopped = true
    emit()
  }
}

export function stopDebug(): void {
  runId++
  if (worker) {
    worker.terminate()
    worker = null
  }
  if (resolveStep) {
    resolveStep()
    resolveStep = null
  }
  state = {
    ...state,
    running: false,
    paused: false,
    stopped: true,
    currentLine: null,
    currentFile: null,
    frames: [],
    variables: [],
  }
  emit()
  updateBreakpointDecorations()
}

export function continueDebug(): void {
  if (!state.paused || !resolveStep) return
  state.paused = false
  emit()
  resolveStep()
  resolveStep = null
}

export function stepOver(): void {
  if (!state.paused) return
  const workerMsg = worker
  if (!workerMsg) return
  // El worker ya está pausado en un breakpoint; un "step" se hace enviando un
  // aviso de continuar con un breakpoint temporal en la siguiente línea.
  const cur = state.currentLine
  const next = cur !== null ? cur + 1 : null
  state.paused = false
  emit()
  try {
    workerMsg.postMessage({ cmd: 'step', nextBreakpoint: next })
  } catch {
    // ignore
  }
}

function handleWorkerMessage(data: { type: string; line?: number; file?: string; vars?: { name: string; value: string; type: string }[]; frames?: { line: number; name: string; file: string }[]; text?: string }, workerRef: Worker) {
  switch (data.type) {
    case 'breakpoint': {
      state.paused = true
      state.currentLine = data.line ?? null
      state.currentFile = data.file ?? null
      state.frames = data.frames || []
      state.variables = data.vars || []
      emit()
      updateBreakpointDecorations()
      // Esperar a que el usuario continúe
      resolveStep = () => {
        try {
          workerRef.postMessage({ cmd: 'continue' })
        } catch {
          // ignore
        }
      }
      break
    }
    case 'console': {
      const ui = useExtUiStore.getState()
      ui.appendOutput('debug', `[debug] ${data.text ?? ''}\n`, true)
      break
    }
    case 'done': {
      const ui = useExtUiStore.getState()
      ui.appendOutput('debug', '[debug] Programa finalizado.\n', true)
      state.running = false
      state.stopped = true
      emit()
      updateBreakpointDecorations()
      break
    }
    case 'error': {
      const ui = useExtUiStore.getState()
      ui.appendOutput('debug', `[debug] ${data.text ?? ''}\n`, true)
      state.running = false
      state.stopped = true
      state.error = data.text || 'Error de ejecución'
      emit()
      updateBreakpointDecorations()
      break
    }
  }
}

function openDebugView() {
  const store = useEditorStore.getState()
  store.setBottomView('output')
  useExtUiStore.getState().showOutput('debug')
  if (!useExtUiStore.getState().outputs['debug']) {
    useExtUiStore.getState().clearOutput('debug')
  }
}
