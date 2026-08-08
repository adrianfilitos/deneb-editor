const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('denebDesktop', {
  isDesktop: true,
  platform: process.platform,
  on: (channel, cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  fs: {
    openWorkspace: () => ipcRenderer.invoke('deneb:fs:open-workspace'),
    setWorkspace: (absPath) => ipcRenderer.invoke('deneb:fs:set-workspace', absPath),
    list: (absPath) => ipcRenderer.invoke('deneb:fs:list', absPath),
    stat: (absPath) => ipcRenderer.invoke('deneb:fs:stat', absPath),
    readFile: (absPath) => ipcRenderer.invoke('deneb:fs:read-file', absPath),
    writeFile: (absPath, content) => ipcRenderer.invoke('deneb:fs:write-file', absPath, content),
    create: (parentAbs, name, kind) => ipcRenderer.invoke('deneb:fs:create', parentAbs, name, kind),
    remove: (absPath) => ipcRenderer.invoke('deneb:fs:remove', absPath),
    rename: (parentAbs, oldName, newName) =>
      ipcRenderer.invoke('deneb:fs:rename', parentAbs, oldName, newName),
    walk: (absPath) => ipcRenderer.invoke('deneb:fs:walk', absPath),
    exec: (cwd, command) => ipcRenderer.invoke('deneb:fs:exec', cwd, command),
  },
  git: {
    available: () => ipcRenderer.invoke('deneb:git:available'),
    status: () => ipcRenderer.invoke('deneb:git:status'),
    add: (paths) => ipcRenderer.invoke('deneb:git:add', paths),
    reset: (paths) => ipcRenderer.invoke('deneb:git:reset', paths),
    commit: (msg) => ipcRenderer.invoke('deneb:git:commit', msg),
    branches: () => ipcRenderer.invoke('deneb:git:branches'),
    checkout: (name) => ipcRenderer.invoke('deneb:git:checkout', name),
    createBranch: (name) => ipcRenderer.invoke('deneb:git:create-branch', name),
    diff: (file, staged) => ipcRenderer.invoke('deneb:git:diff', file, staged),
    push: () => ipcRenderer.invoke('deneb:git:push'),
    pull: () => ipcRenderer.invoke('deneb:git:pull'),
    fetch: () => ipcRenderer.invoke('deneb:git:fetch'),
    log: () => ipcRenderer.invoke('deneb:git:log'),
  },
  ext: {
    install: (url, filename) => ipcRenderer.invoke('deneb:ext:install', url, filename),
    save: (filename, data) => ipcRenderer.invoke('deneb:ext:save', filename, data),
    installed: () => ipcRenderer.invoke('deneb:ext:installed'),
    dir: () => ipcRenderer.invoke('deneb:ext:dir'),
  },
  liveServer: {
    start: (port, root) => ipcRenderer.invoke('deneb:liveserver:start', port, root),
    stop: () => ipcRenderer.invoke('deneb:liveserver:stop'),
    status: () => ipcRenderer.invoke('deneb:liveserver:status'),
    onStatus: (cb) => {
      const handler = (_e, data) => cb(data)
      ipcRenderer.on('deneb:liveserver:status', handler)
      return () => ipcRenderer.removeListener('deneb:liveserver:status', handler)
    },
  },
  updates: {
    version: () => ipcRenderer.invoke('deneb:update:version'),
    check: () => ipcRenderer.send('deneb:update:check'),
    install: () => ipcRenderer.send('deneb:update:install'),
    onStatus: (cb) => {
      const handler = (_e, data) => cb(data)
      ipcRenderer.on('deneb:update:status', handler)
      return () => ipcRenderer.removeListener('deneb:update:status', handler)
    },
  },
  term: {
    start: (cwd) => ipcRenderer.invoke('deneb:term:start', cwd),
    write: (data) => ipcRenderer.invoke('deneb:term:write', data),
    kill: () => ipcRenderer.invoke('deneb:term:kill'),
    onData: (cb) => {
      const handler = (_e, data) => cb(data)
      ipcRenderer.on('deneb:term:data', handler)
      return () => ipcRenderer.removeListener('deneb:term:data', handler)
    },
    onExit: (cb) => {
      const handler = () => cb()
      ipcRenderer.on('deneb:term:exit', handler)
      return () => ipcRenderer.removeListener('deneb:term:exit', handler)
    },
  },
  debug: {
    start: (cfg) => ipcRenderer.invoke('deneb:debug:start', cfg),
    setBreakpoints: (lines, filePath) => ipcRenderer.invoke('deneb:debug:setBreakpoints', lines, filePath),
    continue: () => ipcRenderer.invoke('deneb:debug:continue'),
    next: () => ipcRenderer.invoke('deneb:debug:next'),
    stepIn: () => ipcRenderer.invoke('deneb:debug:stepIn'),
    stepOut: () => ipcRenderer.invoke('deneb:debug:stepOut'),
    pause: () => ipcRenderer.invoke('deneb:debug:pause'),
    stackTrace: (threadId) => ipcRenderer.invoke('deneb:debug:stackTrace', threadId),
    evaluate: (expression, frameId) => ipcRenderer.invoke('deneb:debug:evaluate', expression, frameId),
    disconnect: () => ipcRenderer.invoke('deneb:debug:disconnect'),
    onEvent: (cb) => {
      const handler = (_e, data) => cb(data)
      ipcRenderer.on('deneb:debug:event', handler)
      return () => ipcRenderer.removeListener('deneb:debug:event', handler)
    },
    onConsole: (cb) => {
      const handler = (_e, data) => cb(data)
      ipcRenderer.on('deneb:debug:console', handler)
      return () => ipcRenderer.removeListener('deneb:debug:console', handler)
    },
  },
  windowControls: {
    minimize: () => ipcRenderer.send('deneb:window:minimize'),
    toggleMaximize: () => ipcRenderer.send('deneb:window:toggle-maximize'),
    close: () => ipcRenderer.send('deneb:window:close'),
    onMaximized: (cb) => {
      const handler = (_e, v) => cb(v)
      ipcRenderer.on('deneb:window:maximized', handler)
      return () => ipcRenderer.removeListener('deneb:window:maximized', handler)
    },
  },
  menu: {
    undo: () => ipcRenderer.send('deneb:menu:undo'),
    redo: () => ipcRenderer.send('deneb:menu:redo'),
    cut: () => ipcRenderer.send('deneb:menu:cut'),
    copy: () => ipcRenderer.send('deneb:menu:copy'),
    paste: () => ipcRenderer.send('deneb:menu:paste'),
    selectAll: () => ipcRenderer.send('deneb:menu:select-all'),
    reload: () => ipcRenderer.send('deneb:menu:reload'),
    devtools: () => ipcRenderer.send('deneb:menu:devtools'),
    zoomIn: () => ipcRenderer.send('deneb:menu:zoom-in'),
    zoomOut: () => ipcRenderer.send('deneb:menu:zoom-out'),
    zoomReset: () => ipcRenderer.send('deneb:menu:zoom-reset'),
    toggleFullscreen: () => ipcRenderer.send('deneb:menu:fullscreen'),
    about: () => ipcRenderer.send('deneb:menu:about'),
  },
})
