// Cableado de los comandos de Live Server hacia infraestructura real:
// - Escritorio (Electron): servidor HTTP real en el proceso main (Node).
// - Web: vista previa por Service Worker con recarga al guardar.

import { overrideExtensionCommand } from '../extHost/vscodeShim'
import { useEditorStore } from '../../store/editorStore'
import { desktopLiveServer } from '../electronBridge'
import { startLivePreview, stopLivePreview } from './livePreview'

let webPreviewActive = false

export function setupLiveServerCommands(): void {
  overrideExtensionCommand('extension.liveServer.goOnline', () => {
    const st = useEditorStore.getState()
    const bridge = desktopLiveServer()
    if (bridge) return goOnlineDesktop(bridge)
    return goOnlineWeb()
  })

  overrideExtensionCommand('extension.liveServer.goOffline', () => {
    const st = useEditorStore.getState()
    const bridge = desktopLiveServer()
    if (bridge) {
      return bridge.stop().then(() => {
        st.setStatus('Live Server detenido', 2500)
      })
    }
    if (webPreviewActive) {
      stopLivePreview()
      webPreviewActive = false
    }
    st.setStatus('Live Server detenido', 2500)
    return Promise.resolve()
  })

  overrideExtensionCommand('extension.liveServer.changeWorkspace', () => {
    const st = useEditorStore.getState()
    st.setStatus('Cambia de carpeta con Archivo → Abrir carpeta', 3500)
    return Promise.resolve()
  })
}

async function goOnlineDesktop(bridge: NonNullable<ReturnType<typeof desktopLiveServer>>): Promise<void> {
  const st = useEditorStore.getState()
  const handle = st.root?.handle as { absPath?: string } | undefined
  const rootAbs = handle?.absPath
  if (!rootAbs) {
    st.setStatus('Abre primero una carpeta para usar Live Server', 3500)
    return
  }
  const r = await bridge.start(5500, rootAbs)
  if (r.ok && r.url) {
    st.setStatus(`Live Server activo en ${r.url}`, 5000)
    window.open(r.url, '_blank')
  } else {
    st.setStatus(`Live Server: ${r.error || 'no se pudo iniciar'}`, 4000)
  }
}

async function goOnlineWeb(): Promise<void> {
  webPreviewActive = true
  await startLivePreview()
}
