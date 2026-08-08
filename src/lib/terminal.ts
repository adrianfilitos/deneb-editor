import { useEditorStore } from '../store/editorStore'
import {
  createDirAt,
  createFileAt,
  listAt,
  readFileAt,
  removeAt,
  resolvePath,
  writeFileAt,
  type AnyHandle,
} from './fileSystem'
import { isBinaryName } from './fileIcons'
import { languageFromPath } from './languages'

export interface TermResult {
  lines: string[]
  cwd: string
  exitCode: number
}

export const COMMANDS = [
  'help', 'clear', 'cls', 'pwd', 'ls', 'cd', 'cat', 'echo', 'mkdir', 'touch', 'rm', 'rmdir',
  'tree', 'cp', 'grep', 'open', 'code', 'find', 'wc', 'head', 'tail', 'whoami', 'date', 'hostname',
  'version', 'nova', 'color', 'exit',
]

function join(root: string, p: string): string {
  const clean = (s: string) => s.replace(/\\/g, '/').replace(/^\/+/, '')
  const combined = clean(p).startsWith(clean(root))
    ? clean(p)
    : `${clean(root)}/${clean(p)}`
  return combined
}

function displayPath(cwd: string): string {
  if (!cwd) return '~'
  return `~/${cwd}`
}

export async function executeCommand(rootHandle: AnyHandle, cwd: string, raw: string): Promise<TermResult> {
  const out: string[] = []
  const line = raw.trim()
  const args = line.split(/\s+/)
  const cmd = (args[0] || '').toLowerCase()
  const rest = args.slice(1)

  const err = (msg: string): TermResult => ({ lines: [`\u001b[31m${msg}\u001b[0m`], cwd, exitCode: 1 })

  const getRoot = (): AnyHandle | null => useEditorStore.getState().root?.handle as AnyHandle | null ?? null
  const realRoot = getRoot() || rootHandle

  async function openInEditor(path: string) {
    const full = join(cwd, path)
    const handle = await resolvePath(realRoot, full)
    if (!handle || handle.kind !== 'file') return false
    const store = useEditorStore.getState()
    if (!store.root) return false
    const treePath = store.root.path ? `${store.root.path}/${full}` : full
    await store.openFileByPath(treePath)
    store.setSidebarView('explorer')
    return true
  }

  switch (cmd) {
    case 'help': {
      out.push('')
      out.push('\u001b[1m\u001b[36mComandos disponibles en Nova Shell\u001b[0m')
      out.push('')
      const rows: [string, string][] = [
        ['help', 'Muestra esta ayuda'],
        ['clear | cls', 'Limpia la terminal'],
        ['pwd', 'Directorio de trabajo actual'],
        ['ls [-a] [ruta]', 'Lista el contenido de un directorio'],
        ['cd [ruta]', 'Cambia de directorio (.. para subir)'],
        ['cat <archivo>', 'Muestra el contenido de un archivo'],
        ['echo <texto>', 'Imprime texto'],
        ['mkdir <carpeta>', 'Crea un directorio'],
        ['touch <archivo>', 'Crea un archivo vacío'],
        ['rm [-r] <ruta>', 'Elimina archivo o carpeta (-r recursivo)'],
        ['rmdir <carpeta>', 'Elimina una carpeta vacía'],
        ['tree [ruta]', 'Árbol de directorios'],
        ['cp <origen> <destino>', 'Copia un archivo'],
        ['grep <patrón> [ruta]', 'Busca texto en archivos'],
        ['find <nombre>', 'Busca archivos por nombre'],
        ['wc [archivo]', 'Cuenta líneas, palabras y caracteres'],
        ['head [-n N] <archivo>', 'Primeras líneas'],
        ['tail [-n N] <archivo>', 'Últimas líneas'],
        ['open <archivo>', 'Abre el archivo en el editor'],
        ['whoami | date | hostname', 'Información del sistema'],
        ['version | nova', 'Información de Nova'],
        ['color', 'Imprime una muestra de colores'],
        ['exit', 'Cierra la terminal'],
      ]
      for (const [c, d] of rows) {
        out.push(`  \u001b[33m${c.padEnd(22)}\u001b[0m ${d}`)
      }
      out.push('')
      break
    }

    case 'clear':
    case 'cls':
      return { lines: ['\u001b[2J\u001b[H'], cwd, exitCode: 0 }

    case 'pwd':
      out.push(displayPath(cwd))
      break

    case 'ls': {
      const flags = rest.filter((a) => a.startsWith('-'))
      const target = rest.find((a) => !a.startsWith('-')) || '.'
      const full = join(cwd, target)
      const entries = await listAt(realRoot, full)
      if (!entries) return err(`ls: no existe '${target}'`)
      const showAll = flags.some((f) => f.includes('a'))
      const long = flags.some((f) => f.includes('l'))
      const filtered = showAll ? entries : entries.filter((e) => !e.name.startsWith('.'))
      if (!filtered.length) {
        out.push('')
        break
      }
      if (long) {
        for (const e of filtered) {
          const kind = e.kind === 'directory' ? '\u001b[1m\u001b[34md\u001b[0m' : '\u001b[36m-\u001b[0m'
          out.push(`${kind}  ${e.kind === 'directory' ? '\u001b[1m\u001b[34m' + e.name + '\u001b[0m' : e.name}`)
        }
      } else {
        let row = ''
        for (const e of filtered) {
          const label = e.kind === 'directory' ? `\u001b[1m\u001b[34m${e.name}/\u001b[0m` : e.name
          const sep = row ? '  ' : ''
          if ((row + sep + label.replace(/\u001b\[[0-9;]*m/g, '')).length > 60) {
            out.push(row)
            row = label
          } else {
            row += sep + label
          }
        }
        if (row) out.push(row)
      }
      break
    }

    case 'cd': {
      const target = rest[0] || ''
      if (target === '..') {
        const parent = cwd.split('/').slice(0, -1).join('/')
        out.push(displayPath(parent))
        return { lines: out, cwd: parent, exitCode: 0 }
      }
      const full = join(cwd, target)
      const handle = await resolvePath(realRoot, full)
      if (!handle || handle.kind !== 'directory') return err(`cd: no existe '${target}'`)
      out.push(displayPath(full))
      return { lines: out, cwd: full, exitCode: 0 }
    }

    case 'cat': {
      if (!rest.length) return err('cat: falta el nombre del archivo')
      const full = join(cwd, rest[0])
      const content = await readFileAt(realRoot, full)
      if (content === null) return err(`cat: no existe '${rest[0]}'`)
      const max = 2000
      const slice = content.slice(0, max)
      out.push(slice)
      if (content.length > max) out.push(`\u001b[90m... (${content.length} caracteres, truncado)\u001b[0m`)
      break
    }

    case 'echo':
      out.push(rest.join(' ').replace(/^["']|["']$/g, ''))
      break

    case 'mkdir': {
      if (!rest.length) return err('mkdir: falta el nombre')
      const ok = await createDirAt(realRoot, join(cwd, rest[0]))
      if (!ok) return err(`mkdir: no se pudo crear '${rest[0]}'`)
      break
    }

    case 'touch': {
      if (!rest.length) return err('touch: falta el nombre')
      const ok = await createFileAt(realRoot, join(cwd, rest[0]))
      if (!ok) return err(`touch: no se pudo crear '${rest[0]}'`)
      break
    }

    case 'rm': {
      if (!rest.length) return err('rm: falta el nombre')
      if (rest[0] === '-r' && rest.length > 1) {
        const ok = await removeAt(realRoot, join(cwd, rest[1]))
        if (!ok) return err(`rm: no existe '${rest[1]}'`)
      } else if (rest[0] === '-r') {
        return err('rm: falta el nombre')
      } else {
        const handle = await resolvePath(realRoot, join(cwd, rest[0]))
        if (!handle) return err(`rm: no existe '${rest[0]}'`)
        if (handle.kind === 'directory') return err(`rm: '${rest[0]}' es un directorio (usa rm -r)`)
        const ok = await removeAt(realRoot, join(cwd, rest[0]))
        if (!ok) return err(`rm: no se pudo eliminar '${rest[0]}'`)
      }
      break
    }

    case 'rmdir': {
      if (!rest.length) return err('rmdir: falta el nombre')
      const handle = await resolvePath(realRoot, join(cwd, rest[0]))
      if (!handle || handle.kind !== 'directory') return err(`rmdir: '${rest[0]}' no es un directorio`)
      const entries = await listAt(realRoot, join(cwd, rest[0]))
      if (entries && entries.filter((e) => !e.name.startsWith('.')).length) return err(`rmdir: '${rest[0]}' no está vacío`)
      const ok = await removeAt(realRoot, join(cwd, rest[0]))
      if (!ok) return err(`rmdir: no se pudo eliminar '${rest[0]}'`)
      break
    }

    case 'tree': {
      const target = rest[0] || '.'
      const full = join(cwd, target)
      const lines: string[] = []
      await walkTree(realRoot, full, '', lines, 0)
      out.push(full || '.')
      out.push(...lines)
      break
    }

    case 'cp': {
      if (rest.length < 2) return err('cp: falta origen o destino')
      const src = await readFileAt(realRoot, join(cwd, rest[0]))
      if (src === null) return err(`cp: no existe '${rest[0]}'`)
      const ok = await createFileAt(realRoot, join(cwd, rest[1]), src)
      if (!ok) return err(`cp: no se pudo copiar a '${rest[1]}'`)
      break
    }

    case 'grep': {
      if (!rest.length) return err('grep: falta el patrón')
      const pattern = rest[0]
      const target = rest[1] || cwd || ''
      let re: RegExp
      try {
        re = new RegExp(pattern, 'i')
      } catch {
        return err('grep: patrón no válido')
      }
      await walkGrep(realRoot, target, re, out, 0)
      if (!out.length) out.push(`grep: sin coincidencias`)
      break
    }

    case 'find': {
      if (!rest.length) return err('find: falta el nombre')
      const name = rest[0]
      const target = rest[1] || cwd || ''
      await walkFind(realRoot, target, name, out, 0)
      if (!out.length) out.push(`find: no se encontró '${name}'`)
      break
    }

    case 'wc': {
      if (!rest.length) return err('wc: falta el archivo')
      const content = await readFileAt(realRoot, join(cwd, rest[0]))
      if (content === null) return err(`wc: no existe '${rest[0]}'`)
      const lines = content.split('\n').length
      const words = content.split(/\s+/).filter(Boolean).length
      const chars = content.length
      out.push(`\u001b[36m${lines}\u001b[0m líneas  \u001b[36m${words}\u001b[0m palabras  \u001b[36m${chars}\u001b[0m caracteres`)
      break
    }

    case 'head':
    case 'tail': {
      let n = 10
      let file = rest[0]
      if (rest[0] === '-n' && rest[1]) {
        n = parseInt(rest[1], 10) || 10
        file = rest[2]
      }
      if (!file) return err(`${cmd}: falta el archivo`)
      const content = await readFileAt(realRoot, join(cwd, file))
      if (content === null) return err(`${cmd}: no existe '${file}'`)
      const allLines = content.split('\n')
      const slice = cmd === 'head' ? allLines.slice(0, n) : allLines.slice(-n)
      out.push(slice.join('\n'))
      break
    }

    case 'open':
    case 'code': {
      if (!rest.length) return err(`${cmd}: falta el archivo`)
      if (await openInEditor(rest[0])) out.push(`Abriendo ${join(cwd, rest[0])} en el editor`)
      else return err(`${cmd}: no se encontró '${rest[0]}'`)
      break
    }

    case 'whoami':
      out.push('usuario@nova')
      break

    case 'date':
      out.push(new Date().toLocaleString())
      break

    case 'hostname':
      out.push('nova-workspace')
      break

    case 'version':
    case 'nova':
      out.push('\u001b[1m\u001b[36mNova Shell\u001b[0m 1.0.0')
      out.push('Editor de código con IA · powered by Monaco')
      break

    case 'color': {
      out.push('Normal  \u001b[30mnegro\u001b[0m  \u001b[31mrojo\u001b[0m  \u001b[32mverde\u001b[0m  \u001b[33mamarillo\u001b[0m')
      out.push('\u001b[34mazul\u001b[0m  \u001b[35mmagenta\u001b[0m  \u001b[36mcian\u001b[0m  \u001b[37mblanco\u001b[0m  \u001b[90mgris\u001b[0m  \u001b[1mnegrita\u001b[0m')
      break
    }

    case 'exit':
      out.push('Cerrando terminal…')
      useEditorStore.getState().setBottomView(null)
      break

    default:
      return err(`\u001b[31m${cmd}: comando no encontrado\u001b[0m. Escribe 'help' para ver los disponibles.`)
  }

  return { lines: out, cwd, exitCode: 0 }
}

async function walkTree(root: AnyHandle, dirPath: string, prefix: string, out: string[], depth: number) {
  if (depth > 4) {
    out.push(`${prefix}\u001b[90m…\u001b[0m`)
    return
  }
  const entries = await listAt(root, dirPath)
  if (!entries) return
  const filtered = entries.filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
  filtered.forEach((e, i) => {
    const last = i === filtered.length - 1
    const branch = last ? '└─ ' : '├─ '
    const name = e.kind === 'directory' ? `\u001b[1m\u001b[34m${e.name}\u001b[0m` : e.name
    out.push(`${prefix}${branch}${name}`)
    if (e.kind === 'directory') {
      walkTree(root, `${dirPath}/${e.name}`, prefix + (last ? '   ' : '│  '), out, depth + 1)
    }
  })
}

async function walkGrep(root: AnyHandle, target: string, re: RegExp, out: string[], depth: number) {
  if (depth > 5) return
  const entries = await listAt(root, target)
  if (!entries) return
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const p = target ? `${target}/${e.name}` : e.name
    if (e.kind === 'directory') {
      await walkGrep(root, p, re, out, depth + 1)
    } else if (!isBinaryName(e.name)) {
      try {
        const content = await readFileAt(root, p)
        if (!content || content.length > 200_000) continue
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i])) {
            out.push(`\u001b[36m${p}\u001b[0m:\u001b[33m${i + 1}\u001b[0m:${lines[i].slice(0, 160)}`)
          }
        }
      } catch {
        // unreadable
      }
    }
  }
}

async function walkFind(root: AnyHandle, target: string, name: string, out: string[], depth: number) {
  if (depth > 6) return
  const entries = await listAt(root, target)
  if (!entries) return
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const p = target ? `${target}/${e.name}` : e.name
    if (e.name.toLowerCase().includes(name.toLowerCase())) {
      out.push(e.kind === 'directory' ? `\u001b[34m${p}/\u001b[0m` : p)
    }
    if (e.kind === 'directory') await walkFind(root, p, name, out, depth + 1)
  }
}
