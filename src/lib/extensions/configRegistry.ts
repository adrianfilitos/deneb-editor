export interface ContributedConfigProp {
  key: string
  type: string
  default?: unknown
  description?: string
  enum?: unknown[]
  enumDescriptions?: string[]
  minimum?: number
  maximum?: number
  scope?: string
}

export interface ContributedConfigSection {
  extId: string
  title: string
  properties: ContributedConfigProp[]
}

const sections = new Map<string, ContributedConfigSection>()
const byProp = new Map<string, ContributedConfigProp>()

/** Registra contributes.configuration (section + properties) de una extensión. */
export function registerConfiguration(extId: string, config: {
  title?: string
  properties?: Record<string, Record<string, unknown>>
}) {
  const props: ContributedConfigProp[] = []
  for (const [key, def] of Object.entries(config.properties || {})) {
    const prop: ContributedConfigProp = {
      key,
      type: String(def.type || typeof def.default || 'string'),
      default: def.default,
      description: def.description ? String(def.description) : undefined,
      enum: Array.isArray(def.enum) ? def.enum : undefined,
      enumDescriptions: Array.isArray(def.enumDescriptions) ? def.enumDescriptions.map(String) : undefined,
      minimum: typeof def.minimum === 'number' ? def.minimum : undefined,
      maximum: typeof def.maximum === 'number' ? def.maximum : undefined,
      scope: def.scope ? String(def.scope) : undefined,
    }
    props.push(prop)
    byProp.set(key, prop)
  }
  sections.set(extId, { extId, title: config.title || extId, properties: props })
}

export function unregisterConfiguration(extId: string) {
  const sec = sections.get(extId)
  if (sec) for (const p of sec.properties) byProp.delete(p.key)
  sections.delete(extId)
}

export function getContributedConfigSections(): ContributedConfigSection[] {
  return [...sections.values()]
}

export function getContributedConfigDefault(key: string): unknown | undefined {
  return byProp.get(key)?.default
}

export function getContributedConfigProp(key: string): ContributedConfigProp | undefined {
  return byProp.get(key)
}
