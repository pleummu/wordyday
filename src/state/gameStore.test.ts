import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameStore, revealDurationMs, type GameDeps } from './gameStore'
import type { Pools } from '../data/wordData'
import type { WordLength } from '../logic/boards'
import { score } from '../logic/score'
import { PRAISE } from './copy'

const pools5: Pools = {
  answers: ['crane', 'slate'],
  slang: ['bruhs'],
  guesses: new Set(['crane', 'slate', 'house', 'ghost', 'bruhs']),
}
const pools4: Pools = {
  answers: ['kind', 'bold'],
  slang: ['yeet'],
  guesses: new Set(['kind', 'bold', 'yeet']),
}

function setup(overrides: Partial<GameDeps> = {}, reduced = false) {
  const timers: { fn: () => void; ms: number }[] = []
  const loadPools = vi.fn((length: WordLength) =>
    Promise.resolve(length === 4 ? pools4 : pools5),
  )
  const deps: GameDeps = {
    loadPools,
    rng: () => 0,
    prefersReducedMotion: () => reduced,
    setTimer: (fn, ms) => {
      timers.push({ fn, ms })
      return timers.length
    },
    ...overrides,
  }
  return { store: createGameStore(deps), timers, loadPools }
}

async function started(reduced = false) {
  const ctx = setup({}, reduced)
  await ctx.store.getState().startGame(5)
  return ctx
}

function type(store: ReturnType<typeof setup>['store'], word: string) {
  for (const ch of word) store.getState().typeLetter(ch)
}

afterEach(() => {
  globalThis.__WORDLE_TEST__ = undefined
})

describe('startGame (D-21, D-22)', () => {
  it('loads then plays with a picked answer', async () => {
    const { store } = setup()
    const p = store.getState().startGame(5)
    expect(store.getState().status).toBe('loading')
    await p
    const s = store.getState()
    expect(s.status).toBe('playing')
    expect(s.answer).toBe('crane')
    expect(s.rows).toEqual([])
    expect(s.current).toBe('')
    expect(s.shakeId).toBe(0)
    expect(s.shakeRow).toBe(-1)
  })

  it('uses the test hook answer only when it is in the guess pool', async () => {
    globalThis.__WORDLE_TEST__ = { answers: { 5: 'house' } }
    const a = setup()
    await a.store.getState().startGame(5)
    expect(a.store.getState().answer).toBe('house')
    globalThis.__WORDLE_TEST__ = { answers: { 5: 'zzzzz' } }
    const b = setup()
    await b.store.getState().startGame(5)
    expect(b.store.getState().answer).toBe('crane')
  })
})

describe('typing', () => {
  it('lowercases letters, ignores non-letters, caps at length', async () => {
    const { store } = await started()
    store.getState().typeLetter('A')
    store.getState().typeLetter('1')
    store.getState().typeLetter('Enter')
    expect(store.getState().current).toBe('a')
    type(store, 'bcdefg')
    expect(store.getState().current).toBe('abcde')
  })

  it('ignores typing while loading', () => {
    const { store } = setup()
    void store.getState().startGame(5)
    store.getState().typeLetter('a')
    expect(store.getState().current).toBe('')
  })

  it('backspace removes the last letter and is safe when empty', async () => {
    const { store } = await started()
    store.getState().backspace()
    expect(store.getState().current).toBe('')
    type(store, 'ab')
    store.getState().backspace()
    expect(store.getState().current).toBe('a')
  })
})

describe('submit rejections (R-GUESS-1, R-GUESS-2)', () => {
  it('rejects a short guess', async () => {
    const { store } = await started()
    type(store, 'abc')
    expect(store.getState().submit()).toBe('short')
    const s = store.getState()
    expect(s.rows).toEqual([])
    expect(s.toast?.text).toBe('Not enough letters')
    expect(s.toast?.kind).toBe('error')
    expect(s.shakeId).toBe(1)
    expect(s.shakeRow).toBe(0)
  })

  it('rejects a word not in the pool', async () => {
    const { store } = await started()
    type(store, 'zzzzz')
    expect(store.getState().submit()).toBe('invalid')
    const s = store.getState()
    expect(s.rows).toEqual([])
    expect(s.toast?.text).toBe('Not in word list')
    expect(s.shakeRow).toBe(0)
  })

  it('keeps the shake marker scoped to the rejected row', async () => {
    const { store } = await started()
    type(store, 'zzzzz')
    store.getState().submit()
    for (let i = 0; i < 5; i++) store.getState().backspace()
    type(store, 'house')
    expect(store.getState().submit()).toBe('ok')
    store.getState().finishReveal()
    expect(store.getState().shakeRow).toBe(0)
    expect(store.getState().rows.length).toBe(1)
    type(store, 'zzzzz')
    store.getState().submit()
    expect(store.getState().shakeRow).toBe(1)
  })
})

describe('valid submit and reveal lock (R-GUESS-3, R-GUESS-6)', () => {
  it('scores the row and schedules the reveal finish', async () => {
    const { store, timers } = await started()
    type(store, 'house')
    expect(store.getState().submit()).toBe('ok')
    const s = store.getState()
    expect(s.rows[0]).toEqual({
      letters: 'house',
      states: score('crane', 'house'),
    })
    expect(s.status).toBe('revealing')
    expect(s.keyStates).toEqual({})
    expect(timers).toHaveLength(1)
    expect(timers[0].ms).toBe(1750)
  })

  it('uses the short reveal under reduced motion', async () => {
    const { store, timers } = await started(true)
    type(store, 'house')
    store.getState().submit()
    expect(timers[0].ms).toBe(200)
  })

  it('ignores input while revealing', async () => {
    const { store, loadPools } = await started()
    type(store, 'house')
    store.getState().submit()
    store.getState().typeLetter('a')
    store.getState().backspace()
    store.getState().requestSwitch({ length: 4 })
    expect(store.getState().current).toBe('')
    expect(store.getState().length).toBe(5)
    expect(loadPools).toHaveBeenCalledTimes(1)
    expect(store.getState().submit()).toBe('blocked')
  })

  it('merges keys on finishReveal and is idempotent', async () => {
    const { store } = await started()
    type(store, 'house')
    store.getState().submit()
    store.getState().finishReveal()
    const keys = store.getState().keyStates
    expect(store.getState().status).toBe('playing')
    expect(Object.keys(keys).sort()).toEqual(['e', 'h', 'o', 's', 'u'])
    store.getState().finishReveal()
    expect(store.getState().keyStates).toEqual(keys)
    expect(store.getState().status).toBe('playing')
  })
})

describe('win and loss', () => {
  it('wins with a praise toast', async () => {
    const { store } = await started()
    type(store, 'crane')
    store.getState().submit()
    store.getState().finishReveal()
    const s = store.getState()
    expect(s.status).toBe('won')
    expect(s.toast?.text).toBe(PRAISE[s.rows.length - 1])
    expect(s.toast?.kind).toBe('info')
  })

  it('loses after all attempts', async () => {
    const { store } = await started()
    for (const w of ['house', 'slate', 'ghost', 'house', 'slate', 'ghost']) {
      expect(store.getState().status).toBe('playing')
      type(store, w)
      store.getState().submit()
      store.getState().finishReveal()
    }
    expect(store.getState().status).toBe('lost')
  })
})

describe('revealDurationMs', () => {
  it('follows the timing contract', () => {
    expect(revealDurationMs(4, false)).toBe(1400)
    expect(revealDurationMs(5, false)).toBe(1700)
    expect(revealDurationMs(6, false)).toBe(2000)
    expect(revealDurationMs(4, true)).toBe(150)
    expect(revealDurationMs(6, true)).toBe(150)
  })
})

describe('loading edge cases (R-POOL-4, D-12)', () => {
  it('ignores a late load for an old length (Pitfall 7)', async () => {
    let resolve4!: (p: Pools) => void
    const slow4 = new Promise<Pools>((r) => {
      resolve4 = r
    })
    const { store } = setup({
      loadPools: (length) => (length === 4 ? slow4 : Promise.resolve(pools5)),
    })
    const first = store.getState().startGame(4)
    await store.getState().startGame(5)
    resolve4(pools4)
    await first
    expect(store.getState().length).toBe(5)
    expect(store.getState().status).toBe('playing')
    expect(store.getState().answer).toBe('crane')
  })

  it('reports load failure and retries', async () => {
    let fail = true
    const { store } = setup({
      loadPools: () =>
        fail ? Promise.reject(new Error('net')) : Promise.resolve(pools5),
    })
    await store.getState().startGame(5)
    expect(store.getState().status).toBe('error')
    fail = false
    store.getState().retryLoad()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
  })
})

describe('playAgain and requestSwitch', () => {
  it('playAgain resets the game', async () => {
    const { store } = await started()
    type(store, 'crane')
    store.getState().submit()
    store.getState().finishReveal()
    store.getState().playAgain()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    const s = store.getState()
    expect(s.rows).toEqual([])
    expect(s.current).toBe('')
    expect(s.keyStates).toEqual({})
    expect(s.toast).toBeNull()
    expect(s.shakeRow).toBe(-1)
  })

  it('requestSwitch switches length', async () => {
    const { store } = await started()
    store.getState().requestSwitch({ length: 4 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().length).toBe(4)
    expect(store.getState().answer).toBe('kind')
  })

  it('re-selecting the active length is a no-op', async () => {
    const { store, loadPools } = await started()
    type(store, 'house')
    store.getState().submit()
    store.getState().finishReveal()
    type(store, 'ho')
    store.getState().requestSwitch({ length: 5 })
    expect(loadPools).toHaveBeenCalledTimes(1)
    expect(store.getState().rows).toHaveLength(1)
    expect(store.getState().current).toBe('ho')
    expect(store.getState().answer).toBe('crane')
  })
})

describe('Wordubado mode (WORD-01, WORD-03, WORD-04)', () => {
  it('defaults to normal', () => {
    expect(setup().store.getState().mode).toBe('normal')
  })

  it('startGame(5, wordubado) picks a slang answer for rng 0', async () => {
    const { store } = setup()
    await store.getState().startGame(5, 'wordubado')
    expect(store.getState().mode).toBe('wordubado')
    expect(store.getState().answer).toBe('bruhs')
  })

  it('Normal games never answer with slang', async () => {
    for (const r of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      const { store } = setup({ rng: () => r })
      await store.getState().startGame(5, 'normal')
      expect(pools5.answers).toContain(store.getState().answer)
    }
  })

  it('requestSwitch changes mode keeping length, and length keeping mode', async () => {
    const { store } = await started()
    store.getState().requestSwitch({ mode: 'wordubado' })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().mode).toBe('wordubado')
    expect(store.getState().length).toBe(5)
    store.getState().requestSwitch({ length: 4 })
    await vi.waitFor(() => expect(store.getState().length).toBe(4))
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().mode).toBe('wordubado')
    expect(store.getState().answer).toBe('yeet')
  })

  it('ignores a switch while revealing and a no-change switch', async () => {
    const { store, loadPools } = await started()
    store.getState().requestSwitch({ mode: 'normal' })
    expect(loadPools).toHaveBeenCalledTimes(1)
    type(store, 'house')
    store.getState().submit()
    store.getState().requestSwitch({ mode: 'wordubado' })
    expect(store.getState().mode).toBe('normal')
    expect(loadPools).toHaveBeenCalledTimes(1)
  })

  it('fast switching ends on the last request', async () => {
    const { store } = setup()
    store.getState().requestSwitch({ mode: 'wordubado' })
    store.getState().requestSwitch({ length: 4 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    const s = store.getState()
    expect(s.mode).toBe('wordubado')
    expect(s.length).toBe(4)
    expect(pools4.slang).toContain(s.answer)
  })

  it('a switch right after finishReveal starts a clean game', async () => {
    const { store } = await started()
    type(store, 'house')
    store.getState().submit()
    store.getState().finishReveal()
    store.getState().requestSwitch({ mode: 'wordubado' })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().rows).toEqual([])
  })
})
