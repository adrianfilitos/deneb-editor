import type { DesktopEntry, TreeNode, VirtualEntry, VirtualFile, VirtualDir } from '../types'
import { desktopFs } from './electronBridge'

export type AnyHandle = FileSystemDirectoryHandle | FileSystemFileHandle | VirtualEntry | DesktopEntry

let backendKind: 'native' | 'virtual' | 'desktop' = 'native'

export function fsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export function currentBackend(): 'native' | 'virtual' | 'desktop' {
  return backendKind
}

export function setBackend(kind: 'native' | 'virtual' | 'desktop') {
  backendKind = kind
}

function joinAbs(base: string, name: string): string {
  return base.replace(/[\\/]+$/, '') + '/' + name
}

function displayRel(rootAbs: string, abs: string): string {
  const a = rootAbs.replace(/\\/g, '/').replace(/\/+$/, '')
  const b = abs.replace(/\\/g, '/')
  if (b.startsWith(a + '/')) return b.slice(a.length + 1)
  return b
}

export async function requestPermission(handle: FileSystemHandle): Promise<boolean> {
  const perm = handle as FileSystemHandle & {
    queryPermission?: (d: PermissionDescriptor) => Promise<PermissionState>
    requestPermission?: (d: PermissionDescriptor) => Promise<PermissionState>
  }
  const opts = { mode: 'readwrite' } as unknown as PermissionDescriptor
  try {
    if (perm.queryPermission) {
      const p = await perm.queryPermission(opts)
      if (p === 'granted') return true
      if (perm.requestPermission) {
        const r = await perm.requestPermission(opts)
        return r === 'granted'
      }
      return true
    }
  } catch {
    // fall through
  }
  return true
}

export async function openWorkspace(): Promise<{ root: TreeNode; demo: boolean }> {
  const dFs = desktopFs()
  if (dFs) {
    const abs = await dFs.openWorkspace()
    if (!abs) {
      const err = new Error('Operación cancelada')
      err.name = 'AbortError'
      throw err
    }
    backendKind = 'desktop'
    const name = abs.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || abs
    const handle: DesktopEntry = { kind: 'directory', name, absPath: abs }
    await dFs.setWorkspace(abs)
    return { root: toNode(handle, ''), demo: false }
  }
  if (fsSupported()) {
    const dirHandle = await (
      window as unknown as { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }
    ).showDirectoryPicker()
    const ok = await requestPermission(dirHandle)
    if (!ok) throw new Error('Permiso denegado para leer el directorio')
    backendKind = 'native'
    return { root: toNode(dirHandle, ''), demo: false }
  }
  backendKind = 'virtual'
  return { root: createDemoRoot(), demo: true }
}

export async function openWorkspaceAt(absPath: string): Promise<{ root: TreeNode; demo: boolean }> {
  const dFs = desktopFs()
  if (!dFs) throw new Error('Funcionalidad solo disponible en el escritorio')
  backendKind = 'desktop'
  await dFs.setWorkspace(absPath)
  const name = absPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || absPath
  const handle: DesktopEntry = { kind: 'directory', name, absPath }
  return { root: toNode(handle, ''), demo: false }
}

export function createDemoRoot(): TreeNode {
  const root: VirtualDir = { kind: 'directory', name: 'demo-project', entries: new Map() }
  const src = dir(root, 'src')
  const comps = dir(src, 'components')
  file(comps, 'Button.tsx', `import React from 'react'

interface ButtonProps {
  label: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={'btn btn--' + variant} onClick={onClick}>
      {label}
    </button>
  )
}
`)
  file(comps, 'Header.tsx', `import React from 'react'

export function Header() {
  return (
    <header className="app-header">
      <h1>Bienvenido a Nova</h1>
    </header>
  )
}
`)
  file(src, 'App.tsx', `import React from 'react'
import { Header } from './components/Header'
import { Button } from './components/Button'

export default function App() {
  return (
    <main className="app">
      <Header />
      <Button label="Haz clic" onClick={() => alert('Hola desde Nova!')} />
    </main>
  )
}
`)
  file(src, 'main.tsx', `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)
`)
  file(root, 'package.json', `{
  "name": "demo-project",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.0.0"
  }
}
`)
  file(root, 'tsconfig.json', `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true
  }
}
`)
  file(root, 'README.md', `# Proyecto Demo

Este es un proyecto de ejemplo creado por **Nova**.

Para probar el editor con tus propios archivos, abre una carpeta real
con el botón "Abrir carpeta" del panel de exploración.

## Atajos útiles
- Ctrl+P — Abrir archivo
- Ctrl+Shift+P — Paleta de comandos
- Ctrl+S — Guardar archivo
- Ctrl+Shift+F — Buscar en archivos
- Ctrl+B — Ocultar barra lateral
- Ctrl+J — Abrir IA
`)

  return toNode(root, '')
}

function dir(parent: VirtualDir, name: string): VirtualDir {
  const d: VirtualDir = { kind: 'directory', name, entries: new Map() }
  parent.entries.set(name, d)
  return d
}

function file(parent: VirtualDir, name: string, content: string) {
  parent.entries.set(name, { kind: 'file', name, content, mtime: Date.now() })
}

function toNode(handle: AnyHandle, parentPath: string): TreeNode {
  const path = parentPath ? `${parentPath}/${handle.name}` : handle.name
  if (handle.kind === 'file') {
    return { name: handle.name, path, kind: 'file', handle }
  }
  return { name: handle.name, path, kind: 'directory', children: [], loaded: false, expanded: false, handle }
}

export function nodeFromHandle(handle: AnyHandle): TreeNode {
  return toNode(handle, '')
}

export async function listChildren(node: TreeNode): Promise<TreeNode[]> {
  if (backendKind === 'desktop') {
    const handle = node.handle as DesktopEntry
    const entries = await desktopFs()!.list(handle.absPath)
    return sortNodes(entries.map((e) => toNode(e, node.path)))
  }
  if (backendKind === 'native') {
    const handle = node.handle as FileSystemDirectoryHandle
    await requestPermission(handle)
    const out: TreeNode[] = []
    for await (const entry of asyncEntries(handle)) {
      out.push(toNode(entry as AnyHandle, node.path))
    }
    return sortNodes(out)
  }
  const dir = node.handle as VirtualDir
  const out: TreeNode[] = []
  if (dir && dir.entries) {
    for (const entry of dir.entries.values()) {
      out.push(toNode(entry, node.path))
    }
  }
  return sortNodes(out)
}

function sortNodes(out: TreeNode[]): TreeNode[] {
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function readText(fileHandle: AnyHandle): Promise<string> {
  if (backendKind === 'desktop') {
    const handle = fileHandle as DesktopEntry
    return await desktopFs()!.readFile(handle.absPath)
  }
  if (backendKind === 'native') {
    const handle = fileHandle as FileSystemFileHandle
    await requestPermission(handle)
    const f = await handle.getFile()
    return await f.text()
  }
  const vf = fileHandle as VirtualFile
  return vf.content
}

export async function writeText(fileHandle: AnyHandle, content: string): Promise<void> {
  if (backendKind === 'desktop') {
    const handle = fileHandle as DesktopEntry
    await desktopFs()!.writeFile(handle.absPath, content)
    return
  }
  if (backendKind === 'native') {
    const handle = fileHandle as FileSystemFileHandle
    await requestPermission(handle)
    const w = await handle.createWritable()
    await w.write(content)
    await w.close()
    return
  }
  const vf = fileHandle as VirtualFile
  vf.content = content
  vf.mtime = Date.now()
}

export async function createEntry(
  parentHandle: AnyHandle,
  name: string,
  kind: 'file' | 'directory',
): Promise<TreeNode> {
  if (backendKind === 'desktop') {
    const handle = parentHandle as DesktopEntry
    const entry = await desktopFs()!.create(handle.absPath, name, kind)
    return toNode(entry, parentPathOf(parentHandle))
  }
  if (backendKind === 'native') {
    const handle = parentHandle as FileSystemDirectoryHandle
    await requestPermission(handle)
    if (kind === 'file') {
      const fh = await handle.getFileHandle(name, { create: true })
      return toNode(fh, parentPathOf(parentHandle))
    }
    const dh = await handle.getDirectoryHandle(name, { create: true })
    return toNode(dh, parentPathOf(parentHandle))
  }
  const dir = parentHandle as VirtualDir
  if (dir.entries.has(name)) throw new Error(`Ya existe "${name}"`)
  if (kind === 'file') {
    const vf: VirtualFile = { kind: 'file', name, content: '', mtime: Date.now() }
    dir.entries.set(name, vf)
    return toNode(vf, parentPathOf(parentHandle))
  }
  const vd: VirtualDir = { kind: 'directory', name, entries: new Map() }
  dir.entries.set(name, vd)
  return toNode(vd, parentPathOf(parentHandle))
}

function parentPathOf(handle: AnyHandle): string {
  const dir = handle as FileSystemDirectoryHandle
  return dir.name === 'demo-project' ? '' : dir.name
}

export async function deleteEntry(parentHandle: AnyHandle, name: string): Promise<void> {
  if (backendKind === 'desktop') {
    const handle = parentHandle as DesktopEntry
    await desktopFs()!.remove(joinAbs(handle.absPath, name))
    return
  }
  if (backendKind === 'native') {
    const handle = parentHandle as FileSystemDirectoryHandle
    await requestPermission(handle)
    await handle.removeEntry(name, { recursive: true })
    return
  }
  const dir = parentHandle as VirtualDir
  dir.entries.delete(name)
}

export async function renameEntry(parentHandle: AnyHandle, oldName: string, newName: string): Promise<void> {
  if (backendKind === 'desktop') {
    const handle = parentHandle as DesktopEntry
    await desktopFs()!.rename(handle.absPath, oldName, newName)
    return
  }
  if (backendKind === 'native') {
    const dir = parentHandle as FileSystemDirectoryHandle
    await requestPermission(dir)
    let child: FileSystemHandle | null = null
    try {
      child = await dir.getFileHandle(oldName)
    } catch {
      try {
        child = await dir.getDirectoryHandle(oldName)
      } catch {
        throw new Error(`No se encontró "${oldName}"`)
      }
    }
    const movable = child as FileSystemHandle & { move?: (n: string) => Promise<void> }
    if (!movable.move) throw new Error('Renombrar no está soportado en este navegador')
    await movable.move(newName)
    return
  }
  const dir = parentHandle as VirtualDir
  const entry = dir.entries.get(oldName)
  if (!entry) throw new Error(`No se encontró "${oldName}"`)
  dir.entries.delete(oldName)
  entry.name = newName
  dir.entries.set(newName, entry)
}

export async function walkFiles(
  dirHandle: AnyHandle,
  onFile: (path: string, handle: AnyHandle) => void,
): Promise<void> {
  if (backendKind === 'desktop') {
    const handle = dirHandle as DesktopEntry
    const rootName = handle.name
    const rootAbs = handle.absPath
    const files = await desktopFs()!.walk(rootAbs)
    for (const abs of files) {
      const rel = displayRel(rootAbs, abs)
      const disp = rootName ? `${rootName}/${rel}` : rel
      const name = abs.split(/[\\/]/).pop() || abs
      onFile(disp, { kind: 'file', name, absPath: abs })
    }
    return
  }
  const entries = await listAny(dirHandle)
  for (const entry of entries) {
    const p = `${dirHandle.name}/${entry.name}`.replace(/^\/+/, '')
    if (entry.kind === 'file') {
      onFile(p, entry as AnyHandle)
    } else {
      await walkFiles(entry as AnyHandle, (fp, fh) => onFile(`${dirHandle.name}/${fp}`.replace(/^\/+/, ''), fh))
    }
  }
}

async function listAny(dirHandle: AnyHandle): Promise<{ name: string; kind: 'file' | 'directory' }[]> {
  if (backendKind === 'native') {
    const handle = dirHandle as FileSystemDirectoryHandle
    await requestPermission(handle)
    const out: { name: string; kind: 'file' | 'directory' }[] = []
    for await (const entry of asyncEntries(handle)) {
      out.push({ name: entry.name, kind: entry.kind })
    }
    return out
  }
  const dir = dirHandle as VirtualDir
  const out: { name: string; kind: 'file' | 'directory' }[] = []
  if (dir && dir.entries) {
    for (const entry of dir.entries.values()) {
      out.push({ name: entry.name, kind: entry.kind })
    }
  }
  return out
}

export function buildDemoFileMap(): Map<string, VirtualFile> {
  const map = new Map<string, VirtualFile>()
  const root = createDemoRoot()
  const walk = (prefix: string, d: VirtualDir) => {
    for (const [, v] of d.entries) {
      const p = prefix ? `${prefix}/${v.name}` : v.name
      if (v.kind === 'file') map.set(p, v)
      else walk(p, v)
    }
  }
  walk('', root.handle as VirtualDir)
  return map
}

// ---------------------------------------------------------------------------
// Path-based helpers (used by the integrated terminal and other tooling)
// ---------------------------------------------------------------------------

export async function getChildHandle(dirHandle: AnyHandle, name: string): Promise<AnyHandle | null> {
  if (backendKind === 'desktop') {
    const dir = dirHandle as DesktopEntry
    return await desktopFs()!.stat(joinAbs(dir.absPath, name))
  }
  if (backendKind === 'native') {
    const dir = dirHandle as FileSystemDirectoryHandle
    try {
      return await dir.getFileHandle(name)
    } catch {
      try {
        return await dir.getDirectoryHandle(name)
      } catch {
        return null
      }
    }
  }
  const dir = dirHandle as VirtualDir
  return dir.entries.get(name) || null
}

export function normalizeRelPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function collapsePath(path: string): string[] {
  const parts = normalizeRelPath(path).split('/').filter(Boolean)
  const stack: string[] = []
  for (const p of parts) {
    if (p === '.') continue
    if (p === '..') {
      stack.pop()
      continue
    }
    stack.push(p)
  }
  return stack
}

/** Resolve a root-relative path (may contain "..") from the workspace root handle. */
export async function resolvePath(rootHandle: AnyHandle, path: string): Promise<AnyHandle | null> {
  const parts = collapsePath(path)
  let cur: AnyHandle = rootHandle
  for (const part of parts) {
    if (cur.kind !== 'directory') return null
    const child = await getChildHandle(cur, part)
    if (!child) return null
    cur = child
  }
  return cur
}

export async function parentHandleOf(handle: AnyHandle): Promise<AnyHandle | null> {
  if (backendKind === 'native') {
    const dir = handle as FileSystemDirectoryHandle & { parent?: FileSystemDirectoryHandle }
    return dir.parent ?? null
  }
  const root = handle as VirtualEntry
  const findParent = (current: VirtualDir, target: VirtualEntry): VirtualDir | null => {
    for (const [, v] of current.entries) {
      if (v === target) return current
      if (v.kind === 'directory') {
        const found = findParent(v, target)
        if (found) return found
      }
    }
    return null
  }
  const demoRoot = (createDemoRoot().handle as VirtualDir)
  return findParent(demoRoot, root)
}

export interface ListEntry {
  name: string
  kind: 'file' | 'directory'
  handle: AnyHandle
}

export async function listAt(dirHandle: AnyHandle, path: string): Promise<ListEntry[] | null> {
  const target = await resolvePath(dirHandle, path)
  if (!target || target.kind !== 'directory') return null
  if (backendKind === 'desktop') {
    const dir = target as DesktopEntry
    const entries = await desktopFs()!.list(dir.absPath)
    return entries.map((e) => ({ name: e.name, kind: e.kind, handle: e }))
  }
  if (backendKind === 'native') {
    const dir = target as FileSystemDirectoryHandle
    await requestPermission(dir)
    const out: ListEntry[] = []
    for await (const entry of asyncEntries(dir)) {
      out.push({ name: entry.name, kind: entry.kind, handle: entry as AnyHandle })
    }
    return sortList(out)
  }
  const vdir = target as VirtualDir
  const out: ListEntry[] = []
  if (vdir && vdir.entries) {
    for (const v of vdir.entries.values()) {
      out.push({ name: v.name, kind: v.kind, handle: v })
    }
  }
  return sortList(out)
}

function sortList(out: ListEntry[]): ListEntry[] {
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function readFileAt(dirHandle: AnyHandle, path: string): Promise<string | null> {
  const target = await resolvePath(dirHandle, path)
  if (!target || target.kind !== 'file') return null
  return await readText(target)
}

export async function writeFileAt(dirHandle: AnyHandle, path: string, content: string): Promise<boolean> {
  const target = await resolvePath(dirHandle, path)
  if (!target || target.kind !== 'file') return false
  await writeText(target, content)
  return true
}

export async function createFileAt(dirHandle: AnyHandle, path: string, content = ''): Promise<boolean> {
  const parts = normalizeRelPath(path).split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return false
  const parent = await resolvePath(dirHandle, parts.join('/'))
  if (!parent || parent.kind !== 'directory') return false
  if (backendKind === 'desktop') {
    const dir = parent as DesktopEntry
    await desktopFs()!.create(dir.absPath, name, 'file')
    if (content) await desktopFs()!.writeFile(joinAbs(dir.absPath, name), content)
    return true
  }
  if (backendKind === 'native') {
    const dir = parent as FileSystemDirectoryHandle
    await requestPermission(dir)
    const fh = await dir.getFileHandle(name, { create: true })
    if (content) await writeText(fh, content)
    return true
  }
  const vdir = parent as VirtualDir
  if (vdir.entries.has(name)) return false
  vdir.entries.set(name, { kind: 'file', name, content, mtime: Date.now() })
  return true
}

export async function createDirAt(dirHandle: AnyHandle, path: string): Promise<boolean> {
  const parts = normalizeRelPath(path).split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return false
  const parent = await resolvePath(dirHandle, parts.join('/'))
  if (!parent || parent.kind !== 'directory') return false
  if (backendKind === 'desktop') {
    const dir = parent as DesktopEntry
    await desktopFs()!.create(dir.absPath, name, 'directory')
    return true
  }
  if (backendKind === 'native') {
    const dir = parent as FileSystemDirectoryHandle
    await requestPermission(dir)
    await dir.getDirectoryHandle(name, { create: true })
    return true
  }
  const vdir = parent as VirtualDir
  if (vdir.entries.has(name)) return false
  vdir.entries.set(name, { kind: 'directory', name, entries: new Map() })
  return true
}

export async function removeAt(dirHandle: AnyHandle, path: string): Promise<boolean> {
  const parts = normalizeRelPath(path).split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return false
  const parent = await resolvePath(dirHandle, parts.join('/'))
  if (!parent || parent.kind !== 'directory') return false
  if (backendKind === 'desktop') {
    const dir = parent as DesktopEntry
    await desktopFs()!.remove(joinAbs(dir.absPath, name))
    return true
  }
  if (backendKind === 'native') {
    const dir = parent as FileSystemDirectoryHandle
    await requestPermission(dir)
    await dir.removeEntry(name, { recursive: true })
    return true
  }
  const vdir = parent as VirtualDir
  return vdir.entries.delete(name)
}

export async function isDirectoryAt(dirHandle: AnyHandle, path: string): Promise<boolean> {
  const target = await resolvePath(dirHandle, path)
  return !!target && target.kind === 'directory'
}

export async function isFileAt(dirHandle: AnyHandle, path: string): Promise<boolean> {
  const target = await resolvePath(dirHandle, path)
  return !!target && target.kind === 'file'
}

type AsyncIterableDir = { [Symbol.asyncIterator](): AsyncIterableIterator<FileSystemHandle> }

function asyncEntries(handle: FileSystemDirectoryHandle): AsyncIterableDir {
  return handle as unknown as AsyncIterableDir
}
