import { useEditorStore } from '../store/editorStore'

export function Breadcrumbs() {
  const activePath = useEditorStore((s) => s.activePath)
  if (!activePath) return null
  const parts = activePath.split('/')
  const file = parts[parts.length - 1]
  const dirs = parts.slice(0, -1)

  return (
    <div className="breadcrumbs">
      <span className="breadcrumbs__root">{dirs[0] || file}</span>
      {dirs.slice(0, -1).map((d, i) => (
        <span key={i} className="breadcrumbs__seg">
          <span className="breadcrumbs__sep">/</span>
          <span className="breadcrumbs__dir">{d}</span>
        </span>
      ))}
      <span className="breadcrumbs__sep">/</span>
      <span className="breadcrumbs__file">{file}</span>
    </div>
  )
}
