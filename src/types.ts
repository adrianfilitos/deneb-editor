export type SidebarView = 'explorer' | 'search' | 'ai' | 'extensions' | 'settings' | 'outline' | 'git'

export interface VirtualFile {
  kind: 'file'
  name: string
  content: string
  mtime: number
}

export interface VirtualDir {
  kind: 'directory'
  name: string
  entries: Map<string, VirtualEntry>
}

export type VirtualEntry = VirtualFile | VirtualDir

export interface DesktopEntry {
  kind: 'file' | 'directory'
  name: string
  absPath: string
}

export interface TreeNode {
  name: string
  path: string
  kind: 'file' | 'directory'
  children?: TreeNode[]
  loaded?: boolean
  expanded?: boolean
  handle?: FileSystemDirectoryHandle | FileSystemFileHandle | VirtualEntry | DesktopEntry
  size?: number
}

export interface OpenTab {
  path: string
  name: string
  language: string
  content: string
  savedContent: string
  dirty: boolean
}

export type ThemeId =
  | 'nova-dark'
  | 'nova-light'
  | 'nova-midnight'
  | 'nova-ocean'
  | 'nova-forest'
  | 'nova-sunset'
  | 'nova-sakura'
  | 'nova-mono'
  | 'nova-paper'

export interface ThemeSettings {
  mode: ThemeId
}

export type AIProvider = 'deepseek' | 'openai' | 'anthropic' | 'local'

export interface AISettings {
  provider: AIProvider
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

export interface EditorSettings {
  fontSize: number
  tabSize: number
  wordWrap: 'off' | 'on'
  minimap: boolean
  lineNumbers: 'on' | 'relative' | 'off'
  formatOnSave: boolean
  vimMode: boolean
  theme: ThemeSettings['mode']
  ai: AISettings
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  streaming?: boolean
}

export interface AISuggestion {
  id: string
  title: string
  description: string
}

export interface CursorPosition {
  lineNumber: number
  column: number
}

export interface SearchResult {
  path: string
  matches: { line: number; text: string; start: number; end: number }[]
}

export interface RecentFile {
  path: string
  name: string
  lastOpened: number
}
