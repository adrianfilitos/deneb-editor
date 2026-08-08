// Service Worker de Live Preview (web): sirve el workspace de Nova y recarga
// las pestañas de vista previa cuando el usuario guarda.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

let files = {}

self.addEventListener('message', (e) => {
  const d = e.data || {}
  if (d.type === 'map') {
    files = Object.fromEntries(d.entries || [])
  } else if (d.type === 'update') {
    if (d.content === null) delete files[d.path]
    else files[d.path] = d.content
  } else if (d.type === 'reload') {
    broadcastReload()
  } else if (d.type === 'close') {
    files = {}
  }
})

function broadcastReload() {
  self.clients.matchAll({ type: 'window' }).then((cs) => {
    for (const c of cs) c.postMessage({ type: 'nova-reload' })
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
}

const RELOAD_SCRIPT = `<script>
navigator.serviceWorker.addEventListener("message", function (e) {
  if (e.data && e.data.type === "nova-reload") location.reload();
});
</script>`

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (!url.pathname.includes('/__nova_preview/')) return
  e.respondWith(
    (async () => {
      let rel = decodeURIComponent(url.pathname.split('/__nova_preview/')[1] || '')
      if (!rel) rel = 'index.html'
      let content = files[rel]
      if (content === undefined && rel === 'index.html') content = files['index.html']
      if (content === undefined) {
        return new Response('No encontrado: ' + rel, { status: 404, headers: { 'Content-Type': 'text/plain' } })
      }
      const dot = rel.lastIndexOf('.')
      const ext = dot >= 0 ? rel.slice(dot) : ''
      let body = content
      if ((ext === '.html' || rel === 'index.html') && !content.includes('nova-reload')) {
        body = content.replace('</body>', RELOAD_SCRIPT + '</body>')
      }
      return new Response(body, {
        headers: { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' },
      })
    })(),
  )
})
