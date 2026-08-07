import { useEditorStore } from './store/editorStore'
import { useAIChatStore } from './store/aiChatStore'

export interface CommandDef {
  id: string
  title: string
  category?: string
  keybinding?: string
  icon?: string
  run: () => void
}

export function commands(): CommandDef[] {
  const s = useEditorStore.getState()
  const ai = useAIChatStore.getState()

  return [
    {
      id: 'workbench.action.files.openFolder',
      title: 'Abrir carpeta…',
      category: 'Archivo',
      icon: 'folder',
      run: () => void s.openWorkspace(),
    },
    {
      id: 'workbench.action.files.loadDemo',
      title: 'Abrir proyecto de demostración',
      category: 'Archivo',
      icon: 'spark',
      run: () => void s.loadDemoWorkspace(),
    },
    {
      id: 'workbench.action.files.save',
      title: 'Guardar',
      category: 'Archivo',
      keybinding: 'Ctrl+S',
      icon: 'save',
      run: () => void s.saveTab(),
    },
    {
      id: 'workbench.action.files.saveAll',
      title: 'Guardar todo',
      category: 'Archivo',
      keybinding: 'Ctrl+K S',
      icon: 'save-all',
      run: () => void s.saveAll(),
    },
    {
      id: 'workbench.action.files.closeTab',
      title: 'Cerrar pestaña activa',
      category: 'Archivo',
      keybinding: 'Ctrl+W',
      icon: 'x',
      run: () => {
        if (s.activePath) s.closeTab(s.activePath)
      },
    },
    {
      id: 'workbench.action.files.closeAll',
      title: 'Cerrar todas las pestañas',
      category: 'Archivo',
      icon: 'x',
      run: () => {
        s.openTabs.forEach((t) => s.closeTab(t.path, true))
      },
    },
    {
      id: 'workbench.action.view.explorer',
      title: 'Ver: Explorador',
      category: 'Ver',
      keybinding: 'Ctrl+Shift+E',
      icon: 'explorer',
      run: () => s.setSidebarView('explorer'),
    },
    {
      id: 'workbench.action.view.search',
      title: 'Ver: Buscar',
      category: 'Ver',
      keybinding: 'Ctrl+Shift+F',
      icon: 'search',
      run: () => s.setSidebarView('search'),
    },
    {
      id: 'workbench.action.view.ai',
      title: 'Ver: Asistente de IA',
      category: 'Ver',
      keybinding: 'Ctrl+J',
      icon: 'spark',
      run: () => s.setSidebarView('ai'),
    },
    {
      id: 'workbench.action.view.extensions',
      title: 'Ver: Extensiones',
      category: 'Ver',
      icon: 'extensions',
      run: () => s.setSidebarView('extensions'),
    },
    {
      id: 'workbench.action.view.outline',
      title: 'Ver: Esquema',
      category: 'Ver',
      icon: 'list',
      run: () => s.setSidebarView('outline'),
    },
    {
      id: 'workbench.action.view.git',
      title: 'Ver: Control de código fuente (Git)',
      category: 'Ver',
      keybinding: 'Ctrl+Shift+G',
      icon: 'git',
      run: () => s.setSidebarView('git'),
    },
    {
      id: 'workbench.action.view.problems',
      title: 'Ver: Problemas',
      category: 'Ver',
      keybinding: 'Ctrl+Shift+M',
      icon: 'warning',
      run: () => s.setBottomView(s.bottomView === 'problems' ? null : 'problems'),
    },
    {
      id: 'workbench.action.toggleTerminal',
      title: 'Terminal: alternar',
      category: 'Ver',
      keybinding: 'Ctrl+`',
      icon: 'terminal',
      run: () => s.setBottomView(s.bottomView === 'terminal' ? null : 'terminal'),
    },
    {
      id: 'workbench.action.splitEditor',
      title: 'Dividir editor',
      category: 'Ver',
      keybinding: 'Ctrl+\\',
      icon: 'columns',
      run: () => s.splitGroup(),
    },
    {
      id: 'workbench.action.closeGroup',
      title: 'Cerrar grupo del editor',
      category: 'Ver',
      icon: 'close',
      run: () => s.closeGroup(s.activeGroupId),
    },
    {
      id: 'workbench.action.toggleZen',
      title: 'Modo Zen',
      category: 'Ver',
      keybinding: 'Ctrl+K Z',
      icon: 'zap',
      run: () => s.toggleZen(),
    },
    {
      id: 'workbench.action.showShortcuts',
      title: 'Referencia de atajos de teclado',
      category: 'Preferencias',
      keybinding: 'Ctrl+K Ctrl+S',
      icon: 'command',
      run: () => window.dispatchEvent(new Event('nova:show-shortcuts')),
    },
    {
      id: 'workbench.action.toggleSidebar',
      title: 'Alternar barra lateral',
      category: 'Ver',
      keybinding: 'Ctrl+B',
      icon: 'panel',
      run: () => s.toggleSidebar(),
    },
    {
      id: 'workbench.action.openSettings',
      title: 'Abrir Ajustes',
      category: 'Preferencias',
      keybinding: 'Ctrl+,',
      icon: 'gear',
      run: () => s.setSidebarView('settings'),
    },
    {
      id: 'workbench.action.toggleVim',
      title: 'Preferencias: Alternar modo Vim',
      category: 'Preferencias',
      icon: 'command',
      run: () => {
        const next = !useEditorStore.getState().settings.vimMode
        useEditorStore.getState().updateSettings({ vimMode: next })
      },
    },
    {
      id: 'ai.action.newChat',
      title: 'IA: Nueva conversación',
      category: 'IA',
      keybinding: 'Ctrl+Shift+J',
      icon: 'spark',
      run: () => {
        s.setSidebarView('ai')
        ai.resetConversation()
      },
    },
    {
      id: 'ai.action.explain',
      title: 'IA: Explicar código seleccionado',
      category: 'IA',
      icon: 'spark',
      run: () => void runAIWithSelection('Explica el siguiente código con detalle, señalando qué hace cada parte y por qué:'),
    },
    {
      id: 'ai.action.refactor',
      title: 'IA: Refactorizar código seleccionado',
      category: 'IA',
      icon: 'spark',
      run: () => void runAIWithSelection('Refactoriza el siguiente código para hacerlo más limpio, eficiente y legible. Mantén el mismo comportamiento. Muestra solo el código resultante:'),
    },
    {
      id: 'ai.action.bugs',
      title: 'IA: Encontrar errores en el código',
      category: 'IA',
      icon: 'spark',
      run: () => void runAIWithSelection('Analiza el siguiente código y encuentra errores o problemas potenciales (bugs, problemas de rendimiento, malas prácticas). Lista cada uno con su corrección sugerida:'),
    },
    {
      id: 'ai.action.tests',
      title: 'IA: Generar tests para el código',
      category: 'IA',
      icon: 'spark',
      run: () => void runAIWithSelection('Genera tests unitarios completos para el siguiente código. Muestra solo el código de los tests:'),
    },
    {
      id: 'ai.action.comments',
      title: 'IA: Añadir comentarios al código',
      category: 'IA',
      icon: 'spark',
      run: () => void runAIWithSelection('Añade comentarios claros y profesionales al siguiente código explicando la lógica. Muestra el código completo con los comentarios:'),
    },
    {
      id: 'ai.action.docs',
      title: 'IA: Escribir documentación',
      category: 'IA',
      icon: 'spark',
      run: () => void runAIWithSelection('Escribe documentación (README o docstring/JSdoc según el lenguaje) para el siguiente código:'),
    },
    {
      id: 'ai.action.inline',
      title: 'IA: Aplicar sugerencia en el editor',
      category: 'IA',
      keybinding: 'Ctrl+Shift+I',
      icon: 'spark',
      run: () => window.dispatchEvent(new CustomEvent('nova:ai-apply-last')),
    },
  ]
}

function runAIWithSelection(instruction: string) {
  const s = useEditorStore.getState()
  const tab = s.openTabs.find((t) => t.path === s.activePath)
  if (!tab) return
  useEditorStore.setState({ sidebarView: 'ai', sidebarVisible: true })
  const ai = useAIChatStore.getState()
  const code = tab.content
  void ai.send(`${instruction}\n\n\`\`\`${tab.language}\n${code.slice(0, 24000)}\n\`\`\``)
}

export function commandById(id: string): CommandDef | undefined {
  return commands().find((c) => c.id === id)
}
