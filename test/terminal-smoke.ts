import { createDemoRoot, setBackend } from '../src/lib/fileSystem'
import { executeCommand } from '../src/lib/terminal'

async function run() {
  setBackend('virtual')
  const root = createDemoRoot()
  const handle = root.handle as never
  const out: string[] = []

  async function test(cwd: string, cmd: string) {
    const r = await executeCommand(handle, cwd, cmd)
    out.push(`$ ${cmd}  (cwd: ${cwd})`)
    for (const l of r.lines) out.push('  ' + JSON.stringify(l.slice(0, 90)))
    return r
  }

  await test('', 'pwd')
  await test('', 'ls')
  await test('', 'ls src')
  await test('', 'cd src')
  let r = await executeCommand(handle, 'src', 'ls')
  out.push('$ ls (in src): ' + r.lines.length)
  await test('src', 'cat components/Button.tsx')
  await test('src', 'tree')
  await test('', 'mkdir nueva-carpeta')
  await test('', 'touch nuevo.txt')
  await test('', 'ls -a')
  await test('', 'rm nuevo.txt')
  await test('', 'echo hola mundo')
  await test('', 'help')
  await test('', 'comando-inexistente')
  await test('', 'grep React src')
  await test('', 'find button')
  await test('', 'wc src/App.tsx')
  await test('', 'head -n 2 src/App.tsx')
  await test('', 'cd ..')
  await test('src', 'cd ..')
  await test('', 'cd /nueva-carpeta')
  r = await executeCommand(handle, 'nueva-carpeta', 'pwd')
  out.push('cwd after cd: ' + JSON.stringify(r.cwd))
  await test('nueva-carpeta', 'cd ..')

  // error cases
  await test('', 'cat no-existe.txt')
  await test('', 'cd no-existe')

  console.log(out.join('\n'))
}

run().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
