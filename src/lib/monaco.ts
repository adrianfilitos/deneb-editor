import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import type { ThemeId } from '../types'

export type ThemeMode = ThemeId

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

export const NOVA_DARK: ThemeId = 'nova-dark'
export const NOVA_LIGHT: ThemeId = 'nova-light'

interface ThemePalette {
  base: 'vs-dark' | 'vs'
  bg: string
  fg: string
  comment: string
  keyword: string
  string: string
  number: string
  type: string
  fn: string
  variable: string
  delimiter: string
  tag: string
  lineHighlight: string
  cursor: string
  selection: string
  inactiveSelection: string
  indent: string
  indentActive: string
  lineNumber: string
  lineNumberActive: string
  widgetBg: string
  widgetBorder: string
  suggestSelected: string
  bracketBg: string
  error: string
  warning: string
  info: string
  modified: string
  added: string
  deleted: string
  scrollbar: string
  scrollbarHover: string
  scrollbarActive: string
}

export const THEME_PALETTES: Record<ThemeId, ThemePalette> = {
  'nova-dark': {
    base: 'vs-dark',
    bg: '#0f111a',
    fg: '#d5d9e6',
    comment: '#6b7280',
    keyword: '#c792ea',
    string: '#a5e075',
    number: '#f78c6c',
    type: '#82aaff',
    fn: '#82aaff',
    variable: '#eeffff',
    delimiter: '#89ddff',
    tag: '#f07178',
    lineHighlight: '#171a26',
    cursor: '#82aaff',
    selection: '#3b4261cc',
    inactiveSelection: '#2b3150aa',
    indent: '#20242f',
    indentActive: '#3d4356',
    lineNumber: '#3d4356',
    lineNumberActive: '#8a93a8',
    widgetBg: '#161a26',
    widgetBorder: '#262b3a',
    suggestSelected: '#2a3045',
    bracketBg: '#2b3050',
    error: '#f7768e',
    warning: '#ff9e64',
    info: '#7dcfff',
    modified: '#e0af68',
    added: '#9ece6a',
    deleted: '#f7768e',
    scrollbar: '#333a4d66',
    scrollbarHover: '#3d456066',
    scrollbarActive: '#4a536e88',
  },
  'nova-light': {
    base: 'vs',
    bg: '#fbfbfd',
    fg: '#263238',
    comment: '#8c8c8c',
    keyword: '#b072d1',
    string: '#689f38',
    number: '#e65100',
    type: '#2962ff',
    fn: '#2962ff',
    variable: '#263238',
    delimiter: '#00838f',
    tag: '#e53935',
    lineHighlight: '#eef1f6',
    cursor: '#2962ff',
    selection: '#b7c8f0aa',
    inactiveSelection: '#d8e2ff66',
    indent: '#e4e7ee',
    indentActive: '#c3cbd8',
    lineNumber: '#b0b6c4',
    lineNumberActive: '#5c6470',
    widgetBg: '#ffffff',
    widgetBorder: '#e2e5ec',
    suggestSelected: '#dfe6f7',
    bracketBg: '#d8e2ff',
    error: '#d32f2f',
    warning: '#f57c00',
    info: '#0288d1',
    modified: '#b45309',
    added: '#2e7d32',
    deleted: '#d32f2f',
    scrollbar: '#c3c8d480',
    scrollbarHover: '#aeb4c280',
    scrollbarActive: '#939aa888',
  },
  'nova-midnight': {
    base: 'vs-dark',
    bg: '#0a0e1c',
    fg: '#dbe4ff',
    comment: '#5a658c',
    keyword: '#a78bfa',
    string: '#34d399',
    number: '#fbbf24',
    type: '#60a5fa',
    fn: '#60a5fa',
    variable: '#e7ecff',
    delimiter: '#22d3ee',
    tag: '#fb7185',
    lineHighlight: '#101a30',
    cursor: '#60a5fa',
    selection: '#60a5fa66',
    inactiveSelection: '#3b82f633',
    indent: '#16203a',
    indentActive: '#243253',
    lineNumber: '#3d4a75',
    lineNumberActive: '#93a4d8',
    widgetBg: '#0e1526',
    widgetBorder: '#1e2a44',
    suggestSelected: '#1b2742',
    bracketBg: '#1f2c4d',
    error: '#fb7185',
    warning: '#fbbf24',
    info: '#22d3ee',
    modified: '#fbbf24',
    added: '#34d399',
    deleted: '#fb7185',
    scrollbar: '#42508f66',
    scrollbarHover: '#4c5ba866',
    scrollbarActive: '#5a6ab888',
  },
  'nova-ocean': {
    base: 'vs-dark',
    bg: '#07151d',
    fg: '#d6f2ff',
    comment: '#4e7689',
    keyword: '#818cf8',
    string: '#4ade80',
    number: '#fbbf24',
    type: '#38bdf8',
    fn: '#38bdf8',
    variable: '#e2f7ff',
    delimiter: '#22d3ee',
    tag: '#fb7185',
    lineHighlight: '#0a1c27',
    cursor: '#38bdf8',
    selection: '#38bdf866',
    inactiveSelection: '#0ea5e933',
    indent: '#0f2a37',
    indentActive: '#1a4256',
    lineNumber: '#38606f',
    lineNumberActive: '#8fc3d8',
    widgetBg: '#0a1c27',
    widgetBorder: '#123445',
    suggestSelected: '#123445',
    bracketBg: '#123445',
    error: '#fb7185',
    warning: '#fbbf24',
    info: '#22d3ee',
    modified: '#fbbf24',
    added: '#4ade80',
    deleted: '#fb7185',
    scrollbar: '#3882a066',
    scrollbarHover: '#46a0c266',
    scrollbarActive: '#56bcd966',
  },
  'nova-forest': {
    base: 'vs-dark',
    bg: '#0d1510',
    fg: '#dcf5e4',
    comment: '#5c7a68',
    keyword: '#c084fc',
    string: '#4ade80',
    number: '#fbbf24',
    type: '#4ade80',
    fn: '#4ade80',
    variable: '#e9f9ee',
    delimiter: '#22d3ee',
    tag: '#fb7185',
    lineHighlight: '#111c15',
    cursor: '#4ade80',
    selection: '#4ade8059',
    inactiveSelection: '#22c55e2e',
    indent: '#18281d',
    indentActive: '#24422f',
    lineNumber: '#41604d',
    lineNumberActive: '#9fc9ad',
    widgetBg: '#111c15',
    widgetBorder: '#1e3326',
    suggestSelected: '#18281d',
    bracketBg: '#1e3326',
    error: '#fb7185',
    warning: '#fbbf24',
    info: '#22d3ee',
    modified: '#fbbf24',
    added: '#4ade80',
    deleted: '#fb7185',
    scrollbar: '#5a966e66',
    scrollbarHover: '#6cad8366',
    scrollbarActive: '#7ec29888',
  },
  'nova-sunset': {
    base: 'vs-dark',
    bg: '#170f0a',
    fg: '#fbe9d6',
    comment: '#8a6f55',
    keyword: '#f9a8d4',
    string: '#86efac',
    number: '#fbbf24',
    type: '#fb923c',
    fn: '#fb923c',
    variable: '#fdf0e2',
    delimiter: '#7dd3fc',
    tag: '#f87171',
    lineHighlight: '#1d140d',
    cursor: '#fb923c',
    selection: '#fb923c59',
    inactiveSelection: '#f9731630',
    indent: '#2a1c10',
    indentActive: '#4a3018',
    lineNumber: '#6b533a',
    lineNumberActive: '#c7a88c',
    widgetBg: '#1d140d',
    widgetBorder: '#3a2817',
    suggestSelected: '#2a1c10',
    bracketBg: '#3a2817',
    error: '#f87171',
    warning: '#fbbf24',
    info: '#7dd3fc',
    modified: '#fbbf24',
    added: '#86efac',
    deleted: '#f87171',
    scrollbar: '#b4825066',
    scrollbarHover: '#c8936266',
    scrollbarActive: '#d9a57588',
  },
  'nova-sakura': {
    base: 'vs-dark',
    bg: '#180f16',
    fg: '#ffe4f0',
    comment: '#8a6a7f',
    keyword: '#c084fc',
    string: '#86efac',
    number: '#fbbf24',
    type: '#f472b6',
    fn: '#f472b6',
    variable: '#ffedf6',
    delimiter: '#67e8f9',
    tag: '#f87171',
    lineHighlight: '#20151f',
    cursor: '#f472b6',
    selection: '#f472b659',
    inactiveSelection: '#ec489930',
    indent: '#2e1c2a',
    indentActive: '#4a2c42',
    lineNumber: '#6b4a60',
    lineNumberActive: '#cfa0be',
    widgetBg: '#20151f',
    widgetBorder: '#3a2436',
    suggestSelected: '#2e1c2a',
    bracketBg: '#3a2436',
    error: '#f87171',
    warning: '#fbbf24',
    info: '#67e8f9',
    modified: '#fbbf24',
    added: '#86efac',
    deleted: '#f87171',
    scrollbar: '#c86ea066',
    scrollbarHover: '#d67fb366',
    scrollbarActive: '#e690c288',
  },
  'nova-mono': {
    base: 'vs-dark',
    bg: '#101010',
    fg: '#e5e5e5',
    comment: '#626262',
    keyword: '#d9d9e3',
    string: '#a9c9b0',
    number: '#d9c39f',
    type: '#b9b9c7',
    fn: '#cfcfcf',
    variable: '#e5e5e5',
    delimiter: '#a3a3a3',
    tag: '#c9a3a3',
    lineHighlight: '#181818',
    cursor: '#a3a3a3',
    selection: '#a3a3a355',
    inactiveSelection: '#6666662e',
    indent: '#1f1f1f',
    indentActive: '#2c2c2c',
    lineNumber: '#454545',
    lineNumberActive: '#9a9a9a',
    widgetBg: '#161616',
    widgetBorder: '#2c2c2c',
    suggestSelected: '#1f1f1f',
    bracketBg: '#2c2c2c',
    error: '#c97878',
    warning: '#c9b178',
    info: '#7fa8c9',
    modified: '#c9b178',
    added: '#8fbf9f',
    deleted: '#c97878',
    scrollbar: '#5a5a5a66',
    scrollbarHover: '#6d6d6d66',
    scrollbarActive: '#80808088',
  },
  'nova-paper': {
    base: 'vs',
    bg: '#f6f1e7',
    fg: '#3b3a33',
    comment: '#9a9484',
    keyword: '#7c3aed',
    string: '#3f6212',
    number: '#b45309',
    type: '#9a3412',
    fn: '#0f766e',
    variable: '#3b3a33',
    delimiter: '#0e7490',
    tag: '#b91c1c',
    lineHighlight: '#efe7d6',
    cursor: '#b45309',
    selection: '#b4530926',
    inactiveSelection: '#9a34121a',
    indent: '#ded5c0',
    indentActive: '#c9bfa8',
    lineNumber: '#b3aa93',
    lineNumberActive: '#6f6b5e',
    widgetBg: '#fdfaf3',
    widgetBorder: '#d9d0bd',
    suggestSelected: '#e9dfc9',
    bracketBg: '#e3d7bd',
    error: '#b91c1c',
    warning: '#b45309',
    info: '#0e7490',
    modified: '#b45309',
    added: '#3f6212',
    deleted: '#b91c1c',
    scrollbar: '#00000029',
    scrollbarHover: '#00000040',
    scrollbarActive: '#00000059',
  },
}

export const THEME_IDS = Object.keys(THEME_PALETTES) as ThemeId[]

let themesDefined = false

function defineNovaTheme(id: ThemeId, p: ThemePalette) {
  monaco.editor.defineTheme(id, {
    base: p.base,
    inherit: true,
    rules: [
      { token: 'comment', foreground: p.comment, fontStyle: 'italic' },
      { token: 'keyword', foreground: p.keyword },
      { token: 'string', foreground: p.string },
      { token: 'number', foreground: p.number },
      { token: 'type', foreground: p.type },
      { token: 'function', foreground: p.fn },
      { token: 'variable', foreground: p.variable },
      { token: 'delimiter', foreground: p.delimiter },
      { token: 'operator', foreground: p.delimiter },
      { token: 'tag', foreground: p.tag },
      { token: 'attribute.name', foreground: p.keyword },
      { token: 'attribute.value', foreground: p.string },
    ],
    colors: {
      'editor.background': p.bg,
      'editor.foreground': p.fg,
      'editor.lineHighlightBackground': p.lineHighlight,
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': p.cursor,
      'editor.selectionBackground': p.selection,
      'editor.inactiveSelectionBackground': p.inactiveSelection,
      'editorIndentGuide.background1': p.indent,
      'editorIndentGuide.activeBackground1': p.indentActive,
      'editorLineNumber.foreground': p.lineNumber,
      'editorLineNumber.activeForeground': p.lineNumberActive,
      'editorGutter.background': p.bg,
      'editorWidget.background': p.widgetBg,
      'editorWidget.border': p.widgetBorder,
      'editorSuggestWidget.background': p.widgetBg,
      'editorSuggestWidget.border': p.widgetBorder,
      'editorSuggestWidget.selectedBackground': p.suggestSelected,
      'editorHoverWidget.background': p.widgetBg,
      'editorHoverWidget.border': p.widgetBorder,
      'editorBracketMatch.background': p.bracketBg,
      'editorBracketMatch.border': p.cursor,
      'editorError.foreground': p.error,
      'editorWarning.foreground': p.warning,
      'editorInfo.foreground': p.info,
      'scrollbarSlider.background': p.scrollbar,
      'scrollbarSlider.hoverBackground': p.scrollbarHover,
      'scrollbarSlider.activeBackground': p.scrollbarActive,
      'editorGutter.modifiedBackground': p.modified,
      'editorGutter.addedBackground': p.added,
      'editorGutter.deletedBackground': p.deleted,
      'diffEditor.insertedTextBackground': p.added + '22',
      'diffEditor.removedTextBackground': p.deleted + '22',
    },
  })
}

export function defineNovaThemes() {
  if (themesDefined) return
  themesDefined = true
  for (const id of THEME_IDS) {
    defineNovaTheme(id, THEME_PALETTES[id])
  }
}

export function setEditorTheme(mode: ThemeMode) {
  monaco.editor.setTheme(mode)
}

loader.config({ monaco })
