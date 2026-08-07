import { useEffect, useMemo, useState } from 'react'
import { useGitStore, kindLabel, type GitChange } from '../store/gitStore'
import { useEditorStore } from '../store/editorStore'
import { Icons } from './icons'

const KIND_ICON: Record<string, string> = {
  M: '✎',
  A: '+',
  D: '✕',
  R: '→',
  U: '?',
}

const KIND_COLOR: Record<string, string> = {
  M: 'var(--orange)',
  A: 'var(--green)',
  D: 'var(--red)',
  R: 'var(--teal)',
  U: 'var(--fg-muted)',
}

export function GitPanel() {
  const store = useGitStore()
  const setStatus = useEditorStore((s) => s.setStatus)
  const [commitMsg, setCommitMsg] = useState('')
  const [branchName, setBranchName] = useState('')
  const [branchList, setBranchList] = useState<string[]>([])
  const [diffFor, setDiffFor] = useState<{ path: string; staged: boolean; diff: string; loading: boolean } | null>(null)
  const [creatingBranch, setCreatingBranch] = useState(false)

  useEffect(() => {
    void store.init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const staged = useMemo(() => store.changes.filter((c) => c.staged), [store.changes])
  const unstaged = useMemo(() => store.changes.filter((c) => !c.staged), [store.changes])
  const aheadBehind = useMemo(() => {
    const m = store.branch.match(/\[(.*?)\]$/)
    return m ? m[1] : ''
  }, [store.branch])

  async function loadBranches() {
    const api = window.novaDesktop?.git
    if (!api) return
    const r = await api.branches()
    if (r.ok) setBranchList(r.branches)
  }

  async function openDiff(change: GitChange) {
    if (change.kind === 'U') {
      setStatus('Sin diff disponible: archivo sin seguimiento', 2000)
      return
    }
    setDiffFor({ path: change.path, staged: change.staged, diff: '', loading: true })
    const text = await store.getDiff(change.path, change.staged)
    setDiffFor({ path: change.path, staged: change.staged, diff: text, loading: false })
  }

  async function doCommit() {
    const ok = await store.commit(commitMsg)
    if (ok) {
      setCommitMsg('')
      setStatus('Commit creado', 2000)
    } else if (store.error) {
      setStatus(store.error, 3500)
    }
  }

  async function doBranch() {
    const ok = await store.createBranch(branchName)
    if (ok) {
      setBranchName('')
      setStatus(`Rama "${branchName}" creada`, 2000)
    } else if (store.error) {
      setStatus(store.error, 3500)
    }
  }

  if (!store.available) {
    return (
      <div className="git">
        <div className="git__empty">
          <Icons.git size={28} />
          <p>El control de código fuente solo está disponible en la <strong>versión de escritorio</strong> de Nova.</p>
          <p className="git__hint">Abre una carpeta y Nova detectará automáticamente el repositorio Git.</p>
        </div>
      </div>
    )
  }

  if (!store.isRepo) {
    return (
      <div className="git">
        <div className="git__empty">
          <Icons.git size={28} />
          <p>La carpeta abierta <strong>no es un repositorio Git</strong>.</p>
          <p className="git__hint">Ejecuta <code>git init</code> en la terminal para empezar a usarlo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="git">
      <div className="git__toolbar">
        <div className="git__branch" title={store.branch}>
          <Icons.gitBranch size={14} />
          <span className="git__branch-name">{store.branch}</span>
          {aheadBehind && <span className="git__branch-status">{aheadBehind}</span>}
        </div>
        <div className="git__actions">
          <button className="git__btn" title="Actualizar estado" onClick={() => void store.refresh()}>
            <Icons.refresh size={14} className={store.busy ? 'spin' : ''} />
          </button>
          <button className="git__btn" title="Fetch" onClick={() => void store.fetch()}>Fetch</button>
          <button className="git__btn" title="Pull" onClick={() => void store.pull()}>Pull</button>
          <button className="git__btn git__btn--accent" title="Push" onClick={() => void store.push()}>Push</button>
        </div>
      </div>

      {store.error && <div className="git__error">{store.error}</div>}

      <div className="git__group">
        <div className="git__group-title">
          <span>Preparados</span>
          <span className="git__count">{staged.length}</span>
        </div>
        <GitList changes={staged} onOpen={openDiff} />
      </div>

      <div className="git__group">
        <div className="git__group-title">
          <span>Cambios</span>
          <span className="git__count">{unstaged.length}</span>
        </div>
        <GitList changes={unstaged} onOpen={openDiff} />
      </div>

      <div className="git__commit">
        <textarea
          className="git__commit-input"
          placeholder="Mensaje del commit… (Enter para commit)"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void doCommit()
            }
          }}
        />
        <button className="git__commit-btn" disabled={!commitMsg.trim() || store.busy} onClick={() => void doCommit()}>
          <Icons.check size={14} /> Commit
        </button>
      </div>

      <div className="git__group">
        <div className="git__group-title">
          <span>Ramas</span>
          <span className="git__count">{branchList.length}</span>
        </div>
        {creatingBranch ? (
          <div className="git__new-branch">
            <input
              className="git__input"
              placeholder="Nombre de la nueva rama"
              value={branchName}
              autoFocus
              onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void doBranch()
                }
                if (e.key === 'Escape') setCreatingBranch(false)
              }}
            />
            <button className="git__btn git__btn--accent" onClick={() => void doBranch()}>Crear</button>
          </div>
        ) : (
          <button className="git__new-branch-btn" onClick={() => { setCreatingBranch(true); void loadBranches() }}>
            <Icons.plus size={14} /> Nueva rama…
          </button>
        )}
        <div className="git__branch-list">
          {branchList.length === 0 && <div className="git__hint git__hint--pad">Activa una rama con "Nueva rama" o ejecuta <code>git branch</code> en la terminal.</div>}
          {branchList.map((b) => (
            <div key={b} className={`git__branch-item${b === store.branch ? ' git__branch-item--current' : ''}`}>
              <Icons.gitBranch size={13} />
              <span className="git__branch-item-name">{b}</span>
              {b === store.branch ? (
                <span className="git__branch-item-tag">actual</span>
              ) : (
                <button className="git__branch-item-checkout" onClick={() => void store.checkout(b)} title={`Cambiar a ${b}`}>
                  <Icons.check size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="git__group">
        <div className="git__group-title">
          <span>Historial</span>
          <span className="git__count">{store.log.length}</span>
        </div>
        <div className="git__log">
          {store.log.map((line) => {
            const m = line.match(/^([0-9a-f]{7,})(.*)$/)
            const hash = m ? m[1] : ''
            const msg = m ? m[2].trim() : line
            return (
              <div key={line} className="git__log-item" title={line}>
                <span className="git__log-hash">{hash}</span>
                <span className="git__log-msg">{msg}</span>
              </div>
            )
          })}
        </div>
      </div>

      {diffFor && <DiffViewer diffFor={diffFor} onClose={() => setDiffFor(null)} />}
    </div>
  )
}

function GitList({ changes, onOpen }: { changes: GitChange[]; onOpen: (c: GitChange) => void }) {
  const stage = useGitStore((s) => s.stage)
  const unstage = useGitStore((s) => s.unstage)
  const openFile = useGitStore((s) => s.openFile)
  if (changes.length === 0) {
    return <div className="git__none">Sin cambios</div>
  }
  return (
    <div className="git__list">
      {changes.map((c) => (
        <div key={c.path + String(c.staged)} className="git__file">
          <button className="git__file-main" onClick={() => onOpen(c)} title={c.path}>
            <span className="git__file-kind" style={{ color: KIND_COLOR[c.kind] }}>{KIND_ICON[c.kind]}</span>
            <span className="git__file-text">
              <span className="git__file-name">{c.name}</span>
              <span className="git__file-path">{c.path}</span>
            </span>
          </button>
          <div className="git__file-actions">
            <button title="Abrir archivo" onClick={() => void openFile(c.path)}>
              <Icons.file size={13} />
            </button>
            {c.staged ? (
              <button title="Despreparar (quitar del stage)" onClick={() => void unstage([c.path])}>
                <Icons.minus size={13} />
              </button>
            ) : (
              <button title="Preparar (añadir al stage)" onClick={() => void stage([c.path])}>
                <Icons.plus size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function DiffViewer({ diffFor, onClose }: { diffFor: { path: string; staged: boolean; diff: string; loading: boolean }; onClose: () => void }) {
  const lines = diffFor.diff.split('\n')
  const headerLine = lines.find((l) => l.startsWith('+++ b/')) || lines.find((l) => l.startsWith('--- a/'))
  return (
    <div className="git-diff">
      <div className="git-diff__head">
        <span className="git-diff__file">
          <Icons.diff size={13} />
          {diffFor.path}
          {diffFor.staged ? ' (preparado)' : ''}
        </span>
        <button className="git-diff__close" onClick={onClose} title="Cerrar diff"><Icons.close size={14} /></button>
      </div>
      <div className="git-diff__body">
        {diffFor.loading ? (
          <div className="git-diff__loading"><span className="spinner spinner--sm" /> Cargando diff…</div>
        ) : diffFor.diff === '' ? (
          <div className="git-diff__loading">Sin diferencias</div>
        ) : (
          <pre className="git-diff__pre">
            {headerLine && <div className="git-diff__line git-diff__line--header">{headerLine}</div>}
            {lines
              .filter((l) => l.startsWith('+') || l.startsWith('-') || l.startsWith('@@'))
              .map((l, i) => {
                const cls = l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : 'hunk'
                return (
                  <div key={i} className={`git-diff__line git-diff__line--${cls}`}>
                    <span className="git-diff__sign">{l[0]}</span>
                    <span>{l.slice(1)}</span>
                  </div>
                )
              })}
          </pre>
        )}
      </div>
    </div>
  )
}
