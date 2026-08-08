import { createVscodeApi, type HostHandle } from './vscodeShim'
import type { InstalledExt } from '../extensionTypes'

const hosts = new Map<string, HostHandle>()

const pathStub = {
  join: (...parts: string[]) => parts.join('/').replace(/\/+/g, '/'),
  basename: (p: string) => String(p).split(/[\\/]/).pop() || '',
  dirname: (p: string) => String(p).split(/[\\/]/).slice(0, -1).join('/'),
  extname: (p: string) => {
    const base = String(p).split(/[\\/]/).pop() || ''
    const i = base.lastIndexOf('.')
    return i > 0 ? base.slice(i) : ''
  },
  resolve: (...parts: string[]) => parts.join('/'),
  sep: '/',
  normalize: (p: string) => p,
}

const osStub = { EOL: '\n', platform: 'win32', tmpdir: () => '/tmp', homedir: () => '/home', cpus: () => [], arch: () => 'x64' }

const utilStub = {
  inspect: (o: unknown) => {
    try {
      return JSON.stringify(o)
    } catch {
      return String(o)
    }
  },
  promisify: (fn: (...a: any[]) => void) => (...a: any[]) => Promise.resolve(fn(...a)),
  format: (...a: any[]) => a.map((x) => String(x)).join(' '),
}

const fsStub = {
  existsSync: () => false,
  readFileSync: () => {
    throw new Error('Nova: fs.readFileSync no está soportado en extensiones')
  },
  writeFileSync: () => {},
  readdirSync: () => [],
  statSync: () => ({ isDirectory: () => false, isFile: () => true }),
  mkdirSync: () => {},
  unlinkSync: () => {},
  appendFileSync: () => {},
  rmSync: () => {},
  promises: {},
}

const nodeBuiltins: Record<string, unknown> = {
  path: pathStub,
  'path/posix': pathStub,
  'path/win32': pathStub,
  os: osStub,
  util: utilStub,
  fs: fsStub,
  'fs/promises': {},
  url: { URL, fileURLToPath: (u: string) => String(u).replace(/^file:\/\//, '') },
  assert: { ok: () => {}, strict: () => {} },
  events: { EventEmitter: class {} },
  crypto: globalThis.crypto,
  child_process: { spawnSync: () => ({ status: 1, stdout: '', stderr: '' }), execSync: () => '', spawn: () => ({ on: () => {}, stdin: { write: () => {} } }) },
  stream: {},
  http: {},
  https: {},
  buffer: { Buffer: { from: (s: string) => s, isBuffer: () => false, alloc: () => ({}) } },
}

const processStub = {
  env: {},
  platform: 'win32',
  versions: { node: '18.0.0' },
  on: () => {},
  once: () => {},
  nextTick: (cb: () => void) => queueMicrotask(cb),
  cwd: () => '/',
  argv: [],
  exit: () => {},
}

export interface RunningHost {
  id: string
  handle: HostHandle
}

export function isHostRunning(id: string): boolean {
  return hosts.has(id)
}

/** Ejecuta el código de la extensión (main del .vsix) con la API vscode. */
export function runExtension(ext: InstalledExt): boolean {
  if (!ext.code) return false
  if (hosts.has(ext.id)) return true

  const handle = createVscodeApi(ext.id, { id: ext.id, version: ext.version })
  const moduleObj: { exports: any } = { exports: {} }

  const makeRequire = (name: string): any => {
    if (name === 'vscode') return handle.api
    if (name in nodeBuiltins) return nodeBuiltins[name]
    throw new Error(`Módulo no soportado por el Extension Host de Nova: "${name}"`)
  }

  try {
    // Sandbox en el hilo principal con un sistema de módulos mínimo (CommonJS).
    const runner = new Function(
      'module',
      'exports',
      'require',
      '__filename',
      '__dirname',
      'process',
      'global',
      ext.code,
    )
    runner(moduleObj, moduleObj.exports, makeRequire, 'extension.js', '/', processStub, globalThis)
  } catch (e) {
    window.dispatchEvent(
      new CustomEvent('nova:status', {
        detail: `La extensión ${ext.name} no pudo activarse: ${(e as Error).message}`,
      }),
    )
    handle.disposeAll()
    return false
  }

  const exported = moduleObj.exports
  const activate = typeof exported === 'function' ? exported : exported?.activate
  if (typeof activate === 'function') {
    try {
      const r = activate(handle.context)
      if (r && typeof r.then === 'function') {
        r.catch((err: Error) => {
          window.dispatchEvent(
            new CustomEvent('nova:status', {
              detail: `Error al activar ${ext.name}: ${err.message}`,
            }),
          )
        })
      }
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('nova:status', {
          detail: `Error al activar ${ext.name}: ${(e as Error).message}`,
        }),
      )
      handle.disposeAll()
      return false
    }
  }

  hosts.set(ext.id, handle)
  return true
}

export function stopExtension(id: string) {
  const handle = hosts.get(id)
  if (!handle) return
  handle.disposeAll()
  hosts.delete(id)
}
