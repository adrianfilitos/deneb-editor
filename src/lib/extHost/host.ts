import { createVscodeApi, type HostHandle } from './vscodeShim'
import type { InstalledExt } from '../extensionTypes'
import { getParsedVsix } from '../vsixParser'
import { CommonJsLoader } from '../extensions/loader'
import { getNodeBuiltins } from '../extensions/nodeBuiltins'
import { extFs } from '../extensions/extFs'
import { useExtensionStore } from '../../store/extensionStore'

const hosts = new Map<string, HostHandle>()

export interface RunningHost {
  id: string
  handle: HostHandle
}

export function isHostRunning(id: string): boolean {
  return hosts.has(id)
}

function status(msg: string) {
  window.dispatchEvent(new CustomEvent('nova:status', { detail: msg }))
}

/**
 * Ejecuta el main de la extensión con el cargador CommonJS de Nova:
 * resuelve require('vscode') contra el shim, los builtins de Node contra los
 * polyfills (fs sobre el workspace real) y las rutas relativas dentro del .vsix.
 */
export async function runExtension(ext: InstalledExt): Promise<boolean> {
  const parsed = getParsedVsix(ext.id)
  if (!ext.code && !parsed) return false
  if (hosts.has(ext.id)) return true

  const handle = createVscodeApi(ext.id, { id: ext.id, version: ext.version })
  const builtins = getNodeBuiltins()
  const env = {
    vscode: handle.api,
    builtins,
    process: builtins.process,
    globalThisRef: globalThis,
  }

  const files: Record<string, Uint8Array> = parsed
    ? parsed.files
    : { 'extension.js': new TextEncoder().encode(ext.code || '') }
  const main = parsed?.main ?? 'extension.js'

  let exported: any
  try {
    await extFs.hydrate()
    if (useExtensionStore.getState().installed[ext.id]?.enabled === false) {
      handle.disposeAll()
      return false
    }
    const loader = new CommonJsLoader(files, env)
    exported = loader.loadMain(main)
  } catch (e) {
    status(`La extensión ${ext.name} no pudo activarse: ${(e as Error).message}`)
    handle.disposeAll()
    return false
  }

  const activate = typeof exported === 'function' ? exported : exported?.activate
  if (typeof activate === 'function') {
    try {
      const r = activate(handle.context)
      if (r && typeof r.then === 'function') {
        r.catch((err: Error) => {
          status(`Error al activar ${ext.name}: ${err.message}`)
        })
      }
    } catch (e) {
      status(`Error al activar ${ext.name}: ${(e as Error).message}`)
      handle.disposeAll()
      return false
    }
  }

  hosts.set(ext.id, handle)
  return true
}

export function stopExtension(id: string) {
  const handle = hosts.get(id)
  if (!handle) return
  handle.disposeAll()
  hosts.delete(id)
}
