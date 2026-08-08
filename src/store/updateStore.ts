import { create } from 'zustand'
import { isDesktop, type UpdateStatusType } from '../lib/electronBridge'

export type UpdateStatus = UpdateStatusType | 'idle'

if (typeof window !== 'undefined') {
  window.addEventListener('deneb:update:check', () => {
    useUpdateStore.getState().check()
  })
}

interface UpdateStore {
  supported: boolean
  portable: boolean
  packaged: boolean
  version: string
  status: UpdateStatus
  newVersion: string | null
  percent: number | null
  error: string | null
  check: () => void
  install: () => void
  init: () => Promise<void>
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  supported: false,
  portable: false,
  packaged: false,
  version: '',
  status: 'idle',
  newVersion: null,
  percent: null,
  error: null,

  check: () => {
    if (!isDesktop() || !window.denebDesktop?.updates) return
    set({ status: 'checking', error: null })
    window.denebDesktop.updates.check()
  },

  install: () => {
    if (!isDesktop() || !window.denebDesktop?.updates) return
    window.denebDesktop.updates.install()
  },

  init: async () => {
    const updates = window.denebDesktop?.updates
    if (!isDesktop() || !updates) {
      set({ supported: false })
      return
    }
    const info = await updates.version()
    set({ supported: info.supported, portable: info.portable, packaged: info.packaged, version: info.version })

    const unsub = updates.onStatus((data) => {
      switch (data.type) {
        case 'checking':
          set({ status: 'checking', error: null })
          break
        case 'available':
          set({ status: 'available', newVersion: data.version ?? null, percent: null, error: null })
          break
        case 'downloading':
          set({ status: 'downloading', percent: data.percent ?? 0, error: null })
          break
        case 'downloaded':
          set({ status: 'downloaded', newVersion: data.version ?? get().newVersion, percent: 100, error: null })
          break
        case 'not-available':
          set({ status: 'not-available', newVersion: data.version ?? null, percent: null, error: null })
          break
        case 'error':
          set({ status: 'error', error: data.message ?? 'Error desconocido' })
          break
      }
    })

    // Comprobación al arrancar (la hace main, aquí solo si es web/portable no aplica)
    if (!info.supported) return
  },
}))
