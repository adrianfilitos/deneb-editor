const EXT_LANG: Record<string, string> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cc': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.ps1': 'powershell',
  '.bat': 'bat',
  '.cmd': 'bat',
  '.lua': 'lua',
  '.pl': 'perl',
  '.r': 'r',
  '.dart': 'dart',
  '.scala': 'scala',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.astro': 'html',
  '.json': 'json',
  '.jsonc': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini',
  '.ini': 'ini',
  '.xml': 'xml',
  '.svg': 'xml',
  '.sql': 'sql',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.txt': 'plaintext',
  '.csv': 'plaintext',
  '.dockerfile': 'dockerfile',
  'Dockerfile': 'dockerfile',
  '.gitignore': 'plaintext',
  '.env': 'plaintext',
  '.gradle': 'groovy',
  '.proto': 'protobuf',
}

const NAME_LANG: Record<string, string> = {
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  'cmakelists.txt': 'cmake',
  'package.json': 'json',
  'tsconfig.json': 'json',
  'vite.config.ts': 'typescript',
  '.gitignore': 'plaintext',
  '.env': 'plaintext',
}

export function languageFromPath(path: string): string {
  const name = path.split('/').pop() || path
  const lower = name.toLowerCase()
  const byName = NAME_LANG[lower]
  if (byName) return byName
  const idx = name.lastIndexOf('.')
  if (idx >= 0) {
    const ext = name.slice(idx).toLowerCase()
    const l = EXT_LANG[ext]
    if (l) return l
  }
  return 'plaintext'
}

export function displayLanguage(path: string): string {
  const l = languageFromPath(path)
  const map: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    kotlin: 'Kotlin',
    shell: 'Shell Script',
    powershell: 'PowerShell',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    json: 'JSON',
    yaml: 'YAML',
    markdown: 'Markdown',
    plaintext: 'Texto plano',
    xml: 'XML',
    sql: 'SQL',
    dockerfile: 'Dockerfile',
    ini: 'INI',
  }
  return map[l] || l
}
