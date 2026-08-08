import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useAIChatStore } from '../store/aiChatStore'
import { getDynamicShortcuts } from '../lib/shortcutRegistry'

function isModKey(e: KeyboardEvent): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey
}

function normalizeKey(e: KeyboardEvent): string {
  const map: Record<string, string> = {
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
    ' ': 'space',
    escape: 'esc',
  }
  const k = e.key.toLowerCase()
  return map[k] || k
}

export function useGlobalShortcuts() {
  const chordRef = useRef<string | null>(null)
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState()
      const key = e.key.toLowerCase()

      // Chord handling: Ctrl+K then Z / Ctrl+K Ctrl+S
      if (chordRef.current) {
        if (chordTimer.current) clearTimeout(chordTimer.current)
        chordRef.current = null
        if (!e.ctrlKey && key === 'z') {
          e.preventDefault()
          store.toggleZen()
          return
        }
        if (e.ctrlKey && key === 's') {
          e.preventDefault()
          window.dispatchEvent(new Event('deneb:show-shortcuts'))
          return
        }
        // any other key cancels the chord
      }

      if (isModKey(e) && !e.shiftKey && key === 'k') {
        e.preventDefault()
        chordRef.current = 'k'
        chordTimer.current = setTimeout(() => {
          chordRef.current = null
        }, 2000)
        return
      }

      // Atajos aportados por extensiones (keybindings de VS Code), primero
      // para que puedan reasignar los atajos por defecto igual que VS Code.
      const modPressed = e.ctrlKey || e.metaKey
      const normKey = normalizeKey(e)
      for (const sc of getDynamicShortcuts()) {
        if ((sc.ctrl === true) !== modPressed) continue
        if ((sc.shift === true) !== e.shiftKey) continue
        if ((sc.alt === true) !== e.altKey) continue
        if (normKey === sc.key.toLowerCase() || key === sc.key.toLowerCase()) {
          e.preventDefault()
          sc.run()
          return
        }
      }

      // Ctrl+Shift+P or F1 → command palette
      if ((isModKey(e) && e.shiftKey && key === 'p') || e.key === 'F1') {
        e.preventDefault()
        store.openPalette('command')
        return
      }
      // Ctrl+P → quick open files
      if (isModKey(e) && !e.shiftKey && key === 'p') {
        e.preventDefault()
        store.openPalette('file')
        return
      }
      // Ctrl+S → save
      if (isModKey(e) && !e.shiftKey && key === 's') {
        e.preventDefault()
        void store.saveTab()
        return
      }
      // Ctrl+Shift+S → save all
      if (isModKey(e) && e.shiftKey && key === 's') {
        e.preventDefault()
        void store.saveAll()
        return
      }
      // Ctrl+W → close tab (capture to avoid closing browser tab)
      if (isModKey(e) && !e.shiftKey && key === 'w') {
        e.preventDefault()
        if (store.activePath) void store.closeTab(store.activePath)
        return
      }
      // Ctrl+Shift+W → close all (prevent browser)
      if (isModKey(e) && e.shiftKey && key === 'w') {
        e.preventDefault()
        store.openTabs.forEach((t) => void store.closeTab(t.path, true))
        return
      }
      // Ctrl+Shift+F → search
      if (isModKey(e) && e.shiftKey && key === 'f') {
        e.preventDefault()
        store.setSidebarView('search')
        return
      }
      // Ctrl+Shift+G → git
      if (isModKey(e) && e.shiftKey && key === 'g') {
        e.preventDefault()
        store.setSidebarView('git')
        return
      }
      // Ctrl+Shift+E → explorer
      if (isModKey(e) && e.shiftKey && key === 'e') {
        e.preventDefault()
        store.setSidebarView('explorer')
        return
      }
      // Ctrl+B → toggle sidebar
      if (isModKey(e) && !e.shiftKey && key === 'b') {
        e.preventDefault()
        store.toggleSidebar()
        return
      }
      // Ctrl+J → AI panel
      if (isModKey(e) && !e.shiftKey && key === 'j') {
        e.preventDefault()
        store.setSidebarView('ai')
        return
      }
      // Ctrl+Shift+J → new AI conversation
      if (isModKey(e) && e.shiftKey && key === 'j') {
        e.preventDefault()
        store.setSidebarView('ai')
        useAIChatStore.getState().resetConversation()
        return
      }
      // Ctrl+, → settings
      if (isModKey(e) && key === ',') {
        e.preventDefault()
        store.setSidebarView('settings')
        return
      }
      // Ctrl+` → terminal
      if (isModKey(e) && key === '`') {
        e.preventDefault()
        store.setBottomView(store.bottomView === 'terminal' ? null : 'terminal')
        return
      }
      // Ctrl+Shift+M → problems
      if (isModKey(e) && e.shiftKey && key === 'm') {
        e.preventDefault()
        store.setBottomView(store.bottomView === 'problems' ? null : 'problems')
        return
      }
      // Ctrl+\ → split editor
      if (isModKey(e) && !e.shiftKey && key === '\\') {
        e.preventDefault()
        store.splitGroup()
        return
      }
      // F9 → toggle breakpoint
      if (e.key === 'F9') {
        e.preventDefault()
        const editor = (window as unknown as { __denebEditor?: { getPosition?: () => { lineNumber: number } | null } | undefined }).__denebEditor
        const pos = editor?.getPosition?.()
        const path = (window as unknown as { __denebFocusPath?: string }).__denebFocusPath
        if (pos && path) {
          void import('../lib/debugger').then((m) => m.toggleBreakpoint(path, pos.lineNumber))
        }
        return
      }
      // F5 → iniciar/continuar debug
      if (e.key === 'F5') {
        e.preventDefault()
        const d = import('../lib/debugger')
        store.setSidebarView('debug')
        void d.then((m) => {
          const st = m.getDebuggerState()
          if (st.paused) m.continueDebug()
          else void m.startDebug()
        })
        return
      }
      // F10 → paso
      if (e.key === 'F10') {
        e.preventDefault()
        void import('../lib/debugger').then((m) => {
          const st = m.getDebuggerState()
          if (st.paused) m.stepOver()
        })
        return
      }
    }

    // Use capture phase so Monaco / inputs don't swallow shortcuts
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
