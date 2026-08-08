import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/app.css'
import './styles/activitybar.css'
import './styles/sidebar.css'
import './styles/explorer.css'
import './styles/tabbar.css'
import './styles/editor.css'
import './styles/statusbar.css'
import './styles/palette.css'
import './styles/ai.css'
import './styles/settings.css'
import './styles/welcome.css'
import './styles/search.css'
import './styles/extensions.css'
import './styles/git.css'
import './styles/components.css'
import './styles/bottom.css'
import './styles/outline.css'
import './styles/shortcuts.css'
import { setupElectronBridge } from './lib/electronBridge'
import { useExtensionStore } from './store/extensionStore'
import { setupLiveServerCommands } from './lib/extensions/liveServer'
import { initEditorEnhancements } from './lib/editorEnhancements'
import { setupIndexHooks } from './lib/workspaceLanguage'
import { setupLspLifecycle } from './lib/lsp/lspClient'

setupElectronBridge()
setupLiveServerCommands()
initEditorEnhancements()
setupIndexHooks()
setupLspLifecycle()
void useExtensionStore.getState().init()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
