import { useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getTasks, loadTasks, runTask, openTasksFile, tasksPath, type DenebTask } from '../lib/tasks'
import { Icons } from './icons'

export function TasksPanel() {
  const [tasks, setTasks] = useState<DenebTask[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const root = useEditorStore((s) => s.root)

  useEffect(() => {
    let alive = true
    void loadTasks().then((list) => {
      if (alive) setTasks(list)
    })
    const onFs = () => {
      void loadTasks().then((list) => {
        if (alive) setTasks(list)
      })
    }
    window.addEventListener('deneb:fs-change', onFs)
    return () => {
      alive = false
      window.removeEventListener('deneb:fs-change', onFs)
    }
  }, [root?.path])

  async function onRun(t: DenebTask) {
    setRunning(t.label)
    await runTask(t)
    setRunning(null)
  }

  if (!tasks.length) {
    return (
      <div className="tasks">
        <div className="tasks__empty">
          <div className="tasks__empty-icon"><Icons.play size={22} /></div>
          <p>Sin tareas definidas.</p>
          <p className="tasks__hint">
            Crea un archivo <code>{tasksPath()}</code> en la raíz del espacio de trabajo con la
            estructura <code>{'{'} "tasks": [ {'{'} "label": "build", "command": "npm run build" {'}'}] {'}'}</code>.
          </p>
          <button className="btn btn--secondary" onClick={openTasksFile}>
            <Icons.plus size={14} /> Crear tasks.json
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tasks">
      <div className="tasks__head">
        <span>Comandos del espacio de trabajo</span>
        <button title="Recargar tareas" onClick={() => void loadTasks().then(setTasks)}>
          <Icons.refresh size={13} />
        </button>
      </div>
      <div className="tasks__list">
        {tasks.map((t) => (
          <button key={t.label} className="task-item" onClick={() => void onRun(t)} disabled={running === t.label}>
            <span className="task-item__play">{running === t.label ? <span className="spinner spinner--sm" /> : <Icons.play size={12} />}</span>
            <span className="task-item__body">
              <b>{t.label}</b>
              <code>{[t.command, ...(t.args || [])].join(' ')}</code>
            </span>
            <span className="task-item__group">{t.group || 'tarea'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
