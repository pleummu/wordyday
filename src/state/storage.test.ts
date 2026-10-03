import { describe, expect, it, vi } from 'vitest'
import { createSaveStorage, type StorageNotice } from './storage'
import {
  createMemoryStorage,
  createThrowingStorage,
} from '../test/storageDoubles'
import { emptySave, SAVE_KEY, SAVE_VERSION } from '../logic/save'

const NAME = SAVE_KEY
const envelope = (state: unknown, version = SAVE_VERSION) =>
  JSON.stringify({ state, version })

function notices(s: ReturnType<typeof createSaveStorage>) {
  const got: StorageNotice[] = []
  s.onNotice((n) => got.push(n))
  return got
}

describe('createSaveStorage getItem', () => {
  it('returns null with no notice on first visit', () => {
    const s = createSaveStorage(() => createMemoryStorage())
    const got = notices(s)
    expect(s.getItem(NAME)).toBeNull()
    expect(got).toEqual([])
  })

  it('returns a valid v1 document', () => {
    const mem = createMemoryStorage({ [NAME]: envelope(emptySave()) })
    const s = createSaveStorage(() => mem)
    expect(s.getItem(NAME)).toEqual({
      state: emptySave(),
      version: SAVE_VERSION,
    })
  })

  it.each([
    ['not json', 'not json'],
    [
      'tampered outcome',
      envelope({
        ...emptySave(),
        boards: {
          'normal-5': { answer: 'crane', guesses: [], outcome: 'won' },
        },
      }),
    ],
    ['version 0', envelope(emptySave(), 0)],
  ])('backs up %s and notices corrupt once', (_n, raw) => {
    const mem = createMemoryStorage({ [NAME]: raw })
    const s = createSaveStorage(() => mem)
    const got = notices(s)
    expect(s.getItem(NAME)).toBeNull()
    expect(mem.getItem(NAME + ':corrupt')).toBe(raw)
    expect(got).toEqual(['corrupt'])
  })

  it('survives a throwing getItem', () => {
    const s = createSaveStorage(() => createThrowingStorage({ get: true }))
    const got = notices(s)
    expect(s.getItem(NAME)).toBeNull()
    expect(got).toEqual(['storage-failed'])
  })

  it('treats a null area (blocked storage) as one storage failure', () => {
    const s = createSaveStorage(() => null)
    const got = notices(s)
    expect(s.getItem(NAME)).toBeNull()
    expect(() =>
      s.setItem(NAME, { state: emptySave(), version: 1 }),
    ).not.toThrow()
    expect(got).toEqual(['storage-failed'])
    expect(s.isOk()).toBe(false)
  })
})

describe('createSaveStorage setItem', () => {
  it('serialises and dedupes identical writes', () => {
    const mem = createMemoryStorage()
    const spy = vi.spyOn(mem, 'setItem')
    const s = createSaveStorage(() => mem)
    const v = { state: emptySave(), version: SAVE_VERSION }
    s.setItem(NAME, v)
    s.setItem(NAME, v)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(mem.getItem(NAME)).toBe(JSON.stringify(v))
  })

  it('never throws on quota, notices failure once, recovers later', () => {
    let full = true
    const mem = createMemoryStorage()
    const area: Storage = {
      ...mem,
      getItem: (k) => mem.getItem(k),
      removeItem: (k) => mem.removeItem(k),
      setItem: (k, v) => {
        if (full) throw new DOMException('full', 'QuotaExceededError')
        mem.setItem(k, v)
      },
    }
    const s = createSaveStorage(() => area)
    const got = notices(s)
    const a = { state: emptySave(), version: 1 }
    const b = { state: { ...emptySave(), wordubadoInfoSeen: true }, version: 1 }
    expect(() => s.setItem(NAME, a)).not.toThrow()
    expect(s.isOk()).toBe(false)
    expect(() => s.setItem(NAME, b)).not.toThrow()
    expect(got).toEqual(['storage-failed'])
    full = false
    s.setItem(NAME, a)
    expect(s.isOk()).toBe(true)
    expect(got).toEqual(['storage-failed', 'storage-recovered'])
  })
})

describe('newer-version saves (CR-01)', () => {
  const v2 = envelope({ future: true }, 2)
  const v1 = { state: emptySave(), version: SAVE_VERSION }

  it('boot getItem keeps the document, no backup, storage-failed only', () => {
    const mem = createMemoryStorage({ [NAME]: v2 })
    const s = createSaveStorage(() => mem)
    const got = notices(s)
    expect(s.getItem(NAME)).toBeNull()
    expect(got).toEqual(['storage-failed'])
    expect(mem.getItem(NAME + ':corrupt')).toBeNull()
    expect(s.isOk()).toBe(false)
    expect(s.isReadOnly()).toBe(true)
  })

  it('blocks setItem and removeItem afterwards', () => {
    const mem = createMemoryStorage({ [NAME]: v2 })
    const s = createSaveStorage(() => mem)
    const got = notices(s)
    s.getItem(NAME)
    s.setItem(NAME, v1)
    s.removeItem(NAME)
    expect(mem.dump()).toEqual({ [NAME]: v2 })
    expect(got).toEqual(['storage-failed'])
  })

  it('read() of newer text flips to read-only', () => {
    const mem = createMemoryStorage({ [NAME]: v2 })
    const s = createSaveStorage(() => mem)
    const got = notices(s)
    expect(s.read(v2)).toBe('newer')
    expect(s.isReadOnly()).toBe(true)
    expect(got).toEqual(['storage-failed'])
    s.setItem(NAME, v1)
    expect(mem.dump()).toEqual({ [NAME]: v2 })
  })
})

describe('createSaveStorage removeItem, notices and read', () => {
  it('removes the backup too and resets the dedupe', () => {
    const mem = createMemoryStorage()
    const s = createSaveStorage(() => mem)
    const v = { state: emptySave(), version: 1 }
    s.setItem(NAME, v)
    mem.setItem(NAME + ':corrupt', 'x')
    s.removeItem(NAME)
    expect(mem.dump()).toEqual({})
    s.setItem(NAME, v)
    expect(mem.getItem(NAME)).toBe(JSON.stringify(v))
  })

  it('delivers queued notices to a late listener', () => {
    const mem = createMemoryStorage({ [NAME]: 'bad' })
    const s = createSaveStorage(() => mem)
    s.getItem(NAME)
    const got = notices(s)
    expect(got).toEqual(['corrupt'])
  })

  it('read is pure: empty, invalid, valid', () => {
    const mem = createMemoryStorage()
    const s = createSaveStorage(() => mem)
    const got = notices(s)
    expect(s.read(null)).toEqual(emptySave())
    expect(s.read('junk')).toBe('invalid')
    expect(s.read(envelope(emptySave()))).toEqual(emptySave())
    expect(mem.dump()).toEqual({})
    expect(got).toEqual([])
  })
})
