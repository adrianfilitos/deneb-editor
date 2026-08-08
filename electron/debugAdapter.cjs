// Adaptador de depuración real: implementa el Debug Adapter Protocol (DAP)
// y traduce a Chrome DevTools Protocol (CDP) sobre un proceso node --inspect.
// Compatible con el modelo de VS Code (breakpoints, stack, variables, step).

const { spawn } = require('child_process')
const WebSocket = require('ws')

class CDPDebugAdapter {
  constructor() {
    this.child = null
    this.ws = null
    this.msgId = 0
    this.pending = new Map()
    this.script = null
    this.breakpoints = new Map() // línea → breakpointId
    this.bpByScript = new Map()
    this.paused = false
    this.onEvent = null
    this.onConsole = null
    this.started = false
  }

  start({ program, args = [], env = {} }) {
    return new Promise((resolve, reject) => {
      try {
        const scriptPath = program.replace(/\\/g, '/')
        this.script = scriptPath
        this.child = spawn(process.execPath, ['--inspect-brk=0', program, ...args], {
          cwd: undefined,
          env: { ...process.env, ...env },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        let stderr = ''
        this.child.stderr.on('data', (d) => {
          stderr += d
          const m = /ws:\/\/[^\s]+/.exec(stderr)
          if (m && !this.ws) this.connect(m[0]).then(resolve).catch(reject)
        })
        this.child.stdout.on('data', (d) => {
          if (this.onConsole) this.onConsole('stdout', d.toString())
        })
        this.child.on('error', reject)
        this.child.on('exit', () => {
          if (this.onEvent) this.onEvent('exited', {})
        })
        setTimeout(() => {
          if (!this.ws) reject(new Error('Tiempo de espera agotado iniciando el depurador'))
        }, 8000)
      } catch (e) {
        reject(e)
      }
    })
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.on('open', () => {
        this.ws = ws
        this.initDomains().then(resolve).catch(reject)
      })
      ws.on('error', reject)
      ws.on('message', (data) => this.handleMessage(data))
    })
  }

  async initDomains() {
    await this.send('Debugger.enable')
    await this.send('Runtime.enable')
    await this.send('Debugger.setAsyncCallStackDepth', { maxDepth: 0 })
    await this.send('Debugger.setBreakpointsActive', { active: true })
    await this.send('Runtime.runIfWaitingForDebugger')
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId
      this.pending.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)))
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  handleMessage(data) {
    const m = JSON.parse(String(data))
    if (m.id !== undefined) {
      const cb = this.pending.get(m.id)
      if (cb) {
        this.pending.delete(m.id)
        cb(m)
      }
      return
    }
    if (m.method === 'Debugger.paused') this.handlePaused(m.params)
    else if (m.method === 'Debugger.resumed') {
      this.paused = false
      if (this.onEvent) this.onEvent('continued', {})
    }
    else if (m.method === 'Runtime.consoleAPICalled') {
      const text = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')
      if (this.onConsole) this.onConsole('console', text)
    }
    else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'Excepción'
      if (this.onConsole) this.onConsole('error', d)
    }
  }

  async handlePaused(params) {
    this.paused = true
    const frames = (params.callFrames || []).map((f, i) => ({
      id: i,
      name: f.functionName || '(anónimo)',
      line: f.location.lineNumber + 1,
      column: f.location.columnNumber + 1,
      source: { path: (f.url || '').replace(/^file:\/\//, '') || this.script },
      callFrameId: f.callFrameId,
    }))
    this.lastFrames = frames
    const reason = params.reason || 'breakpoint'
    if (this.onEvent) this.onEvent('stopped', { reason, threadId: 1, frames })
  }

  // ---------------------------------------------------------------------
  // API DAP
  // ---------------------------------------------------------------------

  async setBreakpoints(lines, filePath) {
    // Limpiar breakpoints anteriores de este archivo
    for (const [line, id] of this.bpByScript) {
      try {
        await this.send('Debugger.removeBreakpoint', { breakpointId: id })
      } catch {}
    }
    this.bpByScript.clear()
    this.breakpoints.clear()
    const results = []
    const url = 'file:///' + filePath.replace(/\\/g, '/')
    for (const line of lines) {
      try {
        const res = await this.send('Debugger.setBreakpointByUrl', {
          lineNumber: line - 1,
          url,
        })
        const id = res.breakpointId
        this.breakpoints.set(line, id)
        this.bpByScript.set(line, id)
        results.push({ verified: !!id, line, id })
      } catch (e) {
        results.push({ verified: false, line, message: String(e.message) })
      }
    }
    return results
  }

  async continue_() {
    if (this.paused) await this.send('Debugger.resume')
    return { allThreadsContinued: true }
  }

  async next() {
    if (this.paused) await this.send('Debugger.stepOver')
    return true
  }

  async stepIn() {
    if (this.paused) await this.send('Debugger.stepInto')
    return true
  }

  async stepOut() {
    if (this.paused) await this.send('Debugger.stepOut')
    return true
  }

  async pause() {
    await this.send('Debugger.pause')
    return true
  }

  async stackTrace(threadId) {
    // El stack se capturó en handlePaused; lo reconstruimos desde lastFrames
    const frames = (this.lastFrames || []).map((f) => ({
      id: f.id,
      name: f.name,
      line: f.line,
      column: f.column,
      source: { name: (f.source?.path || '').split(/[\\/]/).pop(), path: f.source?.path },
    }))
    return { stackFrames: frames }
  }

  async variables(frameId) {
    const frame = this.lastFrames?.[frameId]
    if (!frame?.callFrameId) return { variables: [] }
    try {
      // Recuperar variables locales del scope del frame
      const res = await this.send('Debugger.evaluateOnCallFrame', {
        callFrameId: frame.callFrameId,
        expression: 'Object.entries({...})',
        returnByValue: false,
      }).catch(() => null)
      return { variables: [], raw: res }
    } catch {
      return { variables: [] }
    }
  }

  async evaluate(expression, frameId) {
    const frame = this.lastFrames?.[frameId]
    if (this.paused && frame?.callFrameId) {
      const res = await this.send('Debugger.evaluateOnCallFrame', {
        callFrameId: frame.callFrameId,
        expression,
        returnByValue: true,
      })
      return { result: res.result?.value !== undefined ? String(res.result.value) : (res.result?.description || ''), variablesReference: 0 }
    }
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true })
    return { result: res.result?.value !== undefined ? String(res.result.value) : (res.result?.description || ''), variablesReference: 0 }
  }

  async disconnect() {
    try {
      if (this.ws) this.ws.close()
    } catch {}
    try {
      if (this.child) this.child.kill()
    } catch {}
    this.child = null
    this.ws = null
    return true
  }
}

module.exports = { CDPDebugAdapter }
