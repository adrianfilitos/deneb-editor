export interface FileIconSpec {
  name: string
  color: string
  bg?: string
}

const SPECS: Record<string, FileIconSpec> = {
  // Source
  '.js': { name: 'Js', color: '#e8d44d' },
  '.jsx': { name: 'React', color: '#61dafb' },
  '.ts': { name: 'Ts', color: '#3178c6' },
  '.tsx': { name: 'React', color: '#3178c6' },
  '.py': { name: 'Py', color: '#ffd845' },
  '.go': { name: 'Go', color: '#00add8' },
  '.rs': { name: 'Rs', color: '#dea584' },
  '.java': { name: 'Java', color: '#e76f00' },
  '.c': { name: 'C', color: '#a8b7c6' },
  '.h': { name: 'C', color: '#a8b7c6' },
  '.cpp': { name: 'C++', color: '#f34b7d' },
  '.cs': { name: 'C#', color: '#5c2d91' },
  '.php': { name: 'Php', color: '#777bb4' },
  '.rb': { name: 'Rb', color: '#cc342d' },
  '.swift': { name: 'Swift', color: '#f05138' },
  '.kt': { name: 'Kotlin', color: '#a97bff' },
  '.sh': { name: 'Sh', color: '#89e051' },
  '.ps1': { name: 'Ps', color: '#012456' },
  '.lua': { name: 'Lua', color: '#000080' },
  '.pl': { name: 'Pl', color: '#0298c3' },
  '.r': { name: 'R', color: '#198ce7' },
  '.dart': { name: 'Dart', color: '#0175c2' },
  '.scala': { name: 'Scala', color: '#c22d40' },
  '.groovy': { name: 'Groovy', color: '#4298b8' },
  '.ex': { name: 'Elixir', color: '#6e4a7e' },
  '.erl': { name: 'Erlang', color: '#b83998' },
  '.hs': { name: 'Hs', color: '#5e5186' },
  '.clj': { name: 'Clojure', color: '#63b132' },
  // Web
  '.html': { name: 'Html', color: '#e44d26' },
  '.htm': { name: 'Html', color: '#e44d26' },
  '.css': { name: 'Css', color: '#42a5f5' },
  '.scss': { name: 'Scss', color: '#cd6799' },
  '.sass': { name: 'Sass', color: '#cd6799' },
  '.less': { name: 'Less', color: '#1d365d' },
  '.vue': { name: 'Vue', color: '#42b883' },
  '.svelte': { name: 'Svelte', color: '#ff3e00' },
  '.astro': { name: 'Astro', color: '#ff5d01' },
  // Data / config
  '.json': { name: '{}', color: '#cbcb41' },
  '.jsonc': { name: '{}', color: '#cbcb41' },
  '.yaml': { name: 'Yaml', color: '#cb171e' },
  '.yml': { name: 'Yaml', color: '#cb171e' },
  '.toml': { name: 'Toml', color: '#9c4221' },
  '.xml': { name: 'Xml', color: '#e37933' },
  '.sql': { name: 'Sql', color: '#e38c00' },
  '.md': { name: 'Md', color: '#519aba' },
  '.txt': { name: 'Txt', color: '#9d9d9d' },
  '.csv': { name: 'Csv', color: '#217346' },
  // Config files by name
  'package.json': { name: 'npm', color: '#cb3837' },
  'package-lock.json': { name: 'lock', color: '#cb3837' },
  'tsconfig.json': { name: 'tsc', color: '#3178c6' },
  'vite.config.ts': { name: 'vite', color: '#646cff' },
  'README.md': { name: 'Rd', color: '#519aba' },
  'Dockerfile': { name: 'Docker', color: '#2496ed' },
  '.gitignore': { name: 'Git', color: '#f05033' },
  '.env': { name: 'Env', color: '#fca121' },
  // Images
  '.png': { name: 'img', color: '#9664f8' },
  '.jpg': { name: 'img', color: '#9664f8' },
  '.jpeg': { name: 'img', color: '#9664f8' },
  '.svg': { name: 'svg', color: '#ff9800' },
  '.gif': { name: 'img', color: '#9664f8' },
  '.ico': { name: 'img', color: '#9664f8' },
  '.woff': { name: 'font', color: '#0aa0b4' },
  '.ttf': { name: 'font', color: '#0aa0b4' },
  // Generic
  '': { name: 'File', color: '#9d9d9d' },
}

const BY_EXT = new Map<string, FileIconSpec>()
const BY_NAME = new Map<string, FileIconSpec>()

for (const [key, spec] of Object.entries(SPECS)) {
  if (key.startsWith('.')) BY_EXT.set(key, spec)
  else BY_NAME.set(key.toLowerCase(), spec)
}

const FALLBACK: FileIconSpec = { name: 'File', color: '#9d9d9d' }

export function iconForFile(name: string): FileIconSpec {
  const lower = name.toLowerCase()
  const byName = BY_NAME.get(lower)
  if (byName) return byName
  const idx = name.lastIndexOf('.')
  if (idx >= 0) {
    const ext = name.slice(idx).toLowerCase()
    const byExt = BY_EXT.get(ext)
    if (byExt) return byExt
  }
  return FALLBACK
}

export function isBinaryName(name: string): boolean {
  const idx = name.lastIndexOf('.')
  if (idx < 0) return false
  return ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.zip', '.tar', '.gz', '.pdf', '.exe', '.dll'].includes(name.slice(idx).toLowerCase())
}

export function folderIcon(expanded: boolean): string {
  return expanded ? 'folder-open' : 'folder'
}
