const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('novaDesktop', {
  isDesktop: true,
  on: (channel, cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  fs: {
    openWorkspace: () => ipcRenderer.invoke('nova:fs:open-workspace'),
    setWorkspace: (absPath) => ipcRenderer.invoke('nova:fs:set-workspace', absPath),
    list: (absPath) => ipcRenderer.invoke('nova:fs:list', absPath),
    stat: (absPath) => ipcRenderer.invoke('nova:fs:stat', absPath),
    readFile: (absPath) => ipcRenderer.invoke('nova:fs:read-file', absPath),
    writeFile: (absPath, content) => ipcRenderer.invoke('nova:fs:write-file', absPath, content),
    create: (parentAbs, name, kind) => ipcRenderer.invoke('nova:fs:create', parentAbs, name, kind),
    remove: (absPath) => ipcRenderer.invoke('nova:fs:remove', absPath),
    rename: (parentAbs, oldName, newName) =>
      ipcRenderer.invoke('nova:fs:rename', parentAbs, oldName, newName),
    walk: (absPath) => ipcRenderer.invoke('nova:fs:walk', absPath),
    exec: (cwd, command) => ipcRenderer.invoke('nova:fs:exec', cwd, command),
  },
  term: {
    start: (cwd) => ipcRenderer.invoke('nova:term:start', cwd),
    write: (data) => ipcRenderer.invoke('nova:term:write', data),
    kill: () => ipcRenderer.invoke('nova:term:kill'),
    onData: (cb) => {
      const handler = (_e, data) => cb(data)
      ipcRenderer.on('nova:term:data', handler)
      return () => ipcRenderer.removeListener('nova:term:data', handler)
    },
    onExit: (cb) => {
      const handler = () => cb()
      ipcRenderer.on('nova:term:exit', handler)
      return () => ipcRenderer.removeListener('nova:term:exit', handler)
    },
  },
  windowControls: {
    minimize: () => ipcRenderer.send('nova:window:minimize'),
    toggleMaximize: () => ipcRenderer.send('nova:window:toggle-maximize'),
    close: () => ipcRenderer.send('nova:window:close'),
    onMaximized: (cb) => {
      const handler = (_e, v) => cb(v)
      ipcRenderer.on('nova:window:maximized', handler)
      return () => ipcRenderer.removeListener('nova:window:maximized', handler)
    },
  },
  menu: {
    undo: () => ipcRenderer.send('nova:menu:undo'),
    redo: () => ipcRenderer.send('nova:menu:redo'),
    cut: () => ipcRenderer.send('nova:menu:cut'),
    copy: () => ipcRenderer.send('nova:menu:copy'),
    paste: () => ipcRenderer.send('nova:menu:paste'),
    selectAll: () => ipcRenderer.send('nova:menu:select-all'),
    reload: () => ipcRenderer.send('nova:menu:reload'),
    devtools: () => ipcRenderer.send('nova:menu:devtools'),
    zoomIn: () => ipcRenderer.send('nova:menu:zoom-in'),
    zoomOut: () => ipcRenderer.send('nova:menu:zoom-out'),
    zoomReset: () => ipcRenderer.send('nova:menu:zoom-reset'),
    toggleFullscreen: () => ipcRenderer.send('nova:menu:fullscreen'),
    about: () => ipcRenderer.send('nova:menu:about'),
  },
})
