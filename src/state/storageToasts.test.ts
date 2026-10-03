import { describe, expect, it, vi } from 'vitest'
import { createGameStore, type GameDeps } from './gameStore'
import { createSaveStorage } from './storage'
import { createMemoryStorage } from '../test/storageDoubles'

function make() {
  const mem = createMemoryStorage()
  const deps: GameDeps = {
    storage: createSaveStorage(() => mem),
    loadPools: vi.fn(() =>
      Promise.resolve({
        answers: ['crane'],
        slang: [],
        guesses: new Set(['crane']),
      }),
    ),
    rng: () => 0,
    prefersReducedMotion: () => true,
    setTimer: () => 0,
  }
  return createGameStore(deps)
}

describe('storage toasts', () => {
  it('corrupt shows a long info toast', () => {
    const store = make()
    store.getState().applyStorageNotice('corrupt')
    expect(store.getState().toast).toMatchObject({
      text: "We couldn't read your saved games, so we started fresh.",
      kind: 'info',
      lifeMs: 4000,
    })
  })

  it('storage-failed shows one long toast per session', () => {
    const store = make()
    store.getState().applyStorageNotice('storage-failed')
    const first = store.getState().toast
    expect(first).toMatchObject({
      text: "Saving isn't working in this browser. Your progress will be lost when you close this tab.",
      lifeMs: 4000,
    })
    expect(store.getState().storageOk).toBe(false)
    store.getState().dismissToast(first!.id)
    store.getState().applyStorageNotice('storage-failed')
    expect(store.getState().toast).toBeNull()
  })

  it('storage-recovered sets storageOk without a toast', () => {
    const store = make()
    store.getState().applyStorageNotice('storage-failed')
    store.getState().dismissToast(store.getState().toast!.id)
    store.getState().applyStorageNotice('storage-recovered')
    expect(store.getState().storageOk).toBe(true)
    expect(store.getState().toast).toBeNull()
  })
})
