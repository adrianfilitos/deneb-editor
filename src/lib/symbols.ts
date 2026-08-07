export interface SymbolInfo {
  name: string
  kind: 'function' | 'class' | 'method' | 'variable' | 'interface' | 'struct' | 'type' | 'enum' | 'selector' | 'heading' | 'import' | 'other'
  line: number
  depth: number
}

const KIND_ICON: Record<SymbolInfo['kind'], string> = {
  function: 'ƒ',
  class: 'C',
  method: 'ƒ',
  variable: 'x',
  interface: 'I',
  struct: 'S',
  type: 'T',
  enum: 'E',
  selector: '#',
  heading: '#',
  import: '←',
  other: '•',
}

export function kindIcon(kind: SymbolInfo['kind']): string {
  return KIND_ICON[kind]
}

interface Rule {
  re: RegExp
  kind: SymbolInfo['kind']
  nameGroup: number
}

function rulesFor(language: string): Rule[] {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return [
        { re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/, kind: 'function', nameGroup: 1 },
        { re: /^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: 'class', nameGroup: 1 },
        { re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: 'interface', nameGroup: 1 },
        { re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/, kind: 'type', nameGroup: 1 },
        { re: /^\s*(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)/, kind: 'enum', nameGroup: 1 },
        { re: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function)/, kind: 'function', nameGroup: 1 },
        { re: /^\s*(?:export\s+)?let\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function)/, kind: 'variable', nameGroup: 1 },
        { re: /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/, kind: 'method', nameGroup: 1 },
        { re: /^\s+(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/, kind: 'method', nameGroup: 1 },
        { re: /^\s*import\s+.*\s+from\s+["']([^"']+)["']/, kind: 'import', nameGroup: 1 },
      ]
    case 'python':
      return [
        { re: /^\s*class\s+(\w+)/, kind: 'class', nameGroup: 1 },
        { re: /^\s*(?:async\s+)?def\s+(\w+)/, kind: 'function', nameGroup: 1 },
      ]
    case 'go':
      return [
        { re: /^\s*func\s+\([^)]*\)\s+(\w+)/, kind: 'method', nameGroup: 1 },
        { re: /^\s*func\s+(\w+)/, kind: 'function', nameGroup: 1 },
        { re: /^\s*type\s+(\w+)\s+(?:struct|interface)\b/, kind: 'struct', nameGroup: 1 },
      ]
    case 'rust':
      return [
        { re: /^\s*(?:pub\s+)?fn\s+(\w+)/, kind: 'function', nameGroup: 1 },
        { re: /^\s*(?:pub\s+)?struct\s+(\w+)/, kind: 'struct', nameGroup: 1 },
        { re: /^\s*(?:pub\s+)?enum\s+(\w+)/, kind: 'enum', nameGroup: 1 },
        { re: /^\s*(?:pub\s+)?trait\s+(\w+)/, kind: 'interface', nameGroup: 1 },
        { re: /^\s+(?:pub\s+)?fn\s+(\w+)/, kind: 'method', nameGroup: 1 },
      ]
    case 'java':
    case 'cpp':
    case 'c':
    case 'csharp':
      return [
        { re: /^\s*(?:public|private|protected)\s+class\s+(\w+)/, kind: 'class', nameGroup: 1 },
        { re: /^\s*(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\],\s]+\s+(\w+)\s*\(/, kind: 'method', nameGroup: 1 },
      ]
    case 'css':
    case 'scss':
    case 'less':
      return [
        { re: /^\s*(@media\b[^{]*)/, kind: 'selector', nameGroup: 1 },
        { re: /^\s*([.#]?[\w-]+(?:[.#][\w-]+)*)\s*\{/, kind: 'selector', nameGroup: 1 },
      ]
    case 'html':
      return [
        { re: /^\s*<!--\s*(.*?)-->/, kind: 'heading', nameGroup: 1 },
      ]
    case 'markdown':
      return [
        { re: /^#{1,3}\s+(.*)/, kind: 'heading', nameGroup: 1 },
      ]
    case 'php':
      return [
        { re: /^\s*(?:public|private|protected)\s+function\s+(\w+)/, kind: 'method', nameGroup: 1 },
        { re: /^\s*function\s+(\w+)/, kind: 'function', nameGroup: 1 },
        { re: /^\s*(?:abstract\s+)?class\s+(\w+)/, kind: 'class', nameGroup: 1 },
      ]
    case 'ruby':
      return [
        { re: /^\s*class\s+(\w+)/, kind: 'class', nameGroup: 1 },
        { re: /^\s*def\s+(\w+)/, kind: 'function', nameGroup: 1 },
      ]
    case 'swift':
      return [
        { re: /^\s*(?:public\s+)?func\s+(\w+)/, kind: 'function', nameGroup: 1 },
        { re: /^\s*(?:public\s+)?class\s+(\w+)/, kind: 'class', nameGroup: 1 },
        { re: /^\s*(?:public\s+)?struct\s+(\w+)/, kind: 'struct', nameGroup: 1 },
      ]
    case 'kotlin':
      return [
        { re: /^\s*(?:fun\s+)?(\w+)\s*\(/ , kind: 'function', nameGroup: 1 },
        { re: /^\s*(?:class|interface)\s+(\w+)/, kind: 'class', nameGroup: 1 },
      ]
    default:
      return []
  }
}

export function extractSymbols(code: string, language: string): SymbolInfo[] {
  const rules = rulesFor(language)
  if (!rules.length) return []
  const lines = code.split('\n')
  const out: SymbolInfo[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('//') || line.trim().startsWith('*')) continue
    for (const rule of rules) {
      const m = rule.re.exec(line)
      if (m) {
        const name = m[rule.nameGroup] || line.trim()
        const indent = line.match(/^\s*/)?.[0].length || 0
        out.push({ name: name.replace(/["']/g, '').trim(), kind: rule.kind, line: i + 1, depth: Math.floor(indent / 2) })
        break
      }
    }
  }
  return out
}
