import { unzipSync, strFromU8 } from 'fflate'

const res = await fetch('https://open-vsx.org/api/-/search?query=LiveServer&size=10')
const body = await res.json()
const ext = (body.extensions || []).find((e) => e.name === 'LiveServer' && e.files?.download)
if (!ext) {
  console.log('no LiveServer')
  process.exit(1)
}
console.log(`extension: ${ext.namespace}.${ext.name} v${ext.version}`)
const bytes = new Uint8Array(await (await fetch(ext.files.download)).arrayBuffer())
const files = unzipSync(bytes)
const pkg = JSON.parse(strFromU8(files['extension/package.json']))
console.log('main:', pkg.main)
console.log('activationEvents:', JSON.stringify(pkg.activationEvents))
const c = pkg.contributes || {}
console.log('commands:', (c.commands || []).map((x) => x.command + ' — ' + x.title))
console.log('menus:', JSON.stringify(c.menus || {}, null, 2))
