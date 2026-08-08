export function create<T extends Record<string, unknown>>(initializer: (set: any, get: () => T, api: any) => T) {
  const api: any = {}
  let state: T
  const set = (partial: Partial<T> | ((s: T) => Partial<T>)): T => {
    const next = typeof partial === 'function' ? (partial as (s: T) => Partial<T>)(state) : partial
    state = { ...state, ...next } as T
    return state
  }
  const get = () => state
  state = initializer(set, get, api)
  api.getState = get
  api.setState = set
  api.subscribe = () => () => {}
  return api
}

export const createStore = create
