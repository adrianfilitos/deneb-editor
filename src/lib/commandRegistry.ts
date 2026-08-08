import type { CommandDef } from '../commands'

const dynamic: CommandDef[] = []

export function registerDynamicCommand(def: CommandDef) {
  if (dynamic.some((c) => c.id === def.id)) return
  dynamic.push(def)
}

export function unregisterDynamicCommand(id: string) {
  const i = dynamic.findIndex((c) => c.id === id)
  if (i >= 0) dynamic.splice(i, 1)
}

export function getDynamicCommands(): CommandDef[] {
  return dynamic
}
