const DB_NAME = 'deneb-ext-store'
const STORE = 'vsix'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

/** Guarda los bytes crudos del .vsix de una extensión. */
export async function putVsix(id: string, bytes: Uint8Array): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  await req(tx.objectStore(STORE).put({ id, bytes }))
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve()
  })
}

export async function getVsix(id: string): Promise<Uint8Array | null> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const row = await req<{ id: string; bytes: Uint8Array } | undefined>(tx.objectStore(STORE).get(id))
    return row ? row.bytes : null
  } catch {
    return null
  }
}

export async function deleteVsix(id: string): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    await req(tx.objectStore(STORE).delete(id))
  } catch {
    // ignore
  }
}

export async function listVsixIds(): Promise<string[]> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const keys = await req<IDBValidKey[]>(tx.objectStore(STORE).getAllKeys())
    return keys.map((k) => String(k))
  } catch {
    return []
  }
}
