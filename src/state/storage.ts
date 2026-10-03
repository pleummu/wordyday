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
  read(raw: string | null): SaveDoc | null | 'invalid' | 'newer'
  isReadOnly(): boolean
}

export function createSaveStorage(getArea: () => Storage | null): SaveStorage {
  let lastRaw: string | null = null
  let ok = true
  let failedEmitted = false
  let readOnly = false
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

  // A newer build's document: keep it untouched for the rest of the session (CR-01).
  function goReadOnly() {
    readOnly = true
    fail()
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
      if (res.reason === 'newer') {
        goReadOnly()
        return null
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
      if (readOnly) return
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
      if (readOnly) return
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
    isReadOnly: () => readOnly,

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
      if (res.ok) return res.doc
      if (res.reason === 'newer') {
        goReadOnly()
        return 'newer'
      }
      return 'invalid'
    },
  }
}
