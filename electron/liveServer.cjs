// Live Server real para Nova (escritorio): servidor HTTP en Node que sirve la
// carpeta del workspace y recarga el navegador al guardar (SSE + fs.watch).

const http = require('http')
const fs = require('fs')
const path = require('path')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.wasm': 'application/wasm',
}

const RELOAD_CLIENT = `<script>
(function () {
  var es = new EventSource('/__nova_reload');
  es.addEventListener('reload', function () { location.reload(); });
  es.addEventListener('close', function () { es.close(); });
  window.addEventListener('beforeunload', function () { es.close(); });
})();
</script>`

let server = null
let rootAbs = null
let watcher = null
let onChangeCb = null

function broadcast(event, data) {
  if (!server || !server.__clients) return
  const payload = `event: ${event}\ndata: ${data}\n\n`
  for (const res of server.__clients.slice()) {
    try {
      res.write(payload)
    } catch {
      // ignore
    }
  }
}

function handleRequest(req, res) {
  const url = decodeURIComponent((req.url || '/').split('?')[0])

  if (url === '/__nova_reload') {
    const srv = server
    if (!srv) {
      res.writeHead(500)
      res.end()
      return
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    res.write(': connected\n\n')
    srv.__clients = srv.__clients || []
    srv.__clients.push(res)
    req.on('close', () => {
      srv.__clients = (srv.__clients || []).filter((c) => c !== res)
    })
    return
  }

  if (!rootAbs) {
    res.writeHead(500)
    res.end('Live Server sin carpeta raíz')
    return
  }

  let filePath = path.join(rootAbs, url)
  if (filePath === rootAbs || filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'index.html')
  }
  if (!filePath.startsWith(rootAbs)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404)
        res.end('Not Found')
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      let body = data
      if (ext === '.html' || ext === '.htm') {
        const html = data.toString('utf8')
        if (!html.includes('__nova_reload')) {
          body = Buffer.from(html.replace('</body>', RELOAD_CLIENT + '</body>'))
        }
      }
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      res.end(body)
    })
  })
}

function startWatching() {
  if (!rootAbs || watcher) return
  try {
    watcher = fs.watch(rootAbs, { recursive: true }, (_evt, filename) => {
      if (!filename) return
      broadcast('reload', '')
      if (onChangeCb) onChangeCb(String(filename))
    })
  } catch {
    watcher = null
  }
}

function stopWatching() {
  if (watcher) {
    try {
      watcher.close()
    } catch {
      // ignore
    }
    watcher = null
  }
}

function start(port, absRoot, cb) {
  if (server) return Promise.resolve({ ok: false, error: 'Ya hay un servidor Live Server activo' })
  const normalized = path.resolve(String(absRoot || ''))
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) {
    return Promise.resolve({ ok: false, error: `La carpeta no existe: ${normalized}` })
  }
  rootAbs = normalized
  onChangeCb = typeof cb === 'function' ? cb : null
  server = http.createServer(handleRequest)
  server.__clients = []
  return new Promise((resolve) => {
    server.on('error', (e) => {
      const msg = e && e.code === 'EADDRINUSE' ? `El puerto ${port} ya está en uso` : (e && e.message) || String(e)
      server = null
      resolve({ ok: false, error: msg })
    })
    server.listen(port, '127.0.0.1', () => {
      startWatching()
      resolve({ ok: true, port, url: `http://127.0.0.1:${port}/` })
    })
  })
}

function stop() {
  stopWatching()
  if (!server) return Promise.resolve({ ok: true })
  const srv = server
  server = null
  rootAbs = null
  try {
    if (srv.__clients) {
      for (const c of srv.__clients) {
        try {
          c.end()
        } catch {
          // ignore
        }
      }
    }
    if (typeof srv.closeAllConnections === 'function') srv.closeAllConnections()
  } catch {
    // ignore
  }
  return new Promise((resolve) => {
    try {
      srv.close(() => resolve({ ok: true }))
      setTimeout(() => resolve({ ok: true }), 500)
    } catch {
      resolve({ ok: true })
    }
  })
}

function status() {
  if (!server || !rootAbs) return { running: false }
  return {
    running: true,
    port: server.address() ? server.address().port : 0,
    root: rootAbs,
    url: server.address() ? `http://127.0.0.1:${server.address().port}/` : '',
  }
}

module.exports = { start, stop, status }
