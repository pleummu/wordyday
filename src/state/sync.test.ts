// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SAVE_KEY } from '../logic/save'
import { startTabSync } from './sync'

const applyExternal = vi.fn()
const store = { getState: () => ({ applyExternal }) } as never

let stop: (() => void) | null = null
afterEach(() => {
  stop?.()
  stop = null
  applyExternal.mockClear()
})

function fire(init: StorageEventInit) {
  window.dispatchEvent(new StorageEvent('storage', init))
}

describe('startTabSync', () => {
  it('forwards events for the save key from localStorage', () => {
    stop = startTabSync(store)
    fire({ key: SAVE_KEY, newValue: '{"a":1}', storageArea: localStorage })
    expect(applyExternal).toHaveBeenCalledWith('{"a":1}')
  })

  it('ignores other keys and other storage areas', () => {
    stop = startTabSync(store)
    fire({ key: 'other', newValue: 'x', storageArea: localStorage })
    fire({ key: SAVE_KEY, newValue: 'x', storageArea: sessionStorage })
    expect(applyExternal).not.toHaveBeenCalled()
  })

  it('treats a null key (clear) as a reset', () => {
    stop = startTabSync(store)
    fire({ key: null, newValue: null, storageArea: localStorage })
    expect(applyExternal).toHaveBeenCalledWith(null)
  })

  it('registers one listener when called twice', () => {
    stop = startTabSync(store)
    startTabSync(store)
    fire({ key: SAVE_KEY, newValue: 'y', storageArea: localStorage })
    expect(applyExternal).toHaveBeenCalledTimes(1)
  })

  it('the returned function removes the listener', () => {
    const off = startTabSync(store)
    off()
    fire({ key: SAVE_KEY, newValue: 'z', storageArea: localStorage })
    expect(applyExternal).not.toHaveBeenCalled()
  })
})
