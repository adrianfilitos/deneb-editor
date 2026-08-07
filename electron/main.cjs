const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')

const isDev = process.env.NOVA_DEV === '1'
const DEV_URL = 'http://127.0.0.1:5173'

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

function startTerminal(cwd) {
  try {
    if (termProc) {
      try { termProc.kill() } catch {}
      termProc = null
    }
    const id = ++termId
    const proc = spawn('powershell.exe', ['-NoLogo', '-NoExit', '-Command', '-'], {
      cwd: cwd || os.homedir(),
      windowsHide: true,
      env: process.env,
    })
    termProc = proc
    proc.stdout.setEncoding('utf8')
    proc.stderr.setEncoding('utf8')
    proc.stdout.on('data', (d) => {
      if (id === termId) sendToWindow('nova:term:data', d)
    })
    proc.stderr.on('data', (d) => {
      if (id === termId) sendToWindow('nova:term:data', d)
    })
    proc.on('error', (e) => {
      if (id === termId) {
        sendToWindow('nova:term:data', `\r\n[Error al iniciar PowerShell: ${e.message}]\r\n`)
      }
    })
    proc.on('exit', () => {
      if (id === termId) {
        termProc = null
        sendToWindow('nova:term:exit')
      }
    })
    if (proc.stdin && proc.stdin.writable) {
      proc.stdin.write('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8\r\n')
    }
  } catch (e) {
    sendToWindow('nova:term:data', `\r\n[Error: ${e.message}]\r\n`)
  }
}

function registerWindowHandlers() {
  ipcMain.on('nova:window:minimize', () => {
    if (mainWindow) mainWindow.minimize()
  })
  ipcMain.on('nova:window:toggle-maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.on('nova:window:close', () => {
    if (mainWindow) mainWindow.close()
  })
}

function registerMenuHandlers() {
  const wc = () => mainWindow?.webContents
  ipcMain.on('nova:menu:undo', () => wc()?.undo())
  ipcMain.on('nova:menu:redo', () => wc()?.redo())
  ipcMain.on('nova:menu:cut', () => wc()?.cut())
  ipcMain.on('nova:menu:copy', () => wc()?.copy())
  ipcMain.on('nova:menu:paste', () => wc()?.paste())
  ipcMain.on('nova:menu:select-all', () => wc()?.selectAll())
  ipcMain.on('nova:menu:reload', () => wc()?.reload())
  ipcMain.on('nova:menu:devtools', () => wc()?.toggleDevTools())
  ipcMain.on('nova:menu:zoom-in', () => {
    const w = mainWindow
    if (w) w.webContents.setZoomLevel((w.webContents.getZoomLevel() || 0) + 0.5)
  })
  ipcMain.on('nova:menu:zoom-out', () => {
    const w = mainWindow
    if (w) w.webContents.setZoomLevel((w.webContents.getZoomLevel() || 0) - 0.5)
  })
  ipcMain.on('nova:menu:zoom-reset', () => mainWindow?.webContents.setZoomLevel(0))
  ipcMain.on('nova:menu:fullscreen', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })
  ipcMain.on('nova:menu:about', () => {
    if (!mainWindow) return
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Nova',
      message: 'Nova Editor 1.0.0',
      detail: 'Editor de código con IA integrada.\nHecho con Electron, React, Monaco y Vite.',
    })
  })
}

function registerTerminalHandlers() {
  ipcMain.handle('nova:term:start', (_e, cwd) => {
    startTerminal(cwd)
    return true
  })
  ipcMain.handle('nova:term:write', (_e, data) => {
    if (termProc && termProc.stdin && termProc.stdin.writable) {
      termProc.stdin.write(data)
    }
    return true
  })
  ipcMain.handle('nova:term:kill', () => {
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

function registerFsHandlers() {
  ipcMain.handle('nova:fs:open-workspace', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Abrir carpeta',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (res.canceled || !res.filePaths.length) return null
    workspaceRoot = res.filePaths[0]
    return workspaceRoot
  })

  ipcMain.handle('nova:fs:set-workspace', (_e, abs) => {
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

  ipcMain.handle('nova:fs:list', async (_e, absPath) => {
    const dir = guard(absPath)
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    return entries.map((en) => ({
      name: en.name,
      kind: en.isDirectory() ? 'directory' : 'file',
      absPath: path.join(dir, en.name),
    }))
  })

  ipcMain.handle('nova:fs:stat', async (_e, absPath) => {
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

  ipcMain.handle('nova:fs:read-file', async (_e, absPath) => {
    const file = guard(absPath)
    return await fs.promises.readFile(file, 'utf8')
  })

  ipcMain.handle('nova:fs:write-file', async (_e, absPath, content) => {
    const file = guard(absPath)
    await fs.promises.writeFile(file, content, 'utf8')
    return true
  })

  ipcMain.handle('nova:fs:create', async (_e, parentAbs, name, kind) => {
    const parent = guard(parentAbs)
    const target = path.join(parent, name)
    if (kind === 'file') await fs.promises.writeFile(target, '', 'utf8')
    else await fs.promises.mkdir(target)
    return { name, kind, absPath: target }
  })

  ipcMain.handle('nova:fs:remove', async (_e, absPath) => {
    const target = guard(absPath)
    await fs.promises.rm(target, { recursive: true, force: false })
    return true
  })

  ipcMain.handle('nova:fs:rename', async (_e, parentAbs, oldName, newName) => {
    const parent = guard(parentAbs)
    await fs.promises.rename(path.join(parent, oldName), path.join(parent, newName))
    return true
  })

  ipcMain.handle('nova:fs:walk', async (_e, absPath) => {
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

  ipcMain.handle('nova:fs:exec', async (_e, cwd, command) => {
    const dir = cwd && typeof cwd === 'string' && fs.existsSync(cwd) ? cwd : workspaceRoot || os.homedir()
    return await new Promise((resolve) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', String(command)], {
        cwd: dir,
        windowsHide: true,
        env: process.env,
      })
      let out = ''
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (d) => (out += d))
      child.stderr.on('data', (d) => (out += d))
      child.on('error', (e) => resolve(`Error al iniciar PowerShell: ${e.message}`))
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
          click: () => sendToWindow('nova:open-workspace'),
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
          click: () => sendToWindow('nova:toggle-sidebar'),
        },
        {
          label: 'Terminal',
          click: () => sendToWindow('nova:toggle-terminal'),
        },
        {
          label: 'Problemas',
          click: () => sendToWindow('nova:toggle-problems'),
        },
        {
          label: 'Asistente de IA',
          click: () => sendToWindow('nova:show-ai'),
        },
        {
          label: 'Modo Zen',
          click: () => sendToWindow('nova:toggle-zen'),
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
          label: 'Referencia de atajos',
          click: () => sendToWindow('nova:show-shortcuts'),
        },
        { type: 'separator' },
        {
          label: 'Acerca de Nova',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Nova',
              message: `Nova Editor ${app.getVersion()}`,
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
    title: 'Nova',
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

  mainWindow.on('maximize', () => sendToWindow('nova:window:maximized', true))
  mainWindow.on('unmaximize', () => sendToWindow('nova:window:maximized', false))

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
        title: 'Nova',
        message: 'No se encontró la compilación de la aplicación.',
        detail: msg,
      })
      mainWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(
          `<!doctype html><html><body style="background:#0f111a;color:#d5d9e6;font-family:Segoe UI,sans-serif;padding:40px"><h2>Nova</h2><p>${msg.replace(/\n/g, '<br/>')}</p></body></html>`,
        )}`,
      )
      return
    }
    mainWindow.loadFile(indexPath)
  }

  if (pendingLaunch.openAi || pendingLaunch.target) {
    mainWindow.webContents.once('did-finish-load', () => {
      if (pendingLaunch.openAi) sendToWindow('nova:show-ai')
      if (pendingLaunch.target) sendToWindow('nova:open-path', pendingLaunch.target)
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerFsHandlers()
  registerTerminalHandlers()
  registerWindowHandlers()
  registerMenuHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
