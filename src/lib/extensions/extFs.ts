import { useEditorStore } from '../../store/editorStore'
import {
  walkFiles,
  resolvePath,
  readText,
  writeText,
  writeFileAt,
  createFileAt,
  createDirAt,
  removeAt,
  type AnyHandle,
} from '../fileSystem'

export interface ExtStat {
  isFile: () => boolean
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
  size: number
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
  mode: number
}

interface MirrorEntry {
  type: 'file' | 'dir'
  content?: string
  size: number
  mtime: number
}

/**
 * Espejo en memoria del workspace del usuario.
 *
 * Antes de activar una extensión se hidrata (walk + lectura de contenidos),
 * de modo que las operaciones *síncronas* de fs funcionan sobre la copia en
 * memoria, y las asíncronas se resuelven contra el backend real. Las escrituras
 * actualizan el espejo y persisten en el backend de forma asíncrona.
 */
export class ExtFs {
  private cache = new Map<string, MirrorEntry>()
  private hydratedKey = ''
  private hydrating: Promise<void> | null = null

  private root(): { handle: AnyHandle; name: string } | null {
    const root = useEditorStore.getState().root
    if (!root?.handle) return null
    return { handle: root.handle, name: root.name }
  }

  private key(p: string): string {
    const k = p
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
    return k === '.' ? '' : k
  }

  private async loadTree(): Promise<void> {
    const r = this.root()
    this.cache.clear()
    this.cache.set('', { type: 'dir', size: 0, mtime: Date.now() })
    if (!r) return
    const prefix = r.name ? r.name + '/' : ''
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next']
    const pending: string[] = []
    await walkFiles(r.handle, (path, _handle) => {
      let rel = this.key(path)
      if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length)
      const segs = rel.split('/')
      if (segs.slice(0, -1).some((s) => skipDirs.includes(s))) return
      const i = rel.lastIndexOf('/')
      const name = i >= 0 ? rel.slice(i + 1) : rel
      if (name === '.git') return
      this.cache.set(rel, { type: 'file', size: 0, mtime: 0 })
      pending.push(rel)
      let dir = i >= 0 ? rel.slice(0, i) : ''
      while (true) {
        if (dir && !this.cache.has(dir)) this.cache.set(dir, { type: 'dir', size: 0, mtime: 0 })
        if (!dir) break
        const j = dir.lastIndexOf('/')
        dir = j >= 0 ? dir.slice(0, j) : ''
      }
    })
    // Hidrata contenidos (para fs.readFileSync). Se limita para no volcar
    // repos enormes en memoria.
    if (pending.length <= 1500) {
      await Promise.all(
        pending.map(async (rel) => {
          try {
            const h = await resolvePath(r.handle, rel)
            if (h && h.kind === 'file') {
              const text = await readText(h)
              this.cache.set(rel, { type: 'file', content: text, size: text.length, mtime: Date.now() })
            }
          } catch {
            // archivo no legible: se mantiene la entrada sin contenido
          }
        }),
      )
    }
  }

  /** Hidrata el espejo desde el workspace actual (una vez por raíz). */
  async hydrate(): Promise<void> {
    const r = this.root()
    const key = r ? r.name : '__none__'
    if (this.hydratedKey === key) return
    if (this.hydrating) return this.hydrating
    this.hydrating = (async () => {
      try {
        await this.loadTree()
        this.hydratedKey = key
      } finally {
        this.hydrating = null
      }
    })()
    return this.hydrating
  }

  private entry(rel: string): MirrorEntry | undefined {
    return this.cache.get(this.key(rel))
  }

  /** Marca la raíz como desactualizada (p. ej. al abrir otra carpeta). */
  invalidate() {
    this.hydratedKey = ''
  }

  // ---- consultas síncronas (sobre el espejo) ----

  existsSync(p: string): boolean {
    return this.entry(p) !== undefined
  }

  isFileSync(p: string): boolean {
    return this.entry(p)?.type === 'file'
  }

  isDirSync(p: string): boolean {
    return this.entry(p)?.type === 'dir'
  }

  readFileSync(p: string, enc?: BufferEncoding): string | Uint8Array {
    const e = this.entry(p)
    if (!e) throw enoent(p)
    if (e.type !== 'file') throw new Error(`EISDIR: illegal operation on a directory, read '${p}'`)
    const text = e.content ?? ''
    if (enc === 'utf8' || enc === 'utf-8') return text
    const bytes = new TextEncoder().encode(text)
    return enc ? (Buffer.from(bytes).toString(enc as BufferEncoding) as unknown as string) : bytes
  }

  readdirSync(p: string): string[] {
    const base = this.key(p)
    const prefix = base ? base + '/' : ''
    const set = new Set<string>()
    for (const k of this.cache.keys()) {
      if (!k.startsWith(prefix) || k === base) continue
      const rest = k.slice(prefix.length)
      const name = rest.split('/')[0]
      if (name) set.add(name)
    }
    if (set.size === 0 && !this.cache.has(base)) throw enoent(p)
    return [...set].sort((a, b) => a.localeCompare(b))
  }

  statSync(p: string): ExtStat {
    const e = this.entry(p)
    if (!e) throw enoent(p)
    const isDir = e.type === 'dir'
    return {
      isFile: () => !isDir,
      isDirectory: () => isDir,
      isSymbolicLink: () => false,
      size: isDir ? 0 : e.size,
      mtimeMs: e.mtime,
      ctimeMs: e.mtime,
      birthtimeMs: e.mtime,
      mode: isDir ? 0o40777 : 0o100666,
    }
  }

  // ---- operaciones síncronas de escritura (espejo inmediato + persistencia) ----

  writeFileSync(p: string, data: string | Uint8Array): void {
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
    const rel = this.key(p)
    const i = rel.lastIndexOf('/')
    const parent = i >= 0 ? rel.slice(0, i) : ''
    if (parent && !this.cache.has(parent)) throw enoent(parent)
    this.cache.set(rel, { type: 'file', content: text, size: text.length, mtime: Date.now() })
    void this.persistWrite(rel, text)
  }

  mkdirSync(p: string): void {
    const rel = this.key(p)
    if (this.cache.has(rel)) throw new Error(`EEXIST: file already exists, mkdir '${p}'`)
    this.cache.set(rel, { type: 'dir', size: 0, mtime: Date.now() })
    const r = this.root()
    if (r) void createDirAt(r.handle, rel).catch(() => {})
  }

  rmSync(p: string): void {
    const rel = this.key(p)
    if (!this.cache.has(rel)) throw enoent(p)
    const prefix = rel ? rel + '/' : ''
    for (const k of [...this.cache.keys()]) {
      if (k === rel || k.startsWith(prefix)) this.cache.delete(k)
    }
    const r = this.root()
    if (r) void removeAt(r.handle, rel).catch(() => {})
  }

  renameSync(from: string, to: string): void {
    const relFrom = this.key(from)
    const relTo = this.key(to)
    const e = this.cache.get(relFrom)
    if (!e) throw enoent(from)
    if (e.type === 'dir') {
      const prefix = relFrom + '/'
      const toMove = [...this.cache.keys()].filter((k) => k.startsWith(prefix))
      for (const k of toMove) {
        this.cache.set(relTo + '/' + k.slice(prefix.length), this.cache.get(k)!)
        this.cache.delete(k)
      }
      this.cache.set(relTo, e)
      this.cache.delete(relFrom)
    } else {
      this.cache.set(relTo, e)
      this.cache.delete(relFrom)
    }
    const r = this.root()
    if (r) {
      void createFileAt(r.handle, relTo, e.type === 'file' ? (e.content ?? '') : '').catch(() => {})
      void removeAt(r.handle, relFrom).catch(() => {})
    }
  }

  private async persistWrite(rel: string, text: string): Promise<void> {
    const r = this.root()
    if (!r) return
    try {
      await writeFileAt(r.handle, rel, text)
    } catch {
      // la escritura real falló pero el espejo ya la reflejó
    }
  }

  // ---- operaciones asíncronas (backend real) ----

  async readFile(p: string, enc?: BufferEncoding): Promise<string | Uint8Array> {
    const r = this.root()
    if (!r) throw enoent(p)
    const handle = await resolvePath(r.handle, this.key(p))
    if (!handle || handle.kind !== 'file') throw enoent(p)
    const text = await readText(handle)
    const rel = this.key(p)
    this.cache.set(rel, { type: 'file', content: text, size: text.length, mtime: Date.now() })
    if (enc === 'utf8' || enc === 'utf-8') return text
    const bytes = new TextEncoder().encode(text)
    return enc ? (Buffer.from(bytes).toString(enc as BufferEncoding) as unknown as string) : bytes
  }

  async writeFile(p: string, data: string | Uint8Array): Promise<void> {
    const r = this.root()
    if (!r) throw enoent(p)
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
    const rel = this.key(p)
    const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
    if (!this.cache.has(parent)) throw enoent(parent)
    const ok = await writeFileAt(r.handle, rel, text)
    if (!ok) throw enoent(p)
    this.cache.set(rel, { type: 'file', content: text, size: text.length, mtime: Date.now() })
  }

  async mkdir(p: string): Promise<void> {
    const r = this.root()
    if (!r) throw enoent(p)
    const rel = this.key(p)
    if (this.cache.has(rel)) throw new Error(`EEXIST: file already exists, mkdir '${p}'`)
    await createDirAt(r.handle, rel)
    this.cache.set(rel, { type: 'dir', size: 0, mtime: Date.now() })
  }

  async rm(p: string): Promise<void> {
    const r = this.root()
    if (!r) throw enoent(p)
    const rel = this.key(p)
    const ok = await removeAt(r.handle, rel)
    if (!ok) throw enoent(p)
    const prefix = rel ? rel + '/' : ''
    for (const k of [...this.cache.keys()]) {
      if (k === rel || k.startsWith(prefix)) this.cache.delete(k)
    }
  }

  async rename(from: string, to: string): Promise<void> {
    const r = this.root()
    if (!r) throw enoent(from)
    const relFrom = this.key(from)
    const relTo = this.key(to)
    const e = this.cache.get(relFrom)
    if (!e) throw enoent(from)
    if (e.type === 'dir') {
      const prefix = relFrom + '/'
      const toMove = [...this.cache.keys()].filter((k) => k.startsWith(prefix))
      for (const k of toMove) {
        this.cache.set(relTo + '/' + k.slice(prefix.length), this.cache.get(k)!)
        this.cache.delete(k)
      }
      this.cache.set(relTo, e)
      this.cache.delete(relFrom)
    } else {
      this.cache.set(relTo, e)
      this.cache.delete(relFrom)
    }
    await createFileAt(r.handle, relTo, e.type === 'file' ? (e.content ?? '') : '')
    await removeAt(r.handle, relFrom)
  }

  async watchDir(p: string, cb: (kind: 'created' | 'changed' | 'deleted', path: string) => void): Promise<void> {
    const rel = this.key(p)
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as { kind: string; path: string }
      if (!d) return
      const fp = this.key(d.path)
      if (fp === rel || fp.startsWith(rel + '/')) cb(d.kind as 'created' | 'changed' | 'deleted', fp)
    }
    window.addEventListener('nova:fs-change', handler)
    // recargar del backend si venimos de un guardado externo
    this.refreshEntry(rel).catch(() => {})
  }

  private async refreshEntry(rel: string): Promise<void> {
    const r = this.root()
    if (!r) return
    const handle = await resolvePath(r.handle, rel)
    if (!handle) return
    if (handle.kind === 'file') {
      const text = await readText(handle)
      this.cache.set(rel, { type: 'file', content: text, size: text.length, mtime: Date.now() })
    } else {
      if (!this.cache.has(rel)) this.cache.set(rel, { type: 'dir', size: 0, mtime: Date.now() })
    }
  }
}

export const extFs = new ExtFs()

function enoent(p: string): Error {
  const err = new Error(`ENOENT: no such file or directory, open '${p}'`)
  ;(err as unknown as { code: string }).code = 'ENOENT'
  return err
}

// Buffer mínimo para las operaciones binarias de fs
export class Buffer {
  static from(input: string | Uint8Array, enc?: string): Buffer {
    if (typeof input === 'string') {
      return new Buffer(new TextEncoder().encode(input))
    }
    return new Buffer(input)
  }
  static alloc(size: number): Buffer {
    return new Buffer(new Uint8Array(size))
  }
  static isBuffer(x: unknown): boolean {
    return x instanceof Buffer
  }
  readonly data: Uint8Array
  constructor(data: Uint8Array) {
    this.data = data
  }
  get length(): number {
    return this.data.length
  }
  toString(enc: string): string {
    if (enc === 'base64') {
      let bin = ''
      for (const b of this.data) bin += String.fromCharCode(b)
      return btoa(bin)
    }
    if (enc === 'hex') {
      return [...this.data].map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    return new TextDecoder().decode(this.data)
  }
  write(str: string): number {
    const bytes = new TextEncoder().encode(str)
    this.data.set(bytes)
    return bytes.length
  }
  toJSON(): { type: string; data: number[] } {
    return { type: 'Buffer', data: [...this.data] }
  }
}

type BufferEncoding = 'utf8' | 'utf-8' | 'base64' | 'hex' | 'ascii' | 'binary'

export function installBufferGlobal() {
  ;(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer
}
