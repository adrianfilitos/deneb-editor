export interface OpenVSXExtension {
  name: string
  namespace: string
  version: string
  displayName?: string
  description?: string
  downloadCount?: number
  averageRating?: number
  rating?: number
  timestamp?: string
  preview?: boolean
  files?: {
    icon?: string
    download?: string
    readme?: string
  }
  publisher?: {
    displayName?: string
    url?: string
  }
}

export interface OpenVSXSearchResult {
  extensions: OpenVSXExtension[]
  error?: string
}

const API = 'https://open-vsx.org/api'

function toAbsolute(url?: string): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://open-vsx.org${url}`
}

export function iconUrl(ext: OpenVSXExtension): string | undefined {
  return toAbsolute(ext.files?.icon)
}

export function downloadUrl(ext: OpenVSXExtension): string | undefined {
  return toAbsolute(ext.files?.download)
}

export function extDisplayName(ext: OpenVSXExtension): string {
  return ext.displayName || `${ext.namespace}.${ext.name}`
}

export function extPublisher(ext: OpenVSXExtension): string {
  return ext.publisher?.displayName || ext.namespace
}

export function extId(ext: OpenVSXExtension): string {
  return `${ext.namespace}.${ext.name}`
}

export function extFileName(ext: OpenVSXExtension): string {
  return `${ext.namespace}.${ext.name}-${ext.version}.vsix`
}

export function formatDownloads(n?: number): string {
  if (!n || n <= 0) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export async function searchOpenVSX(query: string, size = 30, sortBy: 'relevance' | 'downloadCount' | 'rating' = 'relevance'): Promise<OpenVSXExtension[]> {
  const q = query.trim()
  const params = new URLSearchParams()
  params.set('size', String(size))
  params.set('sortBy', sortBy)
  if (q) params.set('query', q)
  const res = await fetch(`${API}/-/search?${params.toString()}`)
  if (!res.ok) throw new Error(`Open VSX respondió ${res.status}`)
  const json = (await res.json()) as OpenVSXSearchResult
  return json.extensions ?? []
}
