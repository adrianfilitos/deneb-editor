import type { ExtCommandDef, ExtContribData, ExtShortcutDef } from './extensionTypes'

export interface NativeExtDef {
  id: string
  name: string
  version: string
  description?: string
  icon: string
  contrib: ExtContribData
  commands?: ExtCommandDef[]
  shortcuts?: ExtShortcutDef[]
  code?: string
}

const activeEditor = () => (window as unknown as { __denebEditor?: { executeEdits: (s: string, e: unknown[]) => void; getModel: () => { getLineMaxColumn: (l: number) => number } | null; getPosition: () => { lineNumber: number; column: number } | null; setPosition: (p: { lineNumber: number; column: number }) => void } }).__denebEditor

function insertAtCursor(text: string) {
  const ed = activeEditor()
  if (!ed) return
  const pos = ed.getPosition()
  if (!pos) return
  ed.executeEdits('deneb-ext', [
    { range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text },
  ])
  ed.setPosition({ lineNumber: pos.lineNumber, column: pos.column + text.length })
}

function status(msg: string) {
  window.dispatchEvent(new CustomEvent('deneb:status', { detail: msg }))
}

const toolsCommands: ExtCommandDef[] = [
  {
    id: 'deneb.tools.insertDate',
    title: 'Herramientas: Insertar fecha y hora',
    category: 'Extensiones',
    run: () => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      insertAtCursor(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`)
      status('Fecha insertada')
    },
  },
  {
    id: 'deneb.tools.guid',
    title: 'Herramientas: Insertar GUID',
    category: 'Extensiones',
    run: () => {
      const g = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
      insertAtCursor(g)
      status('GUID insertado')
    },
  },
  {
    id: 'deneb.tools.lorem',
    title: 'Herramientas: Insertar párrafo Lorem',
    category: 'Extensiones',
    run: () => {
      insertAtCursor('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.')
      status('Lorem insertado')
    },
  },
]

const toolsShortcuts: ExtShortcutDef[] = [
  { id: 'deneb.tools.shortcut.date', key: 'd', ctrl: true, shift: true, commandId: 'deneb.tools.insertDate', run: toolsCommands[0].run },
]

const candyTheme = {
  id: 'deneb-theme-candy',
  label: 'Deneb Candy',
  base: 'vs-dark' as const,
  colors: {
    'editor.background': '#171020',
    'editor.foreground': '#f4e8ff',
    'editor.lineHighlightBackground': '#221731',
    'editorCursor.foreground': '#f472b6',
    'editor.selectionBackground': '#f472b655',
    'editor.inactiveSelectionBackground': '#f472b533',
    'editorIndentGuide.background1': '#2a1c3c',
    'editorIndentGuide.activeBackground1': '#3f2a56',
    'editorLineNumber.foreground': '#5c4a6e',
    'editorLineNumber.activeForeground': '#c9a8e8',
    'editorWidget.background': '#1e1530',
    'editorWidget.border': '#33214c',
    'editorSuggestWidget.selectedBackground': '#2b1d40',
    'editorBracketMatch.background': '#3f2a56',
    'editorBracketMatch.border': '#f472b6',
    'editorError.foreground': '#ff6b8b',
    'editorWarning.foreground': '#ffcf6b',
    'editorInfo.foreground': '#7ce0ff',
  },
  rules: [
    { token: 'comment', foreground: '#7a6a8f', fontStyle: 'italic' },
    { token: 'keyword', foreground: '#f472b6' },
    { token: 'string', foreground: '#7ee787' },
    { token: 'number', foreground: '#ffb454' },
    { token: 'type', foreground: '#8ab4ff' },
    { token: 'function', foreground: '#c9a8ff' },
    { token: 'variable', foreground: '#f4e8ff' },
    { token: 'delimiter', foreground: '#9adcff' },
    { token: 'operator', foreground: '#9adcff' },
    { token: 'tag', foreground: '#ff6b8b' },
    { token: 'attribute.name', foreground: '#f472b6' },
    { token: 'attribute.value', foreground: '#7ee787' },
  ],
}

const jsSnippets = {
  language: 'typescript',
  items: [
    {
      label: 'log',
      detail: 'console.log',
      insertText: 'console.log(${1:value});',
    },
    {
      label: 'fn',
      detail: 'Función',
      insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
    },
    {
      label: 'arrow',
      detail: 'Arrow function',
      insertText: 'const ${1:name} = (${2:params}) => {\n\t${3}\n};',
    },
    {
      label: 'import',
      detail: 'Importar módulo',
      insertText: "import { ${1:thing} } from '${2:module}';",
    },
    {
      label: 'try',
      detail: 'Try/catch',
      insertText: 'try {\n\t${1}\n} catch (${2:err}) {\n\t${3}\n}',
    },
    {
      label: 'forof',
      detail: 'for...of',
      insertText: 'for (const ${1:item} of ${2:items}) {\n\t${3}\n}',
    },
    {
      label: 'cl',
      detail: 'console.log',
      insertText: 'console.log(\`${1:label}:\`, ${2:value});',
    },
  ],
}

export const NATIVE_EXTENSIONS: NativeExtDef[] = [
  {
    id: 'deneb.host-demo',
    name: 'Host Demo',
    version: '1.0.0',
    description: 'Demuestra el Extension Host: usa la API vscode real (comandos, mensajes, edición).',
    icon: '#38bdf8',
    contrib: {},
    code: `const vscode = require('vscode');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('deneb.host.hello', function () {
      vscode.window.showInformationMessage('¡Hola desde el Extension Host de VS Code!');
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.edit(function (builder) {
          const pos = editor.selection.active;
          builder.insert(pos, '\\n// Línea insertada por el Extension Host\\n');
        });
      }
    }),
    vscode.commands.registerCommand('deneb.host.saludo', function (nombre) {
      vscode.window.showInformationMessage('Hola, ' + (nombre || 'mundo'));
      return 'ok';
    }),
    vscode.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: function (document, position) {
        return [ new vscode.CompletionItem('deneb-nativo', vscode.CompletionItemKind.Function) ];
      }
    })
  );
  vscode.window.showInformationMessage('Extension Host activo: ' + vscode.env.appName + ' v' + vscode.env.version);
}

function deactivate() {}

module.exports = { activate, deactivate };
`,
  },
  {
    id: 'deneb.auto-format',
    name: 'Auto-Formato',
    version: '1.0.0',
    description: 'Formatea automáticamente el código al guardar.',
    icon: '#82aaff',
    contrib: { settings: { formatOnSave: true } },
  },
  {
    id: 'deneb.minimap',
    name: 'Minimapa Pro',
    version: '1.0.0',
    description: 'Activa el minimapa del editor.',
    icon: '#7dcfff',
    contrib: { settings: { minimap: true } },
  },
  {
    id: 'deneb.word-wrap',
    name: 'Ajuste de Línea',
    version: '1.0.0',
    description: 'Envuelve automáticamente las líneas largas.',
    icon: '#9ece6a',
    contrib: { settings: { wordWrap: 'on' } },
  },
  {
    id: 'deneb.relative-lines',
    name: 'Líneas Relativas',
    version: '1.0.0',
    description: 'Números de línea relativos, estilo Vim.',
    icon: '#e0af68',
    contrib: { settings: { lineNumbers: 'relative' } },
  },
  {
    id: 'deneb.vim',
    name: 'Vim Keys',
    version: '1.0.0',
    description: 'Activa el modo Vim del editor.',
    icon: '#f7768e',
    contrib: { settings: { vimMode: true } },
  },
  {
    id: 'deneb.theme-candy',
    name: 'Tema Candy',
    version: '1.0.0',
    description: 'Tema oscuro vibrante con tonos de caramelo.',
    icon: '#f472b6',
    contrib: {
      themes: [candyTheme],
      setTheme: { id: 'deneb-theme-candy', themeId: 'deneb-theme-candy', label: 'Candy' },
    },
  },
  {
    id: 'deneb.snippets-js',
    name: 'Snippets JS/TS',
    version: '1.0.0',
    description: 'Atajos de código para JavaScript y TypeScript (log, fn, import…).',
    icon: '#f7df1e',
    contrib: { snippets: [jsSnippets] },
  },
  {
    id: 'deneb.tools',
    name: 'Herramientas',
    version: '1.0.0',
    description: 'Comandos útiles: fecha, GUID, Lorem. Atajo Ctrl+Shift+D.',
    icon: '#c792ea',
    contrib: {},
    commands: toolsCommands,
    shortcuts: toolsShortcuts,
  },
]

export const NATIVE_MAP: Record<string, NativeExtDef> = Object.fromEntries(NATIVE_EXTENSIONS.map((e) => [e.id, e]))
