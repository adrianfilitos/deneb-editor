import { extFs, Buffer } from './extFs'
import { gzipSync, gunzipSync, inflateSync, deflateSync, strFromU8, strToU8 } from 'fflate'

// ---------------------------------------------------------------------------
// path — implementación POSIX (y una variante win32 suficiente)
// ---------------------------------------------------------------------------

function normalizeArray(parts: string[], allowAboveRoot: boolean): string[] {
  const res: string[] = []
  for (let p of parts) {
    if (!p || p === '.') continue
    if (p === '..') {
      if (res.length && res[res.length - 1] !== '..') res.pop()
      else if (allowAboveRoot) res.push('..')
    } else {
      res.push(p)
    }
  }
  return res
}

const posix = {
  sep: '/',
  delimiter: ':',
  basename(p: string): string {
    const clean = normalize(p)
    const i = clean.lastIndexOf('/')
    return i >= 0 ? clean.slice(i + 1) : clean
  },
  dirname(p: string): string {
    const clean = normalize(p)
    if (clean === '.' || clean === '') return '.'
    const i = clean.lastIndexOf('/')
    if (i === -1) return '.'
    if (i === 0) return '/'
    return clean.slice(0, i)
  },
  extname(p: string): string {
    const base = basename(p)
    const i = base.lastIndexOf('.')
    if (i <= 0) return ''
    return base.slice(i)
  },
  join(...parts: string[]): string {
    return normalize(parts.join('/'))
  },
  resolve(...parts: string[]): string {
    let resolved = ''
    let resolvedAbsolute = false
    const all = parts.slice()
    for (let i = all.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      const p = i >= 0 ? all[i] : ''
      if (!p) continue
      resolvedAbsolute = p.charAt(0) === '/'
      resolved = p.split('/').reverse().join('/')
    }
    if (!resolvedAbsolute) {
      const cwd = '/'
      resolved = cwd.split('/').reverse().join('/') + '/' + resolved
    }
    resolved = normalize(resolved)
    if (resolved === '') return '/'
    return resolved
  },
  normalize(p: string): string {
    if (!p) return '.'
    const isAbsolute = p.charAt(0) === '/'
    const trailing = p.slice(-1) === '/'
    const parts = normalizeArray(p.split('/'), !isAbsolute)
    let out = parts.join('/')
    if (!out && !isAbsolute) out = '.'
    if (out && trailing) out += '/'
    if (isAbsolute) out = '/' + out
    return out === '//' ? '/' : out
  },
  isAbsolute(p: string): boolean {
    return p.charAt(0) === '/'
  },
  relative(from: string, to: string): string {
    const fromParts = normalizeArray(from.split('/'), false)
    const toParts = normalizeArray(to.split('/'), false)
    let i = 0
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++
    const up = fromParts.length - i
    if (up === 0) return toParts.slice(i).join('/') || '.'
    return '..' + '/'.repeat(up - 1) + (toParts.slice(i).length ? '/' + toParts.slice(i).join('/') : '')
  },
  parse(p: string): { root: string; dir: string; base: string; ext: string; name: string } {
    const isAbsolute = p.charAt(0) === '/'
    const base = posix.basename(p)
    const ext = posix.extname(p)
    return {
      root: isAbsolute ? '/' : '',
      dir: isAbsolute ? (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '/') : posix.dirname(p),
      base,
      ext,
      name: ext ? base.slice(0, -ext.length) : base,
    }
  },
  format(o: { root?: string; dir?: string; base?: string; ext?: string; name?: string }): string {
    const base = o.base ?? (o.name ?? '') + (o.ext ?? '')
    if (o.dir) return o.dir + '/' + base
    return base
  },
  toNamespacedPath: (p: string) => p,
  win32: {} as Record<string, unknown>,
}

function win32(path: string): string {
  return path.replace(/\//g, '\\')
}

export function makePathPolyfill(): Record<string, unknown> {
  const p = {
    ...posix,
    win32: {
      sep: '\\',
      delimiter: ';',
      basename: (x: string) => win32Path(x).basename,
      dirname: (x: string) => win32Path(x).dirname,
      extname: (x: string) => win32Path(x).extname,
      join: (...a: string[]) => win32(posix.join(...a.map(win32))),
      resolve: (...a: string[]) => win32(posix.resolve(...a.map(win32))),
      normalize: (x: string) => win32(posix.normalize(win32(x))),
      isAbsolute: (x: string) => win32(x).startsWith('\\') || /^[A-Za-z]:\\/.test(x),
      relative: (f: string, t: string) => win32(posix.relative(win32(f), win32(t))),
      parse: (x: string) => {
        const pp = win32Path(x)
        return { root: pp.root, dir: pp.dirname, base: pp.basename, ext: pp.extname, name: pp.name }
      },
      format: (o: any) => win32(posix.format(o)),
      toNamespacedPath: (x: string) => x,
    },
  }
  return p

  function win32Path(x: string) {
    const w = win32(x)
    return {
      basename: posix.basename(w.replace(/\\/g, '/')),
      dirname: w.includes('\\') ? w.slice(0, w.lastIndexOf('\\')) : '.',
      extname: posix.extname(w.replace(/\\/g, '/')),
      name: (() => {
        const b = posix.basename(w.replace(/\\/g, '/'))
        const e = posix.extname(b)
        return e ? b.slice(0, -e.length) : b
      })(),
      root: /^[A-Za-z]:\\/.test(w) ? w.slice(0, 3) : w.startsWith('\\') ? '\\' : '',
    }
  }
}

const pathPolyfill = makePathPolyfill()
const { basename, join, normalize, resolve, dirname, extname } = posix

// ---------------------------------------------------------------------------
// os, util, events, crypto, url, assert, process, stream, zlib
// ---------------------------------------------------------------------------

class EventEmitter {
  private listeners = new Map<string, ((...a: any[]) => void)[]>()
  on = (ev: string, cb: (...a: any[]) => void) => {
    const arr = this.listeners.get(ev) || []
    arr.push(cb)
    this.listeners.set(ev, arr)
    return this
  }
  once = (ev: string, cb: (...a: any[]) => void) => {
    const wrapper = (...a: any[]) => {
      this.off(ev, wrapper)
      cb(...a)
    }
    this.on(ev, wrapper)
    return this
  }
  off = (ev: string, cb: (...a: any[]) => void) => {
    const arr = this.listeners.get(ev)
    if (arr) this.listeners.set(ev, arr.filter((f) => f !== cb))
    return this
  }
  removeListener = this.off
  emit = (ev: string, ...a: any[]): boolean => {
    const arr = this.listeners.get(ev)
    if (!arr?.length) return false
    for (const cb of arr.slice()) cb(...a)
    return true
  }
  addListener = this.on
  removeAllListeners = (ev?: string) => {
    if (ev) this.listeners.delete(ev)
    else this.listeners.clear()
    return this
  }
  getListeners = (ev: string) => this.listeners.get(ev) || []
  listenerCount = (ev: string) => this.listeners.get(ev)?.length || 0
  setMaxListeners = () => this
}

const utilPolyfill = {
  promisify(fn: (...a: any[]) => void): (...a: any[]) => Promise<any> {
    return (...args: any[]) =>
      new Promise((resolve, reject) => {
        fn(...args, (err: any, ...rest: any[]) => {
          if (err) reject(err)
          else resolve(rest.length > 1 ? rest : rest[0])
        })
      })
  },
  inspect(o: unknown): string {
    try {
      return JSON.stringify(o)
    } catch {
      return String(o)
    }
  },
  format(...a: any[]): string {
    if (a.length === 0) return ''
    const fmt = a[0]
    if (typeof fmt !== 'string') return a.join(' ')
    let i = 1
    return fmt.replace(/%[sdifj%]/g, (m) => {
      if (m === '%%') return '%'
      const v = a[i++]
      if (m === 's') return String(v)
      if (m === 'd' || m === 'i') return String(Math.trunc(Number(v) || 0))
      if (m === 'j') {
        try {
          return JSON.stringify(v)
        } catch {
          return String(v)
        }
      }
      return String(v)
    })
  },
  inherits(ctor: any, superCtor: any) {
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype)
    ctor.super_ = superCtor
  },
  isString: (x: unknown) => typeof x === 'string',
  isArray: Array.isArray,
  isObject: (x: unknown) => typeof x === 'object' && x !== null,
  deprecate: (fn: (...a: any[]) => any) => fn,
  types: {
    isString: (x: unknown) => typeof x === 'string',
    isNumber: (x: unknown) => typeof x === 'number',
    isBoolean: (x: unknown) => typeof x === 'boolean',
    isArray: Array.isArray,
    isObject: (x: unknown) => typeof x === 'object' && x !== null,
    isFunction: (x: unknown) => typeof x === 'function',
  },
}

const osPolyfill = {
  EOL: '\n',
  platform: 'win32',
  release: () => '10.0.0',
  type: () => 'Windows_NT',
  arch: () => 'x64',
  homedir: () => 'C:/Users/Usuario',
  tmpdir: () => '/tmp',
  cpus: () => [{ model: 'Nova CPU', speed: 3000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }],
  totalmem: () => 16 * 1024 ** 3,
  freemem: () => 8 * 1024 ** 3,
  hostname: () => 'nova',
  userInfo: () => ({ username: 'nova', uid: 0, gid: 0, shell: null, homedir: 'C:/Users/Usuario' }),
  networkInterfaces: () => ({}),
  endianness: () => 'LE',
  loadavg: () => [0, 0, 0],
  uptime: () => 0,
  cwd: () => '/',
}

const cryptoPolyfill: Record<string, unknown> = {
  randomBytes(size: number): Uint8Array {
    const out = new Uint8Array(size)
    if (typeof globalThis.crypto !== 'undefined') globalThis.crypto.getRandomValues(out)
    return out
  },
  randomUUID(): string {
    const c = globalThis.crypto as { randomUUID?: () => string } | undefined
    return typeof c?.randomUUID === 'function' ? c.randomUUID() : 'nova-' + Math.random().toString(16).slice(2)
  },
  createHash: () => new Hash(),
  getHashes: () => ['sha256', 'sha1', 'md5'],
  createHmac: () => new Hash(),
}

class Hash {
  private buffer = ''
  update(data: string | Uint8Array): this {
    this.buffer += typeof data === 'string' ? data : new TextDecoder().decode(data)
    return this
  }
  digest(enc?: string): string | Uint8Array {
    const bytes = sha256Bytes(this.buffer)
    if (enc === 'hex') return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
    if (enc === 'base64') return bytesToBase64(bytes)
    return bytes
  }
}

function sha256Bytes(msg: string): Uint8Array {
  // SHA-256 mínimo en JS (puro), suficiente para la mayoría de usos de hashing
  let h: number[] = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]
  const data = new TextEncoder().encode(msg)
  const bitLen = data.length * 8
  const padded = new Uint8Array((((data.length + 8) >> 6) + 1) * 64)
  padded.set(data)
  padded[data.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 4, bitLen >>> 0)
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32))
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array<number>(64)
    const v = new DataView(padded.buffer)
    for (let j = 0; j < 16; j++) w[j] = v.getUint32(i + j * 4)
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3)
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10)
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[j] + w[j]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g; g = f; f = e
      e = (d + t1) >>> 0
      d = c; c = b; b = a
      a = (t1 + t2) >>> 0
    }
    h = h.map((x, idx) => (x + [a, b, c, d, e, f, g, hh][idx]) >>> 0)
  }
  return new Uint8Array(h.flatMap((x) => [x >>> 24, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff]))
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

const urlPolyfill: Record<string, unknown> = {
  URL,
  URLSearchParams,
  fileURLToPath: (u: string) => String(u).replace(/^file:\/\/\//, '/').replace(/^file:\/\//, ''),
  pathToFileURL: (p: string) => 'file:///' + p.replace(/\\/g, '/').replace(/^\//, ''),
  domainToASCII: (d: string) => d,
  domainToUnicode: (d: string) => d,
}

const assertPolyfill: Record<string, unknown> = {
  ok(v: unknown, msg?: string) {
    if (!v) throw new Error(msg || 'Assertion failed')
  },
  strictEqual(a: unknown, b: unknown, msg?: string) {
    if (a !== b) throw new Error(msg || `Assertion failed: ${String(a)} !== ${String(b)}`)
  },
  notStrictEqual(a: unknown, b: unknown) {
    if (a === b) throw new Error(`Assertion failed: ${String(a)} === ${String(b)}`)
  },
  deepStrictEqual(a: unknown, b: unknown, msg?: string) {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep assertion failed')
  },
  fail(msg?: string) {
    throw new Error(msg || 'Assertion failed')
  },
}

const streamPolyfill: Record<string, unknown> = {
  EventEmitter,
  PassThrough: class PassThrough extends EventEmitter {
    private chunks: unknown[] = []
    write(chunk: unknown): boolean {
      this.chunks.push(chunk)
      this.emit('data', chunk)
      return true
    }
    end() {
      this.emit('end')
    }
    pipe() {}
    pause() {}
    resume() {}
    read() {
      return this.chunks.shift()
    }
    setEncoding() {}
  },
  Readable: class Readable extends EventEmitter {
    push() {}
    pipe() {}
    pause() {}
    resume() {}
  },
  Writable: class Writable extends EventEmitter {
    write() {
      return true
    }
    end() {}
  },
  Transform: class Transform extends EventEmitter {
    write() {
      return true
    }
    end() {}
    pipe() {}
  },
  Duplex: class Duplex extends EventEmitter {
    write() {
      return true
    }
    end() {}
    pipe() {}
  },
}

const zlibPolyfill: Record<string, unknown> = {
  gzipSync: (d: string | Uint8Array) => gzipSync(d instanceof Uint8Array ? d : strToU8(d as string)),
  gunzipSync: (d: Uint8Array) => gunzipSync(d),
  inflateSync: (d: Uint8Array) => inflateSync(d),
  deflateSync: (d: string | Uint8Array) => deflateSync(d instanceof Uint8Array ? d : strToU8(d as string)),
  inflateRawSync: (d: Uint8Array) => inflateSync(d),
  deflateRawSync: (d: string | Uint8Array) => deflateSync(d instanceof Uint8Array ? d : strToU8(d as string)),
  constants: {},
}

const fsPolyfill = {
  existsSync: (p: string) => extFs.existsSync(p),
  readFileSync: (p: string, enc?: string) => extFs.readFileSync(p, enc as never),
  readdirSync: (p: string) => extFs.readdirSync(p),
  statSync: (p: string) => extFs.statSync(p),
  lstatSync: (p: string) => extFs.statSync(p),
  writeFileSync: (p: string, data: string | Uint8Array) => {
    extFs.writeFile(p, data).catch(() => {})
  },
  appendFileSync: (p: string, data: string | Uint8Array) => {
    const existing = extFs.existsSync(p) ? String(extFs.readFileSync(p, 'utf8')) : ''
    extFs.writeFile(p, existing + (typeof data === 'string' ? data : new TextDecoder().decode(data))).catch(() => {})
  },
  mkdirSync: (p: string) => {
    extFs.mkdir(p).catch(() => {})
  },
  unlinkSync: (p: string) => {
    extFs.rm(p).catch(() => {})
  },
  rmSync: (p: string) => {
    extFs.rm(p).catch(() => {})
  },
  readFile: (p: string, ...rest: any[]) => {
    const cb = typeof rest[rest.length - 1] === 'function' ? rest.pop() : null
    const enc = typeof rest[0] === 'string' ? rest[0] : undefined
    const pr = extFs.readFile(p, enc as never).then((d) => cb?.(null, d)).catch((e) => cb?.(e))
    return cb ? pr : extFs.readFile(p, enc as never)
  },
  writeFile: (p: string, data: string | Uint8Array, ...rest: any[]) => {
    const cb = typeof rest[rest.length - 1] === 'function' ? rest.pop() : null
    const pr = extFs.writeFile(p, data).then(() => cb?.(null)).catch((e) => cb?.(e))
    return cb ? pr : pr
  },
  readdir: (p: string, ...rest: any[]) => {
    const cb = typeof rest[rest.length - 1] === 'function' ? rest.pop() : null
    const enc = typeof rest[0] === 'string' ? rest[0] : undefined
    void enc
    const result = Promise.resolve(extFs.readdirSync(p))
    if (cb) result.then((d) => cb(null, d)).catch((e) => cb(e))
    return result
  },
  mkdir: (p: string, ...rest: any[]) => {
    const cb = typeof rest[rest.length - 1] === 'function' ? rest.pop() : null
    const pr = extFs.mkdir(p).then(() => cb?.(null)).catch((e) => cb?.(e))
    return cb ? pr : pr
  },
  rm: (p: string, opts?: any, cb?: any) => {
    if (typeof opts === 'function') cb = opts
    const pr = extFs.rm(p).then(() => cb?.(null)).catch((e) => cb?.(e))
    return cb ? pr : pr
  },
  unlink: (p: string, cb?: any) => fsPolyfill.rm(p, cb),
  rename: (from: string, to: string, cb?: any) => {
    const pr = extFs.rename(from, to).then(() => cb?.(null)).catch((e) => cb?.(e))
    return cb ? pr : pr
  },
  watch: (p: string, opts: any, cb?: any) => {
    const emitter = new EventEmitter()
    if (typeof opts === 'function') cb = opts
    const fn = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d) return
      const isParent = String(d.path).replace(/\\/g, '/').startsWith(String(p).replace(/\\/g, '/'))
      if (isParent) {
        const ev = d.kind === 'created' ? 'add' : d.kind === 'deleted' ? 'unlink' : 'change'
        emitter.emit(ev, d.path)
        if (cb) cb(ev, d.path)
      }
    }
    window.addEventListener('nova:fs-change', fn)
    return {
      on: emitter.on.bind(emitter),
      close: () => window.removeEventListener('nova:fs-change', fn),
      addListener: emitter.on.bind(emitter),
    }
  },
  promises: {},
}

const processPolyfill: Record<string, unknown> = {
  env: {} as Record<string, string>,
  platform: 'win32',
  version: 'v18.0.0',
  versions: { node: '18.0.0' },
  nextTick: (cb: (...a: any[]) => void, ...args: any[]) => queueMicrotask(() => cb(...args)),
  cwd: () => '/',
  chdir: () => {},
  argv: [],
  exit: () => {},
  on: () => {},
  once: () => {},
  off: () => {},
  listeners: () => [],
  removeListener: () => {},
  title: 'nova',
  pid: 1,
  uptime: () => 0,
  hrtime: (prev?: number[]) => {
    const t = performance.now()
    const ns = Math.round(t * 1e6)
    return prev ? [0, Math.max(0, ns - prev[1])] : [0, ns]
  },
  memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }),
  stdout: {
    write: (s: string) => {
      console.log(String(s).replace(/\n$/, ''))
      return true
    },
  },
  stderr: {
    write: (s: string) => {
      console.warn(String(s).replace(/\n$/, ''))
      return true
    },
  },
  stdin: { on: () => {}, setEncoding: () => {}, pause: () => {}, resume: () => {} },
}

const childProcessPolyfill: Record<string, unknown> = {
  execSync: () => {
    throw new Error('Nova: child_process no está disponible en el navegador. Usa la app de escritorio.')
  },
  spawnSync: () => ({ status: 1, stdout: '', stderr: 'child_process no disponible' }),
  exec: (_cmd: string, cb?: (err: any, stdout: string, stderr: string) => void) => {
    if (cb) cb(new Error('child_process no disponible'), '', '')
  },
  spawn: () => ({ on: () => {}, stdout: { on: () => {}, pipe: () => {} }, stderr: { on: () => {}, pipe: () => {} }, stdin: { write: () => {} }, kill: () => {} }),
}

const httpPolyfill: Record<string, unknown> = {
  createServer: () => new ServerStub(),
  request: () => {
    throw new Error('Nova: http.request no está soportado en el navegador')
  },
  get: () => {
    throw new Error('Nova: http.get no está soportado en el navegador')
  },
}

class ServerStub extends EventEmitter {
  listen = (port: number | (() => void), cb?: () => void) => {
    if (typeof port === 'function') {
      cb = port
      port = 0
    }
    this.emit('listening')
    if (cb) cb()
    return this
  }
  close = (cb?: () => void) => {
    if (cb) cb()
    return this
  }
  address = () => ({ address: '127.0.0.1', port: 0, family: 'IPv4' })
}

export interface NodeBuiltins {
  path: Record<string, unknown>
  'path/posix': Record<string, unknown>
  'path/win32': Record<string, unknown>
  os: Record<string, unknown>
  util: Record<string, unknown>
  events: { EventEmitter: typeof EventEmitter }
  crypto: Record<string, unknown>
  url: Record<string, unknown>
  assert: Record<string, unknown>
  stream: Record<string, unknown>
  zlib: Record<string, unknown>
  fs: Record<string, unknown>
  'fs/promises': Record<string, unknown>
  process: Record<string, unknown>
  child_process: Record<string, unknown>
  http: Record<string, unknown>
  https: Record<string, unknown>
  net: Record<string, unknown>
  tls: Record<string, unknown>
  buffer: { Buffer: typeof Buffer }
  console: typeof console
  string_decoder: Record<string, unknown>
}

export function getNodeBuiltins(): NodeBuiltins {
  return {
    path: pathPolyfill,
    'path/posix': pathPolyfill,
    'path/win32': pathPolyfill.win32 as Record<string, unknown>,
    os: osPolyfill,
    util: utilPolyfill,
    events: { EventEmitter },
    crypto: cryptoPolyfill,
    url: urlPolyfill,
    assert: assertPolyfill,
    stream: streamPolyfill,
    zlib: zlibPolyfill,
    fs: fsPolyfill,
    'fs/promises': {
      readFile: fsPolyfill.readFile,
      writeFile: fsPolyfill.writeFile,
      readdir: fsPolyfill.readdir,
      mkdir: fsPolyfill.mkdir,
      rm: fsPolyfill.rm,
      unlink: fsPolyfill.unlink,
      stat: (p: string) => Promise.resolve(extFs.statSync(p)),
      access: (p: string) => (extFs.existsSync(p) ? Promise.resolve() : Promise.reject(new Error('ENOENT'))),
      rename: fsPolyfill.rename,
    },
    process: processPolyfill,
    child_process: childProcessPolyfill,
    http: httpPolyfill,
    https: httpPolyfill,
    net: httpPolyfill,
    tls: {},
    buffer: { Buffer },
    console,
    string_decoder: {
      StringDecoder: class {
        write(b: Uint8Array): string {
          return new TextDecoder().decode(b)
        }
        end(): string {
          return ''
        }
      },
    },
  }
}
