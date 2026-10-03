import type { StoreApi } from 'zustand'
import { SAVE_KEY } from '../logic/save'
import type { GameState } from './gameStore'
import { getLocalStorage } from './storage'

let started = false
let stop: (() => void) | null = null

type SyncStore = Pick<StoreApi<GameState>, 'getState'>

// One `storage` listener per page. Events only fire for OTHER tabs, so our
// own writes never arrive here. StrictMode safe: a second call is a no-op.
export function startTabSync(
  store: SyncStore,
  target: Window = window,
  getArea: () => Storage | null = getLocalStorage,
  key: string = SAVE_KEY,
): () => void {
  if (started && stop) return stop
  const onStorage = (e: StorageEvent) => {
    if (e.storageArea !== getArea()) return
    if (e.key !== key && e.key !== null) return
    store.getState().applyExternal(e.key === null ? null : e.newValue)
  }
  target.addEventListener('storage', onStorage)
  started = true
  stop = () => {
    target.removeEventListener('storage', onStorage)
    started = false
    stop = null
  }
  return stop
}
