const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')
const liveServer = require('./liveServer.cjs')
const { CDPDebugAdapter } = require('./debugAdapter.cjs')

const isDev = process.env.DENEB_DEV === '1'
const DEV_URL = 'http://127.0.0.1:5173'

// Portapapel portable: electron-builder fija PORTABLE_EXECUTABLE_FILE solo en la build portable
const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE
const updatesSupported = app.isPackaged && !isPortable && !isDev

let mainWindow = null
let workspaceRoot = null
let termProc = null
let termId = 0

function parseLaunchArgs() {
  const raw = process.argv.slice(app.isPackaged ? 1 : 2)
  const args = raw.filter((a) => a !== '.')
  const openAi = args.includes('--ai')
  const target = args.find((a) => a && !a.startsWith('-') && fs.existsSync(a))
  let kind = null
  if (target) {
    try {
      kind = fs.statSync(target).isDirectory() ? 'directory' : 'file'
    } catch {
      kind = null
    }
  }
  return { openAi, target: target && kind ? { abs: path.resolve(target), kind } : null }
}

const pendingLaunch = parseLaunchArgs()

function sendToWindow(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

// ---------------------------------------------------------------------------
// Sistema de actualizaciones (electron-updater + GitHub Releases)
// ---------------------------------------------------------------------------

function setupAutoUpdater() {
  if (!updatesSupported) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = true
  autoUpdater.logger = {
    info() {},
    warn() {},
    error() {},
    debug() {},
  }

  try {
    autoUpdater.setFeedURL({ provider: 'github', owner: 'adrianfilitos', repo: 'deneb-editor' })
  } catch (e) {
    sendToWindow('deneb:update:status', { type: 'error', message: String(e.message || e) })
    return
  }

  autoUpdater.on('checking-for-update', () => {
    sendToWindow('deneb:update:status', { type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendToWindow('deneb:update:status', { type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', (info) => {
    sendToWindow('deneb:update:status', { type: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (p) => {
    sendToWindow('deneb:update:status', { type: 'downloading', percent: Math.round(p.percent || 0) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendToWindow('deneb:update:status', { type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    sendToWindow('deneb:update:status', { type: 'error', message: String((err && err.message) || err) })
  })

  // Comprobación silenciosa al arrancar (una vez la ventana está lista)
  mainWindow?.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates().catch(() => {})
      } catch {
        // ignore
      }
    }, 8000)
  })
}

function registerUpdateHandlers() {
  ipcMain.handle('deneb:update:version', () => ({
    version: app.getVersion(),
    supported: updatesSupported,
    portable: isPortable,
    packaged: app.isPackaged,
  }))

  ipcMain.on('deneb:update:check', () => {
    if (!updatesSupported) {
      sendToWindow('deneb:update:status', {
        type: 'error',
        message: isPortable
          ? 'La versión portable no se actualiza automáticamente. Descarga la nueva versión desde GitHub Releases.'
          : 'Las actualizaciones automáticas solo están disponibles en la versión instalada.',
      })
      return
    }
    try {
      autoUpdater.checkForUpdates().catch(() => {})
    } catch {
      // ignore
    }
  })

  ipcMain.on('deneb:update:install', () => {
    if (!updatesSupported) return
    try {
      autoUpdater.quitAndInstall(false, true)
    } catch {
      // ignore
    }
  })
}

function terminalShell() {
  if (process.platform === 'win32') {
    return { file: 'powershell.exe', args: ['-NoLogo', '-NoExit', '-Command', '-'], init: '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8\r\n', name: 'PowerShell' }
  }
  const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
  return { file: shell, args: ['-i'], init: 'export LANG="${LANG:-en_US.UTF-8}"\r', name: process.platform === 'darwin' ? 'zsh' : 'bash' }
}

function startTerminal(cwd) {
  try {
    if (termProc) {
      try { termProc.kill() } catch {}
      termProc = null
    }
    const id = ++termId
    const shell = terminalShell()
    const proc = spawn(shell.file, shell.args, {
      cwd: cwd || os.homedir(),
      windowsHide: true,
      env: process.env,
    })
    termProc = proc
    proc.stdout.setEncoding('utf8')
    proc.stderr.setEncoding('utf8')
    proc.stdout.on('data', (d) => {
      if (id === termId) sendToWindow('deneb:term:data', d)
    })
    proc.stderr.on('data', (d) => {
      if (id === termId) sendToWindow('deneb:term:data', d)
    })
    proc.on('error', (e) => {
      if (id === termId) {
        sendToWindow('deneb:term:data', `\r\n[Error al iniciar ${shell.name}: ${e.message}]\r\n`)
      }
    })
    proc.on('exit', () => {
      if (id === termId) {
        termProc = null
        sendToWindow('deneb:term:exit')
      }
    })
    if (proc.stdin && proc.stdin.writable && shell.init) {
      proc.stdin.write(shell.init)
    }
  } catch (e) {
    sendToWindow('deneb:term:data', `\r\n[Error: ${e.message}]\r\n`)
  }
}

function registerWindowHandlers() {
  ipcMain.on('deneb:window:minimize', () => {
    if (mainWindow) mainWindow.minimize()
  })
  ipcMain.on('deneb:window:toggle-maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.on('deneb:window:close', () => {
    if (mainWindow) mainWindow.close()
  })
}

function registerMenuHandlers() {
  const wc = () => mainWindow?.webContents
  ipcMain.on('deneb:menu:undo', () => wc()?.undo())
  ipcMain.on('deneb:menu:redo', () => wc()?.redo())
  ipcMain.on('deneb:menu:cut', () => wc()?.cut())
  ipcMain.on('deneb:menu:copy', () => wc()?.copy())
  ipcMain.on('deneb:menu:paste', () => wc()?.paste())
  ipcMain.on('deneb:menu:select-all', () => wc()?.selectAll())
  ipcMain.on('deneb:menu:reload', () => wc()?.reload())
  ipcMain.on('deneb:menu:devtools', () => wc()?.toggleDevTools())
  ipcMain.on('deneb:menu:zoom-in', () => {
    const w = mainWindow
    if (w) w.webContents.setZoomLevel((w.webContents.getZoomLevel() || 0) + 0.5)
  })
  ipcMain.on('deneb:menu:zoom-out', () => {
    const w = mainWindow
    if (w) w.webContents.setZoomLevel((w.webContents.getZoomLevel() || 0) - 0.5)
  })
  ipcMain.on('deneb:menu:zoom-reset', () => mainWindow?.webContents.setZoomLevel(0))
  ipcMain.on('deneb:menu:fullscreen', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })
  ipcMain.on('deneb:menu:about', () => {
    if (!mainWindow) return
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Deneb',
      message: 'Deneb Editor 1.0.0',
      detail: 'Editor de código con IA integrada.\nHecho con Electron, React, Monaco y Vite.',
    })
  })
}

function registerTerminalHandlers() {
  ipcMain.handle('deneb:term:start', (_e, cwd) => {
    startTerminal(cwd)
    return true
  })
  ipcMain.handle('deneb:term:write', (_e, data) => {
    if (termProc && termProc.stdin && termProc.stdin.writable) {
      termProc.stdin.write(data)
    }
    return true
  })
  ipcMain.handle('deneb:term:kill', () => {
    if (termProc) {
      try { termProc.kill() } catch {}
      termProc = null
    }
    return true
  })
}

function guard(absPath) {
  if (!workspaceRoot) throw new Error('Sin espacio de trabajo abierto')
  const target = path.resolve(absPath)
  const root = path.resolve(workspaceRoot)
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Ruta fuera del espacio de trabajo')
  }
  return target
}

function runGit(args, opts = {}) {
  return new Promise((resolve) => {
    if (!workspaceRoot) {
      resolve({ ok: false, out: '', err: 'Sin espacio de trabajo abierto' })
      return
    }
    const child = spawn('git', args, { cwd: workspaceRoot, windowsHide: true, env: process.env })
    let out = ''
    let err = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => resolve({ ok: false, out, err: `No se pudo ejecutar git: ${e.message}` }))
    child.on('close', (code) => resolve({ ok: code === 0, out, err }))
  })
}

function registerGitHandlers() {
  ipcMain.handle('deneb:git:available', async () => {
    if (!workspaceRoot) return false
    try {
      const r = await runGit(['rev-parse', '--is-inside-work-tree'])
      return r.ok && r.out.trim() === 'true'
    } catch {
      return false
    }
  })

  ipcMain.handle('deneb:git:status', async () => {
    const [st, br, lg] = await Promise.all([
      runGit(['status', '--porcelain=v1', '-uall', '-b']),
      runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
      runGit(['log', '--oneline', '-10']),
    ])
    return {
      ok: st.ok,
      status: st.out,
      branch: br.ok ? br.out.trim() : '',
      log: lg.ok ? lg.out.trim() : '',
      error: (!st.ok && st.err) || (!br.ok && br.err) || '',
    }
  })

  ipcMain.handle('deneb:git:add', async (_e, paths) => {
    const list = Array.isArray(paths) ? paths : [paths]
    const r = await runGit(['add', '--', ...list])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:reset', async (_e, paths) => {
    const list = Array.isArray(paths) ? paths : [paths]
    const r = await runGit(['reset', '--', ...list])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:commit', async (_e, msg) => {
    if (!msg || !msg.trim()) return { ok: false, out: '', error: 'El mensaje del commit no puede estar vacío' }
    const r = await runGit(['commit', '-m', msg.trim()])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:branches', async () => {
    const [list, cur] = await Promise.all([
      runGit(['branch', '-a']),
      runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    ])
    return {
      ok: list.ok,
      branches: list.out
        .split('\n')
        .map((s) => s.trim().replace(/^\* /, '').replace(/^remotes\//, 'remotes/'))
        .filter(Boolean),
      current: cur.ok ? cur.out.trim() : '',
      error: list.err,
    }
  })

  ipcMain.handle('deneb:git:checkout', async (_e, name) => {
    const r = await runGit(['checkout', String(name)])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:create-branch', async (_e, name) => {
    const n = String(name || '').trim()
    if (!n) return { ok: false, out: '', error: 'Nombre de rama vacío' }
    const r = await runGit(['checkout', '-b', n])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:diff', async (_e, file, staged) => {
    const args = ['diff', '--no-color', '-M', '--ignore-space-at-eol']
    if (staged) args.push('--cached')
    args.push('--', String(file))
    const r = await runGit(args)
    return { ok: r.ok, diff: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:push', async () => {
    const r = await runGit(['push'])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:pull', async () => {
    const r = await runGit(['pull'])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:fetch', async () => {
    const r = await runGit(['fetch'])
    return { ok: r.ok, out: r.out, error: r.err }
  })

  ipcMain.handle('deneb:git:log', async () => {
    const r = await runGit(['log', '--oneline', '-15'])
    return { ok: r.ok, log: r.out, error: r.err }
  })
}

function registerExtHandlers() {
  const extDir = () => path.join(app.getPath('userData'), 'extensions')

  ipcMain.handle('deneb:ext:install', async (_e, downloadUrl, filename) => {
    try {
      const dir = extDir()
      fs.mkdirSync(dir, { recursive: true })
      const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')
      const target = path.join(dir, safe)
      const res = await fetch(String(downloadUrl))
      if (!res.ok) throw new Error(`HTTP ${res.status} al descargar`)
      const buf = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(target, buf)
      return { ok: true, path: target, size: buf.length }
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) }
    }
  })

  ipcMain.handle('deneb:ext:save', async (_e, filename, data) => {
    try {
      const dir = extDir()
      fs.mkdirSync(dir, { recursive: true })
      const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')
      const target = path.join(dir, safe)
      const buf = Buffer.from(data)
      fs.writeFileSync(target, buf)
      return { ok: true, path: target, size: buf.length }
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) }
    }
  })

  ipcMain.handle('deneb:ext:installed', async () => {
    try {
      const dir = extDir()
      if (!fs.existsSync(dir)) return []
      return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.vsix'))
        .map((f) => ({ file: f, size: fs.statSync(path.join(dir, f)).size }))
    } catch {
      return []
    }
  })

  ipcMain.handle('deneb:ext:dir', () => extDir())
}

function registerLiveServerHandlers() {
  ipcMain.handle('deneb:liveserver:start', async (_e, port, rootAbs) => {
    const r = await liveServer.start(Number(port) || 5500, String(rootAbs))
    if (r.ok) sendToWindow('deneb:liveserver:status', liveServer.status())
    return r
  })
  ipcMain.handle('deneb:liveserver:stop', () => {
    const r = liveServer.stop()
    sendToWindow('deneb:liveserver:status', { running: false })
    return r
  })
  ipcMain.handle('deneb:liveserver:status', () => liveServer.status())
}

function registerDebugHandlers() {
  const adapter = new CDPDebugAdapter()
  adapter.onEvent = (type, data) => sendToWindow('deneb:debug:event', { type, data })
  adapter.onConsole = (channel, text) => sendToWindow('deneb:debug:console', { channel, text })

  ipcMain.handle('deneb:debug:start', async (_e, cfg) => {
    try {
      await adapter.start(cfg)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
  ipcMain.handle('deneb:debug:setBreakpoints', (_e, lines, filePath) =>
    adapter.setBreakpoints(lines || [], filePath || ''),
  )
  ipcMain.handle('deneb:debug:continue', () => adapter.continue_())
  ipcMain.handle('deneb:debug:next', () => adapter.next())
  ipcMain.handle('deneb:debug:stepIn', () => adapter.stepIn())
  ipcMain.handle('deneb:debug:stepOut', () => adapter.stepOut())
  ipcMain.handle('deneb:debug:pause', () => adapter.pause())
  ipcMain.handle('deneb:debug:stackTrace', (_e, threadId) => adapter.stackTrace(threadId))
  ipcMain.handle('deneb:debug:evaluate', (_e, expression, frameId) => adapter.evaluate(expression, frameId))
  ipcMain.handle('deneb:debug:disconnect', () => adapter.disconnect())
}

function registerFsHandlers() {
  ipcMain.handle('deneb:fs:open-workspace', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Abrir carpeta',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (res.canceled || !res.filePaths.length) return null
    workspaceRoot = res.filePaths[0]
    return workspaceRoot
  })

  ipcMain.handle('deneb:fs:set-workspace', (_e, abs) => {
    try {
      if (typeof abs === 'string' && fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
        workspaceRoot = abs
        return true
      }
    } catch {
      // ignore
    }
    return false
  })

  ipcMain.handle('deneb:fs:list', async (_e, absPath) => {
    const dir = guard(absPath)
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    return entries.map((en) => ({
      name: en.name,
      kind: en.isDirectory() ? 'directory' : 'file',
      absPath: path.join(dir, en.name),
    }))
  })

  ipcMain.handle('deneb:fs:stat', async (_e, absPath) => {
    const target = guard(absPath)
    try {
      const st = await fs.promises.stat(target)
      return {
        name: path.basename(target),
        kind: st.isDirectory() ? 'directory' : 'file',
        absPath: target,
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('deneb:fs:read-file', async (_e, absPath) => {
    const file = guard(absPath)
    return await fs.promises.readFile(file, 'utf8')
  })

  ipcMain.handle('deneb:fs:write-file', async (_e, absPath, content) => {
    const file = guard(absPath)
    await fs.promises.writeFile(file, content, 'utf8')
    return true
  })

  ipcMain.handle('deneb:fs:create', async (_e, parentAbs, name, kind) => {
    const parent = guard(parentAbs)
    const target = path.join(parent, name)
    if (kind === 'file') await fs.promises.writeFile(target, '', 'utf8')
    else await fs.promises.mkdir(target)
    return { name, kind, absPath: target }
  })

  ipcMain.handle('deneb:fs:remove', async (_e, absPath) => {
    const target = guard(absPath)
    await fs.promises.rm(target, { recursive: true, force: false })
    return true
  })

  ipcMain.handle('deneb:fs:rename', async (_e, parentAbs, oldName, newName) => {
    const parent = guard(parentAbs)
    await fs.promises.rename(path.join(parent, oldName), path.join(parent, newName))
    return true
  })

  ipcMain.handle('deneb:fs:walk', async (_e, absPath) => {
    const root = guard(absPath)
    const out = []
    const stack = [root]
    while (stack.length) {
      const cur = stack.pop()
      let entries
      try {
        entries = await fs.promises.readdir(cur, { withFileTypes: true })
      } catch {
        continue
      }
      for (const en of entries) {
        const p = path.join(cur, en.name)
        if (en.isDirectory()) stack.push(p)
        else out.push(p)
      }
    }
    return out
  })
  ipcMain.handle('deneb:fs:exec', async (_e, cwd, command) => {
    const dir = cwd && typeof cwd === 'string' && fs.existsSync(cwd) ? cwd : workspaceRoot || os.homedir()
    return await new Promise((resolve) => {
      const winShell = process.platform === 'win32'
      const child = winShell
        ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', String(command)], { cwd: dir, windowsHide: true, env: process.env })
        : spawn('/bin/sh', ['-c', String(command)], { cwd: dir, env: process.env })
      let out = ''
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (d) => (out += d))
      child.stderr.on('data', (d) => (out += d))
      child.on('error', (e) => resolve(winShell ? `Error al iniciar PowerShell: ${e.message}` : `Error al iniciar sh: ${e.message}`))
      const timer = setTimeout(() => {
        try {
          child.kill()
        } catch {
          // ignore
        }
      }, 30000)
      child.on('close', () => {
        clearTimeout(timer)
        resolve(out || '(sin salida)')
      })
    })
  })
}

function buildMenu(win) {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir carpeta…',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToWindow('deneb:open-workspace'),
        },
        { type: 'separator' },
        isDev
          ? { role: 'reload', label: 'Recargar' }
          : { label: 'Recargar', click: () => win.webContents.reload() },
        isDev ? { role: 'toggleDevTools', label: 'Herramientas de desarrollo' } : null,
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ].filter(Boolean),
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Alternar barra lateral',
          click: () => sendToWindow('deneb:toggle-sidebar'),
        },
        {
          label: 'Terminal',
          click: () => sendToWindow('deneb:toggle-terminal'),
        },
        {
          label: 'Problemas',
          click: () => sendToWindow('deneb:toggle-problems'),
        },
        {
          label: 'Asistente de IA',
          click: () => sendToWindow('deneb:show-ai'),
        },
        {
          label: 'Modo Zen',
          click: () => sendToWindow('deneb:toggle-zen'),
        },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Restablecer zoom' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        isDev ? { role: 'toggleDevTools', label: 'Herramientas de desarrollo' } : null,
      ].filter(Boolean),
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Ampliar' },
        { label: 'Cerrar ventana', click: () => win.close() },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Buscar actualizaciones…',
          click: () => {
            if (!updatesSupported) {
              dialog.showMessageBox(win, {
                type: 'info',
                title: 'Deneb',
                message: isPortable
                  ? 'La versión portable no se actualiza automáticamente.'
                  : 'Las actualizaciones automáticas solo están disponibles en la versión instalada.',
                detail: 'Descarga la nueva versión desde GitHub Releases: https://github.com/adrianfilitos/deneb-editor/releases',
              })
              return
            }
            sendToWindow('deneb:update:check')
          },
        },
        {
          label: 'Referencia de atajos',
          click: () => sendToWindow('deneb:show-shortcuts'),
        },
        { type: 'separator' },
        {
          label: 'Acerca de Deneb',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Deneb',
              message: `Deneb Editor ${app.getVersion()}`,
              detail: 'Editor de código con IA integrada.\nHecho con Electron, React, Monaco y Vite.',
            })
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 860,
    minHeight: 540,
    backgroundColor: '#0f111a',
    title: 'Deneb',
    frame: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('maximize', () => sendToWindow('deneb:window:maximized', true))
  mainWindow.on('unmaximize', () => sendToWindow('deneb:window:maximized', false))

  buildMenu(mainWindow)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    const load = () => mainWindow.loadURL(DEV_URL)
    mainWindow.webContents.on('did-fail-load', (_e, code, _desc, validatedURL) => {
      if (validatedURL !== DEV_URL) return
      if (code === -3) return
      setTimeout(load, 700)
    })
    load()
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
    if (!fs.existsSync(indexPath)) {
      const msg = `Falta la compilación:\n${indexPath}\n\nEjecuta primero "npm run build" o usa "npm run electron:dev".`
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Deneb',
        message: 'No se encontró la compilación de la aplicación.',
        detail: msg,
      })
      mainWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(
          `<!doctype html><html><body style="background:#0f111a;color:#d5d9e6;font-family:Segoe UI,sans-serif;padding:40px"><h2>Deneb</h2><p>${msg.replace(/\n/g, '<br/>')}</p></body></html>`,
        )}`,
      )
      return
    }
    mainWindow.loadFile(indexPath)
  }

  if (pendingLaunch.openAi || pendingLaunch.target) {
    mainWindow.webContents.once('did-finish-load', () => {
      if (pendingLaunch.openAi) sendToWindow('deneb:show-ai')
      if (pendingLaunch.target) sendToWindow('deneb:open-path', pendingLaunch.target)
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerFsHandlers()
  registerGitHandlers()
  registerExtHandlers()
  registerUpdateHandlers()
  registerTerminalHandlers()
  registerWindowHandlers()
  registerMenuHandlers()
  registerLiveServerHandlers()
  registerDebugHandlers()
  createWindow()
  setupAutoUpdater()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  liveServer.stop()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
