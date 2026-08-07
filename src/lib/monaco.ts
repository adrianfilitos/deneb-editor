import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'

export type ThemeMode = 'nova-dark' | 'nova-light'

// Configure Monaco workers to be bundled with the app (works offline)
self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    switch (label) {
      case 'json':
        return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/json/json.worker', import.meta.url), { type: 'module' })
      case 'css':
      case 'scss':
      case 'less':
        return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/css/css.worker', import.meta.url), { type: 'module' })
      case 'html':
      case 'handlebars':
      case 'razor':
        return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/html/html.worker', import.meta.url), { type: 'module' })
      case 'typescript':
      case 'javascript':
        return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url), { type: 'module' })
      default:
        return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/editor/editor.worker', import.meta.url), { type: 'module' })
    }
  },
}

export const NOVA_DARK = 'nova-dark'
export const NOVA_LIGHT = 'nova-light'

export function defineNovaThemes() {
  monaco.editor.defineTheme(NOVA_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'string', foreground: 'A5E075' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'type', foreground: '82AAFF' },
      { token: 'function', foreground: '82AAFF' },
      { token: 'variable', foreground: 'EEFFFF' },
      { token: 'delimiter', foreground: '89DDFF' },
      { token: 'operator', foreground: '89DDFF' },
      { token: 'tag', foreground: 'F07178' },
      { token: 'attribute.name', foreground: 'C792EA' },
      { token: 'attribute.value', foreground: 'A5E075' },
    ],
    colors: {
      'editor.background': '#0f111a',
      'editor.foreground': '#d5d9e6',
      'editor.lineHighlightBackground': '#171a26',
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': '#82aaff',
      'editor.selectionBackground': '#3b4261cc',
      'editor.inactiveSelectionBackground': '#2b3150aa',
      'editorIndentGuide.background1': '#20242f',
      'editorIndentGuide.activeBackground1': '#3d4356',
      'editorLineNumber.foreground': '#3d4356',
      'editorLineNumber.activeForeground': '#8a93a8',
      'editorGutter.background': '#0f111a',
      'editorWidget.background': '#161a26',
      'editorWidget.border': '#262b3a',
      'editorSuggestWidget.background': '#161a26',
      'editorSuggestWidget.border': '#262b3a',
      'editorSuggestWidget.selectedBackground': '#2a3045',
      'editorHoverWidget.background': '#161a26',
      'editorHoverWidget.border': '#262b3a',
      'editorBracketMatch.background': '#2b3050',
      'editorBracketMatch.border': '#82aaff',
      'editorError.foreground': '#f7768e',
      'editorWarning.foreground': '#ff9e64',
      'editorInfo.foreground': '#7dcfff',
      'scrollbarSlider.background': '#333a4d66',
      'scrollbarSlider.hoverBackground': '#3d456066',
      'scrollbarSlider.activeBackground': '#4a536e88',
      'editorGutter.modifiedBackground': '#e0af68',
      'editorGutter.addedBackground': '#9ece6a',
      'editorGutter.deletedBackground': '#f7768e',
      'diffEditor.insertedTextBackground': '#9ece6a22',
      'diffEditor.removedTextBackground': '#f7768e22',
    },
  })

  monaco.editor.defineTheme(NOVA_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8c8c8c', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'b072d1' },
      { token: 'string', foreground: '689f38' },
      { token: 'number', foreground: 'e65100' },
      { token: 'type', foreground: '2962ff' },
      { token: 'function', foreground: '2962ff' },
      { token: 'variable', foreground: '263238' },
      { token: 'delimiter', foreground: '00838f' },
      { token: 'operator', foreground: '00838f' },
      { token: 'tag', foreground: 'e53935' },
    ],
    colors: {
      'editor.background': '#fbfbfd',
      'editor.foreground': '#263238',
      'editor.lineHighlightBackground': '#eef1f6',
      'editorCursor.foreground': '#2962ff',
      'editor.selectionBackground': '#b7c8f0aa',
      'editorIndentGuide.background1': '#e4e7ee',
      'editorLineNumber.foreground': '#b0b6c4',
      'editorLineNumber.activeForeground': '#5c6470',
      'editorGutter.background': '#fbfbfd',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e2e5ec',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.border': '#e2e5ec',
      'editorSuggestWidget.selectedBackground': '#dfe6f7',
      'editorHoverWidget.background': '#ffffff',
      'editorHoverWidget.border': '#e2e5ec',
      'editorBracketMatch.background': '#d8e2ff',
      'editorBracketMatch.border': '#2962ff',
      'editorError.foreground': '#d32f2f',
      'editorWarning.foreground': '#f57c00',
      'scrollbarSlider.background': '#c3c8d480',
      'scrollbarSlider.hoverBackground': '#aeb4c280',
      'scrollbarSlider.activeBackground': '#939aa888',
    },
  })
}

export function setEditorTheme(mode: ThemeMode) {
  monaco.editor.setTheme(mode === NOVA_DARK ? NOVA_DARK : NOVA_LIGHT)
}

loader.config({ monaco })
