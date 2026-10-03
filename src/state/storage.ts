import type { PersistStorage } from 'zustand/middleware'
import {
  CORRUPT_SUFFIX,
  SAVE_VERSION,
  emptySave,
  loadSave,
  type SaveDoc,
} from '../logic/save'

export type StorageNotice = 'corrupt' | 'storage-failed' | 'storage-recovered'

export function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export type SaveStorage = PersistStorage<SaveDoc> & {
  isOk(): boolean
  onNotice(fn: (n: StorageNotice) => void): () => void
  markSeen(raw: string | null): void
  read(raw: string | null): SaveDoc | null | 'invalid'
}

export function createSaveStorage(getArea: () => Storage | null): SaveStorage {
  let lastRaw: string | null = null
  let ok = true
  let failedEmitted = false
  const queue: StorageNotice[] = []
  const listeners = new Set<(n: StorageNotice) => void>()

  function area(): Storage | null {
    try {
      return getArea()
    } catch {
      return null
    }
  }

  function emit(n: StorageNotice) {
    if (listeners.size === 0) {
      queue.push(n)
      return
    }
    for (const l of listeners) l(n)
  }

  function fail() {
    ok = false
    if (!failedEmitted) {
      failedEmitted = true
      emit('storage-failed')
    }
  }

  return {
    getItem(name) {
      const a = area()
      if (a === null) {
        // Blocked storage (area unavailable) is a storage failure, not silence (SAVE-07).
        fail()
        return null
      }
      let raw: string | null
      try {
        raw = a.getItem(name)
      } catch {
        fail()
        return null
      }
      if (raw === null) return null
      const res = loadSave(raw)
      if (res.ok) {
        lastRaw = raw
        return { state: res.doc, version: SAVE_VERSION }
      }
      try {
        a.setItem(name + CORRUPT_SUFFIX, raw)
      } catch {
        // backup is best effort
      }
      emit('corrupt')
      return null
    },

    setItem(name, value) {
      const raw = JSON.stringify(value)
      if (raw === lastRaw) return
      const a = area()
      if (a === null) {
        fail()
        return
      }
      try {
        a.setItem(name, raw)
        lastRaw = raw
        if (!ok) {
          ok = true
          emit('storage-recovered')
        }
      } catch {
        fail()
      }
    },

    removeItem(name) {
      lastRaw = null
      const a = area()
      if (a === null) return
      try {
        a.removeItem(name)
        a.removeItem(name + CORRUPT_SUFFIX)
      } catch {
        fail()
      }
    },

    isOk: () => ok,

    onNotice(fn) {
      listeners.add(fn)
      while (queue.length > 0) fn(queue.shift() as StorageNotice)
      return () => {
        listeners.delete(fn)
      }
    },

    markSeen(raw) {
      lastRaw = raw
    },

    read(raw) {
      if (raw === null) return emptySave()
      const res = loadSave(raw)
      return res.ok ? res.doc : 'invalid'
    },
  }
}
