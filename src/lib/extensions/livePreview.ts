// Live Preview (web): sirve el workspace mediante un Service Worker y recarga
// el navegador al guardar. Es el equivalente web del servidor HTTP de escritorio.

import { useEditorStore } from '../../store/editorStore'
import { walkFiles, resolvePath, readText } from '../fileSystem'

const files = new Map<string, string>()
let swScope = ''

async function refreshWorkspaceMap(): Promise<void> {
  const root = useEditorStore.getState().root
  files.clear()
  if (!root?.handle) return
  const prefix = root.name ? root.name + '/' : ''
  const rels: string[] = []
  await walkFiles(root.handle, (path) => {
    let rel = String(path).replace(/\\/g, '/')
    if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length)
    if (rel.split('/').some((s) => ['node_modules', '.git', 'dist', 'build', 'coverage'].includes(s))) return
    rels.push(rel)
  })
  for (const rel of rels) {
    try {
      const h = await resolvePath(root.handle, rel)
      if (h && h.kind === 'file') files.set(rel, await readText(h))
    } catch {
      // ignore
    }
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const base = new URL('.', location.href)
  try {
    return await navigator.serviceWorker.register(new URL('sw.js', base.href))
  } catch {
    return null
  }
}

function postToSw(msg: unknown): void {
  const ctrl = navigator.serviceWorker.controller
  if (ctrl) ctrl.postMessage(msg)
  else void navigator.serviceWorker.getRegistration().then((r) => r?.active?.postMessage(msg))
}

function onFsChange(e: Event): void {
  const d = (e as CustomEvent).detail as { kind: string; path: string } | undefined
  if (!d) return
  const root = useEditorStore.getState().root
  if (!root?.handle) return
  const handle = root.handle
  const rel = String(d.path).replace(/\\/g, '/')
  void (async () => {
    if (d.kind === 'deleted') {
      files.delete(rel)
      postToSw({ type: 'update', path: rel, content: null })
      postToSw({ type: 'reload' })
      return
    }
    try {
      const h = await resolvePath(handle, rel)
      if (h && h.kind === 'file') {
        const content = await readText(h)
        files.set(rel, content)
        postToSw({ type: 'update', path: rel, content })
        postToSw({ type: 'reload' })
      }
    } catch {
      // ignore
    }
  })()
}

export async function startLivePreview(): Promise<void> {
  const st = useEditorStore.getState()
  await refreshWorkspaceMap()
  if (files.size === 0) {
    st.setStatus('No hay archivos en el workspace para previsualizar', 3500)
    return
  }
  const reg = await registration()
  if (!reg) {
    st.setStatus('La vista previa requiere un navegador con Service Worker', 4000)
    return
  }
  swScope = reg.scope
  await navigator.serviceWorker.ready
  postToSw({ type: 'map', entries: [...files.entries()] })
  window.addEventListener('deneb:fs-change', onFsChange)
  window.open(swScope + '__deneb_preview/', '_blank')
  st.setStatus('Vista previa abierta — se recarga al guardar', 3500)
}

export function stopLivePreview(): void {
  window.removeEventListener('deneb:fs-change', onFsChange)
  postToSw({ type: 'close' })
}
