export async function clearNovaData(): Promise<void> {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('nova.')) keys.push(k)
    }
    for (const k of keys) localStorage.removeItem(k)
  } catch {
    // ignore
  }
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase('nova-db')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}
