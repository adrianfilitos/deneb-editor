import { useEditorStore } from '../store/editorStore'
import { useExtUiStore } from '../store/extUiStore'
import { readFileAt, currentBackend, type AnyHandle } from './fileSystem'

export interface DenebTask {
  label: string
  type: string
  command: string
  args?: string[]
  cwd?: string
  group?: string
  problemMatcher?: string
}

export interface TasksConfig {
  version?: string
  tasks: DenebTask[]
}

let tasksCache: DenebTask[] = []
const TASKS_PATH = '.deneb/tasks.json'

export async function loadTasks(): Promise<DenebTask[]> {
  const root = useEditorStore.getState().root?.handle as AnyHandle | null
  if (!root) return tasksCache
  try {
    const raw = await readFileAt(root, TASKS_PATH)
    if (!raw) return (tasksCache = [])
    const parsed = JSON.parse(raw) as TasksConfig
    const list = Array.isArray(parsed) ? parsed : parsed.tasks || []
    tasksCache = list
    return list
  } catch {
    return (tasksCache = [])
  }
}

export function getTasks(): DenebTask[] {
  return tasksCache
}

export function tasksPath(): string {
  return TASKS_PATH
}

export async function runTask(task: DenebTask): Promise<void> {
  const store = useEditorStore.getState()
  const ui = useExtUiStore.getState()
  const outputId = `task:${task.label}`
  ui.clearOutput(outputId)
  store.setBottomView('output')
  ui.showOutput(outputId)
  ui.appendOutput(outputId, `▶ Ejecutando: ${task.label}`, true)

  const isDesktop = currentBackend() === 'desktop'
  const root = store.root?.handle as AnyHandle | null

  if (isDesktop && root) {
    // Ejecución real en el sistema
    const cwd = task.cwd || (root as { absPath?: string }).absPath || undefined
    const full = [task.command, ...(task.args || [])].join(' ')
    try {
      const desktopFs = (await import('./electronBridge')).desktopFs()
      const out = desktopFs ? await desktopFs.exec(cwd, full) : ''
      ui.appendOutput(outputId, out, true)
    } catch (e) {
      ui.appendOutput(outputId, `\u001b[31m[Error] ${(e as Error).message}\u001b[0m`, true)
    }
    return
  }

  // Modo web / demo: simula la salida con un tiempo
  const simulated: Record<string, string> = {
    build: '✔ compilación completada en 2.4s',
    dev: '✔ servidor de desarrollo iniciado en http://localhost:5173',
    test: '✔ 12 tests pasaron, 0 fallaron',
    lint: '✔ sin errores de lint',
    'npm run build': '✔ compilación completada en 2.4s',
  }
  ui.appendOutput(outputId, `$ ${[task.command, ...(task.args || [])].join(' ')}`, true)
  await new Promise((r) => setTimeout(r, 600))
  const key = task.label.toLowerCase().replace(/\s+/g, ' ')
  const result = simulated[key] || simulated[task.command] || `✔ tarea "${task.label}" completada`
  ui.appendOutput(outputId, result, true)
  store.setStatus(`Tarea completada: ${task.label}`, 2500)
}

export function runTaskById(label: string): void {
  const task = tasksCache.find((t) => t.label === label)
  if (task) void runTask(task)
}

export function openTasksFile(): void {
  const store = useEditorStore.getState()
  void store.openFileByPath(store.root?.path ? `${store.root.path}/${TASKS_PATH}` : TASKS_PATH)
}
