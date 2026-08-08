import type { NodeBuiltins } from './nodeBuiltins'

export interface LoaderEnv {
  vscode: any
  builtins: NodeBuiltins
  process: Record<string, unknown>
  globalThisRef: any
}

interface LoadedModule {
  exports: any
}

const decoder = new TextDecoder()

/** Resolución de rutas POSIX dentro del paquete de la extensión (extension/...). */
function dirname(p: string): string {
  const i = p.lastIndexOf('/')
  return i >= 0 ? p.slice(0, i) : '.'
}

function join(...parts: string[]): string {
  const parts2 = parts.join('/')
  const out: string[] = []
  for (const part of parts2.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      out.pop()
      continue
    }
    out.push(part)
  }
  return out.join('/')
}

const BUILTIN_KEYS = new Set([
  'path', 'path/posix', 'path/win32', 'os', 'util', 'events', 'crypto', 'url', 'assert',
  'stream', 'zlib', 'fs', 'fs/promises', 'process', 'child_process', 'http', 'https', 'net',
  'tls', 'buffer', 'console', 'string_decoder', 'timers', 'constants', 'querystring',
])

// Módulos virtuales del host real de VS Code (proporcionados por otras
// extensiones). Se resuelven con un stub para que las extensiones que los
// requieren opcionalmente no se rompan.
const VIRTUAL_MODULES: Record<string, unknown> = {
  'vsls/vscode': {
    getApi: () => Promise.resolve(undefined),
    getSharedService: () => Promise.resolve(undefined),
    sharedService: undefined,
    name: 'vsls',
  },
}

export class CommonJsLoader {
  private cache = new Map<string, LoadedModule>()
  private files: Record<string, Uint8Array>
  private env: LoaderEnv

  constructor(files: Record<string, Uint8Array>, env: LoaderEnv) {
    this.files = files
    this.env = env
  }

  private str(p: string): string | null {
    const b = this.files[p]
    if (!b) return null
    try {
      return decoder.decode(b)
    } catch {
      return null
    }
  }

  private has(p: string): boolean {
    return p in this.files
  }

  private resolvePath(input: string): string | null {
    const p = input.replace(/^\.\//, '')
    if (this.has(p) && !p.endsWith('/')) return p
    for (const ext of ['.js', '.cjs', '.json', '.mjs']) {
      if (this.has(p + ext)) return p + ext
    }
    if (this.has(p + '/index.js')) return p + '/index.js'
    if (this.has(p + '/index.cjs')) return p + '/index.cjs'
    if (this.has(p + '/package.json')) {
      const raw = this.str(p + '/package.json')
      if (raw) {
        try {
          const pkg = JSON.parse(raw) as { main?: string }
          if (pkg.main) {
            const resolved = this.resolvePath(join(p, pkg.main))
            if (resolved) return resolved
          }
        } catch {
          // ignore
        }
      }
      return this.resolvePath(p + '/index')
    }
    return null
  }

  resolve(spec: string, fromFile: string): string | null {
    if (spec === 'vscode') return 'vscode'
    if (spec.startsWith('vscode-')) return 'vscode'
    if (BUILTIN_KEYS.has(spec)) return `builtin:${spec}`
    if (spec in VIRTUAL_MODULES) return `virtual:${spec}`
    if (spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..') {
      return this.resolvePath(join(dirname(fromFile), spec))
    }
    // Especificador "desnudo": busca en node_modules de la extensión
    const viaNm = this.resolvePath(join(dirname(fromFile), 'node_modules', spec))
    if (viaNm) return viaNm
    return null
  }

  /** Devuelve el módulo para un archivo (compilando si hace falta). */
  private load(resolved: string): LoadedModule {
    const cached = this.cache.get(resolved)
    if (cached) return cached
    const moduleObj: LoadedModule = { exports: {} }

    const localRequire = (spec: string): any => {
      const r = this.resolve(spec, resolved)
      if (r === 'vscode') return this.env.vscode
      if (r?.startsWith('builtin:')) {
        const key = r.slice('builtin:'.length)
        return (this.env.builtins as unknown as Record<string, unknown>)[key] ?? {}
      }
      if (r?.startsWith('virtual:')) {
        return VIRTUAL_MODULES[r.slice('virtual:'.length)]
      }
      if (!r) {
        // Especificador "desnudo" sin empaquetar (p. ej. vsls/vscode): en el
        // host real de VS Code se resuelve a undefined si el módulo no está.
        // Así los guards del tipo `if (mod)` de las extensiones funcionan.
        if (!spec.startsWith('.')) return undefined
        throw new Error(
          `Nova: no se pudo resolver "${spec}" (desde ${resolved}). El módulo no está empaquetado en la extensión.`,
        )
      }
      return this.load(r).exports
    }

    const code = this.str(resolved)
    if (code == null) throw new Error(`Nova: no existe ${resolved}`)
    if (resolved.endsWith('.json')) {
      moduleObj.exports = JSON.parse(code)
      this.cache.set(resolved, moduleObj)
      return moduleObj
    }

    const self = this
    const fn = new Function(
      'module',
      'exports',
      'require',
      '__filename',
      '__dirname',
      'process',
      'global',
      'Buffer',
      code,
    )
    fn.call(
      moduleObj.exports,
      moduleObj,
      moduleObj.exports,
      localRequire,
      resolved,
      dirname(resolved),
      this.env.process,
      this.env.globalThisRef,
      (this.env.builtins.buffer as { Buffer: unknown }).Buffer,
    )
    this.cache.set(resolved, moduleObj)
    void self
    return moduleObj
  }

  /** Carga la entrada principal de la extensión y devuelve su exports. */
  loadMain(mainPath: string): any {
    const resolved = this.resolvePath(mainPath)
    if (!resolved) throw new Error(`Nova: no se encontró el main "${mainPath}"`)
    return this.load(resolved).exports
  }
}
