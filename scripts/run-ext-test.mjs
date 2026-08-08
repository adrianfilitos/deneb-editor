import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { rmSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '.build')
const outfile = join(outDir, 'test.mjs')

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const entryName = process.argv[2] || 'entry.ts'
const entryFile = join(here, 'ext-test', entryName)

await build({
  entryPoints: [entryFile],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  alias: {
    'monaco-editor': join(here, 'ext-test', 'stubs/monaco.ts'),
    zustand: join(here, 'ext-test', 'stubs/zustand.ts'),
  },
  logLevel: 'warning',
})

const res = spawnSync(process.execPath, [outfile], { stdio: 'inherit', encoding: 'utf8' })
process.exit(res.status ?? 1)
