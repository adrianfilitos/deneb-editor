import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useAIChatStore } from '../store/aiChatStore'

function isModKey(e: KeyboardEvent): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey
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
          window.dispatchEvent(new Event('nova:show-shortcuts'))
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
    }

    // Use capture phase so Monaco / inputs don't swallow shortcuts
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
