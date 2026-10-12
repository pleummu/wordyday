import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createGameStore,
  isBusy,
  isInputBlocked,
  type GameDeps,
} from './gameStore'
import type { Pools } from '../data/wordData'
import type { WordLength } from '../logic/boards'
import { score } from '../logic/score'
import { CORRUPT_TOAST, PRAISE, TOAST_LIFE_MS } from './copy'
import { resultDelayMs } from '../logic/timing'
import { createSaveStorage } from './storage'
import {
  createMemoryStorage,
  createThrowingStorage,
} from '../test/storageDoubles'
import { BOARD_KEYS, SAVE_KEY, SAVE_VERSION, emptySave } from '../logic/save'

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
  const mem = createMemoryStorage()
  const deps: GameDeps = {
    storage: createSaveStorage(() => mem),
    loadPools,
    rng: () => 0,
    prefersReducedMotion: () => reduced,
    setTimer: (fn, ms) => {
      timers.push({ fn, ms })
      return timers.length
    },
    ...overrides,
  }
  return { store: createGameStore(deps), timers, loadPools, mem }
}

async function started(reduced = false) {
  const ctx = setup({}, reduced)
  await ctx.store.getState().startGame(5)
  return ctx
}

// The pause before the Result modal has its own tests; other tests that keep
// playing after a finish skip it.
function skipResultPause(store: ReturnType<typeof setup>['store']) {
  store.setState({ resultPending: false })
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
    store.getState().switchBoard({ length: 4 })
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

describe('playAgain and switchBoard', () => {
  it('playAgain resets the game', async () => {
    const { store } = await started()
    type(store, 'crane')
    store.getState().submit()
    store.getState().finishReveal()
    skipResultPause(store)
    store.getState().playAgain()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    const s = store.getState()
    expect(s.rows).toEqual([])
    expect(s.current).toBe('')
    expect(s.keyStates).toEqual({})
    expect(s.toast).toBeNull()
    expect(s.shakeRow).toBe(-1)
  })

  it('switchBoard switches length', async () => {
    const { store } = await started()
    store.getState().switchBoard({ length: 4 })
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
    store.getState().switchBoard({ length: 5 })
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

  it('switchBoard changes mode keeping length, and length keeping mode', async () => {
    const { store } = await started()
    store.getState().switchBoard({ mode: 'wordubado' })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().mode).toBe('wordubado')
    expect(store.getState().length).toBe(5)
    store.getState().switchBoard({ length: 4 })
    await vi.waitFor(() => expect(store.getState().length).toBe(4))
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().mode).toBe('wordubado')
    expect(store.getState().answer).toBe('yeet')
  })

  it('ignores a switch while revealing and a no-change switch', async () => {
    const { store, loadPools } = await started()
    store.getState().switchBoard({ mode: 'normal' })
    expect(loadPools).toHaveBeenCalledTimes(1)
    type(store, 'house')
    store.getState().submit()
    store.getState().switchBoard({ mode: 'wordubado' })
    expect(store.getState().mode).toBe('normal')
    expect(loadPools).toHaveBeenCalledTimes(1)
  })

  it('fast switching ends on the last request', async () => {
    const { store } = setup()
    store.getState().switchBoard({ mode: 'wordubado' })
    store.getState().switchBoard({ length: 4 })
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
    store.getState().switchBoard({ mode: 'wordubado' })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().rows).toEqual([])
  })
})

describe('Wordubado info popup (D-11)', () => {
  it('openInfo and closeInfo toggle infoOpen', async () => {
    const { store } = await started()
    expect(store.getState().infoOpen).toBe(false)
    store.getState().openInfo()
    expect(store.getState().infoOpen).toBe(true)
    store.getState().closeInfo()
    expect(store.getState().infoOpen).toBe(false)
  })

  it('auto-opens on the first switch to Wordubado only', async () => {
    const { store } = await started()
    store.getState().switchBoard({ mode: 'wordubado' })
    expect(store.getState().infoOpen).toBe(true)
    expect(store.getState().wordubadoInfoSeen).toBe(true)
    store.getState().closeInfo()
    store.getState().switchBoard({ mode: 'normal' })
    expect(store.getState().infoOpen).toBe(false)
    store.getState().switchBoard({ mode: 'wordubado' })
    expect(store.getState().infoOpen).toBe(false)
  })

  it('does not auto-open for length changes inside Wordubado', async () => {
    const { store } = await started()
    store.getState().switchBoard({ mode: 'wordubado' })
    store.getState().closeInfo()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    store.getState().switchBoard({ length: 4 })
    expect(store.getState().infoOpen).toBe(false)
  })

  it('never auto-opens when the saved document says it was seen', async () => {
    const mem = createMemoryStorage()
    mem.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: SAVE_VERSION,
        state: {
          boards: {},
          last: { mode: 'normal', length: 5 },
          wordubadoInfoSeen: true,
        },
      }),
    )
    const store = createGameStore({
      storage: createSaveStorage(() => mem),
      loadPools: () => Promise.resolve(pools5),
      rng: () => 0,
      prefersReducedMotion: () => false,
      setTimer: () => 0,
    })
    await store.getState().resume()
    store.getState().switchBoard({ mode: 'wordubado' })
    expect(store.getState().infoOpen).toBe(false)
  })

  it('persists the seen flag', async () => {
    const { store, mem } = await started()
    store.getState().switchBoard({ mode: 'wordubado' })
    const doc = JSON.parse(mem.getItem(SAVE_KEY) ?? '{}')
    expect(doc.state.wordubadoInfoSeen).toBe(true)
  })

  it('blocks input while open', async () => {
    const { store } = await started()
    type(store, 'hous')
    store.getState().openInfo()
    store.getState().typeLetter('e')
    store.getState().backspace()
    expect(store.getState().current).toBe('hous')
    expect(store.getState().submit()).toBe('blocked')
  })
})

describe('boards', () => {
  async function inProgress() {
    const ctx = await started()
    type(ctx.store, 'house')
    ctx.store.getState().submit()
    ctx.store.getState().finishReveal()
    return ctx
  }

  it('keeps each Board game independent across switches', async () => {
    const { store, loadPools } = await inProgress()
    store.getState().switchBoard({ length: 4 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().answer).toBe('kind')
    expect(store.getState().rows).toEqual([])
    expect(store.getState().boards['normal-5']).toEqual({
      answer: 'crane',
      guesses: ['house'],
      outcome: 'playing',
      id: 1,
    })
    store.getState().switchBoard({ length: 5 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    const s = store.getState()
    expect(s.answer).toBe('crane')
    expect(s.rows.map((r) => r.letters)).toEqual(['house'])
    expect(loadPools).toHaveBeenCalledTimes(3)
  })

  it('restores a finished Board as finished without starting a game', async () => {
    const { store } = await started()
    type(store, 'crane')
    store.getState().submit()
    store.getState().finishReveal()
    expect(store.getState().status).toBe('won')
    skipResultPause(store)
    store.getState().switchBoard({ length: 4 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    store.getState().switchBoard({ length: 5 })
    await vi.waitFor(() => expect(store.getState().status).toBe('won'))
    expect(store.getState().answer).toBe('crane')
    expect(store.getState().finishedInSession).toBe(false)
  })

  it('saves both Boards in the document', async () => {
    const { store, mem } = await inProgress()
    store.getState().switchBoard({ length: 4 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    const doc = JSON.parse(mem.getItem(SAVE_KEY) ?? '{}')
    expect(Object.keys(doc.state.boards).sort()).toEqual([
      'normal-4',
      'normal-5',
    ])
    expect(doc.state.boards['normal-5'].guesses).toEqual(['house'])
  })

  it('drops half-typed letters when switching away', async () => {
    const { store } = await inProgress()
    type(store, 'ho')
    store.getState().switchBoard({ length: 4 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    store.getState().switchBoard({ length: 5 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().current).toBe('')
  })
})

describe('switch', () => {
  it('never writes the old live game under the new Board key', async () => {
    const { store, mem } = await started()
    type(store, 'house')
    store.getState().submit()
    store.getState().finishReveal()
    const writes: string[] = []
    const orig = mem.setItem.bind(mem)
    mem.setItem = (k: string, v: string) => {
      if (k === SAVE_KEY) writes.push(v)
      orig(k, v)
    }
    store.getState().switchBoard({ mode: 'wordubado' })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(writes.length).toBeGreaterThan(0)
    for (const w of writes) {
      const g = JSON.parse(w).state.boards['wordubado-5']
      if (g) {
        expect(g.answer).not.toBe('crane')
        expect(g.guesses).not.toContain('house')
      }
    }
    const last = JSON.parse(writes[writes.length - 1]).state.boards
    expect(last['normal-5'].guesses).toEqual(['house'])
  })

  it('is a no-op while revealing and for the same Board', async () => {
    const { store, loadPools } = await started()
    store.getState().switchBoard({ mode: 'normal', length: 5 })
    expect(loadPools).toHaveBeenCalledTimes(1)
    type(store, 'house')
    store.getState().submit()
    store.getState().switchBoard({ mode: 'wordubado' })
    expect(store.getState().mode).toBe('normal')
    expect(loadPools).toHaveBeenCalledTimes(1)
  })

  it('reloads the same Board when status is error', async () => {
    let fail = true
    const { store } = setup({
      loadPools: () =>
        fail ? Promise.reject(new Error('x')) : Promise.resolve(pools5),
    })
    await store.getState().startGame(5)
    expect(store.getState().status).toBe('error')
    fail = false
    store.getState().switchBoard({ length: 5 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
  })

  it('fast switching ends on the last request (token)', async () => {
    const { store } = setup()
    store.getState().switchBoard({ mode: 'wordubado' })
    store.getState().switchBoard({ length: 4 })
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    const s = store.getState()
    expect(s.mode).toBe('wordubado')
    expect(s.length).toBe(4)
    expect(pools4.slang).toContain(s.answer)
  })
})

function saved(
  mem: Storage,
  game: object,
  last = { mode: 'normal', length: 5 },
) {
  mem.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: SAVE_VERSION,
      state: {
        boards: { [`${last.mode}-${last.length}`]: game },
        last,
        wordubadoInfoSeen: false,
      },
    }),
  )
}

function withSaved(game: object) {
  const mem = createMemoryStorage()
  saved(mem, game)
  const timers: { fn: () => void; ms: number }[] = []
  const loadPools = vi.fn<(length: WordLength) => Promise<Pools>>(() =>
    Promise.resolve(pools5),
  )
  const store = createGameStore({
    storage: createSaveStorage(() => mem),
    loadPools,
    rng: () => 0,
    prefersReducedMotion: () => false,
    setTimer: (fn, ms) => timers.push({ fn, ms }),
  })
  return { store, mem, loadPools, timers }
}

describe('persistence', () => {
  it('resumes a playing game', async () => {
    const { store, loadPools } = withSaved({
      answer: 'crane',
      guesses: ['house'],
      outcome: 'playing',
    })
    expect(store.getState().mode).toBe('normal')
    expect(store.getState().length).toBe(5)
    await store.getState().resume()
    const s = store.getState()
    expect(s.answer).toBe('crane')
    expect(s.rows).toEqual([
      { letters: 'house', states: score('crane', 'house') },
    ])
    expect(s.keyStates.h).toBe('absent')
    expect(s.current).toBe('')
    expect(s.status).toBe('playing')
    expect(s.finishedInSession).toBe(false)
    expect(loadPools).toHaveBeenCalledTimes(1)
    expect(loadPools).toHaveBeenCalledWith(5)
  })

  it.each([
    ['won', ['crane']],
    ['lost', ['house', 'house', 'house', 'house', 'house', 'house']],
    ['gave-up', ['house', 'house', 'house']],
  ] as const)('restores %s with no toast', async (outcome, guesses) => {
    const { store } = withSaved({
      answer: 'crane',
      guesses: [...guesses],
      outcome,
    })
    await store.getState().resume()
    expect(store.getState().status).toBe(outcome)
    expect(store.getState().toast).toBeNull()
    expect(store.getState().finishedInSession).toBe(false)
  })

  it('starts a fresh normal-5 game on first visit', async () => {
    const { store, loadPools } = setup()
    await store.getState().resume()
    expect(store.getState().status).toBe('playing')
    expect(store.getState().answer).toBe('crane')
    expect(loadPools).toHaveBeenCalledWith(5)
  })

  it('saves the guess at submit and the outcome before the reveal ends', async () => {
    const { store, mem } = await started()
    type(store, 'house')
    store.getState().submit()
    const doc = JSON.parse(mem.dump()[SAVE_KEY]).state
    expect(doc.boards['normal-5'].guesses).toEqual(['house'])
    for (let i = 0; i < 5; i++) {
      store.setState({ status: 'playing' })
      type(store, 'house')
      store.getState().submit()
    }
    expect(store.getState().status).toBe('revealing')
    const doc2 = JSON.parse(mem.dump()[SAVE_KEY]).state
    expect(doc2.boards['normal-5'].outcome).toBe('lost')
  })

  it('does not write when only typing', async () => {
    const { store, mem } = await started()
    const before = mem.dump()[SAVE_KEY]
    type(store, 'hou')
    expect(mem.dump()[SAVE_KEY]).toBe(before)
  })

  it('ignores a stale reveal timer (token)', async () => {
    const { store, timers } = await started()
    type(store, 'house')
    store.getState().submit()
    store.setState({ loadToken: store.getState().loadToken + 1 })
    timers[0].fn()
    expect(store.getState().status).toBe('revealing')
  })

  it('retryLoad keeps the saved game after a failed load', async () => {
    const { store, loadPools } = withSaved({
      answer: 'crane',
      guesses: ['house'],
      outcome: 'playing',
    })
    loadPools.mockRejectedValueOnce(new Error('net'))
    await store.getState().resume()
    expect(store.getState().status).toBe('error')
    store.getState().retryLoad()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().answer).toBe('crane')
    expect(store.getState().rows).toHaveLength(1)
  })

  it('plays a full game with throwing storage', async () => {
    const store = createGameStore({
      storage: createSaveStorage(() =>
        createThrowingStorage({ get: true, set: true }),
      ),
      loadPools: () => Promise.resolve(pools5),
      rng: () => 0,
      prefersReducedMotion: () => false,
      setTimer: () => 0,
    })
    await store.getState().resume()
    type(store, 'crane')
    expect(() => store.getState().submit()).not.toThrow()
    store.getState().finishReveal()
    expect(store.getState().status).toBe('won')
  })

  it('accepts the answer even when the guess pool lacks it', async () => {
    const store = createGameStore({
      storage: createSaveStorage(() => createMemoryStorage()),
      loadPools: () =>
        Promise.resolve({ ...pools5, guesses: new Set(['house']) }),
      rng: () => 0,
      prefersReducedMotion: () => false,
      setTimer: () => 0,
    })
    await store.getState().startGame(5)
    type(store, 'crane')
    expect(store.getState().submit()).toBe('ok')
  })

  it('tracks finishedInSession', async () => {
    const { store } = await started()
    type(store, 'crane')
    store.getState().submit()
    expect(store.getState().finishedInSession).toBe(false)
    store.getState().finishReveal()
    expect(store.getState().finishedInSession).toBe(true)
    skipResultPause(store)
    await store.getState().playAgain()
    expect(store.getState().finishedInSession).toBe(false)
  })
})

describe('forfeit', () => {
  function withRows(store: ReturnType<typeof setup>['store'], n: number) {
    const rows = Array.from({ length: n }, () => ({
      letters: 'house',
      states: score('crane', 'house'),
    }))
    store.setState({ rows })
  }

  it('openDialog only opens at exactly 2 tries left', async () => {
    for (const n of [0, 3, 5]) {
      const { store } = await started()
      withRows(store, n)
      store.getState().openDialog('giveUp')
      expect(store.getState().dialog).toBeNull()
    }
    const { store } = await started()
    withRows(store, 4)
    store.getState().openDialog('giveUp')
    expect(store.getState().dialog).toBe('giveUp')
    store.getState().openDialog('newGame')
    expect(store.getState().dialog).toBe('giveUp')
    store.getState().closeDialog()
    expect(store.getState().dialog).toBeNull()
  })

  it('openDialog does nothing while the info popup is open', async () => {
    const { store } = await started()
    withRows(store, 4)
    store.getState().openInfo()
    store.getState().openDialog('giveUp')
    expect(store.getState().dialog).toBeNull()
  })

  it('giveUp finishes as gave-up without adding a row, reported once', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    withRows(ctx.store, 4)
    ctx.store.getState().openDialog('giveUp')
    ctx.store.getState().giveUp()
    const s = ctx.store.getState()
    expect(s.status).toBe('gave-up')
    expect(s.rows).toHaveLength(4)
    expect(s.dialog).toBe('result')
    expect(s.finishedInSession).toBe(true)
    expect(onGameFinished).toHaveBeenCalledTimes(1)
    expect(onGameFinished).toHaveBeenCalledWith('normal-5', 'gave-up')
    const doc = JSON.parse(ctx.mem.getItem(SAVE_KEY)!)
    expect(doc.state.boards['normal-5'].outcome).toBe('gave-up')
    ctx.store.getState().giveUp()
    expect(onGameFinished).toHaveBeenCalledTimes(1)
  })

  it('giveUp is rejected at other counts, while revealing and when finished', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    withRows(ctx.store, 3)
    ctx.store.getState().giveUp()
    expect(ctx.store.getState().status).toBe('playing')
    withRows(ctx.store, 4)
    ctx.store.setState({ status: 'revealing' })
    ctx.store.getState().giveUp()
    expect(ctx.store.getState().status).toBe('revealing')
    ctx.store.setState({ status: 'lost' })
    ctx.store.getState().giveUp()
    expect(ctx.store.getState().status).toBe('lost')
    expect(onGameFinished).not.toHaveBeenCalled()
  })

  it('forfeitNewGame reports forfeit once and starts a fresh game', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    withRows(ctx.store, 4)
    ctx.store.getState().forfeitNewGame()
    expect(onGameFinished).toHaveBeenCalledTimes(1)
    expect(onGameFinished).toHaveBeenCalledWith('normal-5', 'forfeit')
    await vi.waitFor(() => expect(ctx.store.getState().status).toBe('playing'))
    expect(ctx.store.getState().rows).toEqual([])
    expect(ctx.store.getState().length).toBe(5)
    expect(ctx.store.getState().mode).toBe('normal')
  })

  it('forfeitNewGame is rejected at other counts', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    withRows(ctx.store, 3)
    ctx.store.getState().forfeitNewGame()
    expect(ctx.store.getState().rows).toHaveLength(3)
    expect(onGameFinished).not.toHaveBeenCalled()
  })

  it('the rule holds at 4 and 6 letters', async () => {
    const pools6: Pools = {
      answers: ['planet'],
      slang: [],
      guesses: new Set(['planet']),
    }
    const onGameFinished = vi.fn()
    const ctx = setup({
      onGameFinished,
      loadPools: (l) =>
        Promise.resolve(l === 4 ? pools4 : l === 6 ? pools6 : pools5),
    })
    for (const [len, ok] of [
      [4, 3],
      [6, 5],
    ] as const) {
      await ctx.store.getState().startGame(len)
      const row = { letters: 'x'.repeat(len), states: [] }
      ctx.store.setState({ rows: Array.from({ length: ok - 1 }, () => row) })
      ctx.store.getState().giveUp()
      expect(ctx.store.getState().status).toBe('playing')
      ctx.store.setState({ rows: Array.from({ length: ok }, () => row) })
      ctx.store.getState().giveUp()
      expect(ctx.store.getState().status).toBe('gave-up')
    }
    expect(onGameFinished).toHaveBeenCalledTimes(2)
  })

  it('blocks input while a dialog is open', async () => {
    const { store } = await started()
    withRows(store, 4)
    store.getState().openDialog('giveUp')
    store.getState().typeLetter('a')
    expect(store.getState().current).toBe('')
    store.setState({ current: 'ab' })
    store.getState().backspace()
    expect(store.getState().current).toBe('ab')
    expect(store.getState().submit()).toBe('blocked')
  })

  it('a winning submit reports won once and finishReveal does not repeat it', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    type(ctx.store, 'crane')
    ctx.store.getState().submit()
    ctx.store.getState().finishReveal()
    expect(onGameFinished).toHaveBeenCalledTimes(1)
    expect(onGameFinished).toHaveBeenCalledWith('normal-5', 'won')
  })
})

describe('reset', () => {
  it('returns to a first visit and clears every trace', async () => {
    const { store, mem } = setup()
    mem.setItem(SAVE_KEY + ':corrupt', 'junk')
    await store.getState().startGame(4, 'wordubado')
    store.setState({
      wordubadoInfoSeen: true,
      boards: {
        'normal-5': { answer: 'crane', guesses: [], outcome: 'playing' },
      },
    })
    store.getState().resetAll()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    const s = store.getState()
    expect(s.dialog).toBeNull()
    expect(s.infoOpen).toBe(false)
    expect(s.mode).toBe('normal')
    expect(s.length).toBe(5)
    expect(s.boards).toEqual({})
    expect(s.wordubadoInfoSeen).toBe(false)
    expect(s.toast?.text).toBe('All data reset')
    expect(s.toast?.kind).toBe('info')
    expect(mem.getItem(SAVE_KEY + ':corrupt')).toBeNull()
    const doc = JSON.parse(mem.getItem(SAVE_KEY)!)
    expect(doc.state.last).toEqual({ mode: 'normal', length: 5 })
    expect(doc.state.wordubadoInfoSeen).toBe(false)
    expect(Object.keys(doc.state.boards)).toEqual(['normal-5'])
  })

  it('never writes the old answer under normal-5', async () => {
    const { store, mem } = setup()
    await store.getState().startGame(4, 'wordubado')
    const writes: string[] = []
    const orig = mem.setItem.bind(mem)
    mem.setItem = (k: string, v: string) => {
      writes.push(v)
      orig(k, v)
    }
    const old = store.getState().answer
    store.getState().resetAll()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    for (const w of writes) {
      const g = JSON.parse(w).state.boards['normal-5']
      if (g) expect(g.answer).not.toBe(old)
    }
  })

  it('an old reveal timer does nothing after reset', async () => {
    const { store, timers } = await started()
    type(store, 'house')
    store.getState().submit()
    store.getState().resetAll()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    timers[0].fn()
    expect(store.getState().status).toBe('playing')
    expect(store.getState().rows).toHaveLength(0)
  })
})

describe('settings', () => {
  it('opens while revealing and when finished', async () => {
    const { store } = await started()
    type(store, 'house')
    store.getState().submit()
    expect(store.getState().status).toBe('revealing')
    store.getState().openSettings()
    expect(store.getState().dialog).toBe('settings')
    store.getState().closeDialog()
    store.setState({ status: 'won' })
    store.getState().openSettings()
    expect(store.getState().dialog).toBe('settings')
  })

  it('does nothing if another dialog or the info popup is open', async () => {
    const { store } = await started()
    store.setState({ dialog: 'giveUp' })
    store.getState().openSettings()
    expect(store.getState().dialog).toBe('giveUp')
    store.setState({ dialog: null, infoOpen: true })
    store.getState().openSettings()
    expect(store.getState().dialog).toBeNull()
  })

  it('openReset and cancelReset move between dialogs', async () => {
    const { store } = await started()
    store.getState().openReset()
    expect(store.getState().dialog).toBeNull()
    store.getState().openSettings()
    expect(store.getState().settingsFocus).toBe('close')
    store.getState().openReset()
    expect(store.getState().dialog).toBe('reset')
    store.getState().cancelReset()
    expect(store.getState().dialog).toBe('settings')
    expect(store.getState().settingsFocus).toBe('reset')
    store.getState().closeDialog()
    store.getState().openSettings()
    expect(store.getState().settingsFocus).toBe('close')
  })

  it('storageOk follows storage notices', async () => {
    const { store } = await started()
    expect(store.getState().storageOk).toBe(true)
    store.getState().applyStorageNotice('storage-failed')
    expect(store.getState().storageOk).toBe(false)
    store.getState().applyStorageNotice('corrupt')
    expect(store.getState().storageOk).toBe(false)
    store.getState().applyStorageNotice('storage-recovered')
    expect(store.getState().storageOk).toBe(true)
  })
})

describe('sync', () => {
  const rawDoc = (
    boards: Record<string, unknown>,
    last = { mode: 'normal', length: 5 },
    seen = false,
  ) =>
    JSON.stringify({
      state: { boards, last, wordubadoInfoSeen: seen },
      version: SAVE_VERSION,
    })
  const crane = (guesses: string[], outcome = 'playing', id?: number) => ({
    answer: 'crane',
    guesses,
    outcome,
    ...(id === undefined ? {} : { id }),
  })

  async function ready(extra: Partial<GameDeps> = {}) {
    const ctx = setup(extra)
    await ctx.store.getState().startGame(5)
    return ctx
  }

  it('replaces the visible Board and shows the other-tab toast', async () => {
    const { store } = await ready()
    type(store, 'hou')
    const id = store.getState().gameId
    store
      .getState()
      .applyExternal(rawDoc({ 'normal-5': crane(['house'], 'playing', id) }))
    const s = store.getState()
    expect(s.rows.map((r) => r.letters)).toEqual(['house'])
    expect(s.current).toBe('')
    expect(s.status).toBe('playing')
    expect(s.toast?.text).toBe('Updated from your other tab.')
  })

  it('updates other Boards silently', async () => {
    const { store } = await ready()
    const before = store.getState().answer
    store.getState().applyExternal(
      rawDoc({
        'normal-5': { answer: before, guesses: [], outcome: 'playing', id: 1 },
        'wordubado-4': { answer: 'yeet', guesses: [], outcome: 'playing' },
      }),
    )
    const s = store.getState()
    expect(s.boards['wordubado-4']?.answer).toBe('yeet')
    expect(s.toast).toBeNull()
    expect(s.answer).toBe(before)
  })

  it('takes a finished outcome without finishing the game again', async () => {
    const onGameFinished = vi.fn()
    const { store } = await ready({ onGameFinished })
    const id = store.getState().gameId
    store
      .getState()
      .applyExternal(rawDoc({ 'normal-5': crane(['crane'], 'won', id) }))
    const s = store.getState()
    expect(s.status).toBe('won')
    expect(s.finishedInSession).toBe(false)
    expect(onGameFinished).not.toHaveBeenCalled()
  })

  it('a reset in the other tab makes this tab a first visit', async () => {
    const { store } = await ready()
    await store.getState().startGame(6, 'wordubado')
    store.setState({ wordubadoInfoSeen: true })
    store.getState().applyExternal(null)
    expect(store.getState().wordubadoInfoSeen).toBe(false)
    expect(store.getState().boards).toEqual({})
    expect(store.getState().mode).toBe('wordubado')
    expect(store.getState().length).toBe(6)
    expect(store.getState().toast?.text).toBe('Updated from your other tab.')
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
  })

  it('a different game with a higher id replaces the visible Board', async () => {
    const { store } = await ready()
    const id = store.getState().gameId
    store.getState().applyExternal(
      rawDoc({
        'normal-5': {
          answer: 'slate',
          guesses: ['house'],
          outcome: 'playing',
          id: id + 5,
        },
      }),
    )
    const s = store.getState()
    expect(s.answer).toBe('slate')
    expect(s.gameId).toBe(id + 5)
    expect(s.rows.map((r) => r.letters)).toEqual(['house'])
    expect(s.toast?.text).toBe('Updated from your other tab.')
  })

  it('ignores invalid text without a backup or toast', async () => {
    const { store, mem } = await ready()
    const before = store.getState()
    store.getState().applyExternal('{not json')
    expect(store.getState().boards).toBe(before.boards)
    expect(store.getState().toast).toBeNull()
    expect(mem.getItem(SAVE_KEY + ':corrupt')).toBeNull()
  })

  it('waits for a reveal to end before applying', async () => {
    const { store, timers } = await ready()
    type(store, 'house')
    store.getState().submit()
    const id = store.getState().gameId
    store
      .getState()
      .applyExternal(
        rawDoc({ 'normal-5': crane(['ghost', 'house'], 'playing', id) }),
      )
    expect(store.getState().status).toBe('revealing')
    expect(store.getState().rows).toHaveLength(1)
    timers[0].fn()
    expect(store.getState().rows).toHaveLength(2)
    expect(store.getState().pendingExternal).toBeUndefined()
  })

  it('never follows the other tab last-Board pointer', async () => {
    const { store } = await ready()
    store.getState().applyExternal(
      rawDoc(
        {
          'wordubado-4': { answer: 'yeet', guesses: [], outcome: 'playing' },
        },
        { mode: 'wordubado', length: 4 },
      ),
    )
    expect(store.getState().mode).toBe('normal')
    expect(store.getState().length).toBe(5)
  })

  it('does not write the same text back', async () => {
    const { store, mem } = await ready()
    const raw = rawDoc({ 'normal-5': crane(['house']) })
    const spy = vi.spyOn(mem, 'setItem')
    store.getState().applyExternal(raw)
    expect(spy.mock.calls.some(([, v]) => v === raw)).toBe(false)
  })
})

describe('newer-version saves (CR-01)', () => {
  const v2Text = JSON.stringify({
    state: { future: true },
    version: SAVE_VERSION + 1,
  })

  it('boot keeps the newer document and still plays in memory', async () => {
    const mem = createMemoryStorage({ [SAVE_KEY]: v2Text })
    const store = createGameStore({
      storage: createSaveStorage(() => mem),
      loadPools: vi.fn((length: WordLength) =>
        Promise.resolve(length === 4 ? pools4 : pools5),
      ),
      rng: () => 0,
      prefersReducedMotion: () => false,
      setTimer: () => 1,
    })
    await store.getState().resume()
    expect(store.getState().status).toBe('playing')
    type(store, 'house')
    store.getState().submit()
    expect(store.getState().rows.map((r) => r.letters)).toEqual(['house'])
    expect(mem.getItem(SAVE_KEY)).toBe(v2Text)
    expect(mem.getItem(SAVE_KEY + ':corrupt')).toBeNull()
    expect(store.getState().toast?.text).not.toBe(CORRUPT_TOAST)
  })

  it('ignores a newer document from another tab and never overwrites it', async () => {
    const { store, mem } = await started()
    const before = store.getState()
    mem.setItem(SAVE_KEY, v2Text)
    store.getState().applyExternal(v2Text)
    const s = store.getState()
    expect(s.answer).toBe(before.answer)
    expect(s.rows).toEqual(before.rows)
    expect(s.toast?.text).not.toBe('Updated from your other tab.')
    type(store, 'house')
    store.getState().submit()
    store.getState().finishReveal()
    await store.getState().playAgain()
    expect(mem.getItem(SAVE_KEY)).toBe(v2Text)
  })
})

type TestStore = ReturnType<typeof setup>['store']

function recordWrites(mem: Storage) {
  const writes: string[] = []
  const orig = mem.setItem.bind(mem)
  mem.setItem = (k: string, v: string) => {
    if (k === SAVE_KEY) writes.push(v)
    orig(k, v)
  }
  return writes
}

function normal5(raw: string) {
  return JSON.parse(raw).state.boards['normal-5']
}

async function win(store: TestStore) {
  type(store, 'crane')
  store.getState().submit()
  store.getState().finishReveal()
  skipResultPause(store)
}

describe('game ids', () => {
  it('new games get rising ids that are saved', async () => {
    const { store, mem } = await started()
    expect(store.getState().gameId).toBe(1)
    expect(normal5(mem.getItem(SAVE_KEY)!).id).toBe(1)
    store.getState().playAgain()
    await vi.waitFor(() => expect(store.getState().gameId).toBe(2))
    expect(store.getState().status).toBe('playing')
  })

  it('restores the saved id and continues above it', async () => {
    const { store } = withSaved({
      answer: 'crane',
      guesses: [],
      outcome: 'playing',
      id: 7,
    })
    await store.getState().resume()
    expect(store.getState().gameId).toBe(7)
    store.getState().playAgain()
    await vi.waitFor(() => expect(store.getState().gameId).toBe(8))
  })

  it('a saved game without an id restores gameId 0', async () => {
    const { store } = withSaved({
      answer: 'crane',
      guesses: [],
      outcome: 'playing',
    })
    await store.getState().resume()
    expect(store.getState().gameId).toBe(0)
  })
})

describe('no stale or board-less writes (WR-01)', () => {
  it('Play again never writes a board-less or stale playing document', async () => {
    const { store, mem } = await started()
    await win(store)
    const writes = recordWrites(mem)
    store.getState().playAgain()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(writes.length).toBeGreaterThan(0)
    for (const w of writes) {
      const g = normal5(w)
      expect(g).toBeDefined()
      expect(g.outcome === 'playing' && g.id === 1).toBe(false)
    }
    expect(normal5(writes[writes.length - 1])).toEqual({
      answer: 'crane',
      guesses: [],
      outcome: 'playing',
      id: 2,
    })
  })

  it('New game stores the forfeit as finished before the next game', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    ctx.store.setState({
      rows: Array.from({ length: 4 }, () => ({
        letters: 'house',
        states: score('crane', 'house'),
      })),
    })
    const writes = recordWrites(ctx.mem)
    ctx.store.getState().forfeitNewGame()
    await vi.waitFor(() => expect(ctx.store.getState().status).toBe('playing'))
    for (const w of writes) expect(normal5(w)).toBeDefined()
    const first = normal5(writes[0])
    expect(first.outcome).toBe('gave-up')
    expect(first.guesses).toHaveLength(4)
    expect(first.id).toBe(1)
    const last = normal5(writes[writes.length - 1])
    expect(last.id).toBe(2)
    expect(last.guesses).toHaveLength(0)
    expect(onGameFinished).toHaveBeenCalledTimes(1)
    expect(onGameFinished).toHaveBeenCalledWith('normal-5', 'forfeit')
  })

  it('a load error after Play again keeps the finished game stored', async () => {
    const loadPools = vi
      .fn<(length: WordLength) => Promise<Pools>>()
      .mockResolvedValueOnce(pools5)
      .mockRejectedValue(new Error('offline'))
    const { store, mem } = setup({ loadPools })
    await store.getState().startGame(5)
    await win(store)
    store.getState().playAgain()
    await vi.waitFor(() => expect(store.getState().status).toBe('error'))
    const g = normal5(mem.getItem(SAVE_KEY)!)
    expect(g.outcome).toBe('won')
    expect(g.id).toBe(1)
  })
})

describe('reset drops deferred documents (WR-03)', () => {
  const raw = JSON.stringify({
    version: SAVE_VERSION,
    state: {
      boards: {
        'wordubado-4': {
          answer: 'yeet',
          guesses: [],
          outcome: 'playing',
          id: 0,
        },
      },
      last: { mode: 'normal', length: 5 },
      wordubadoInfoSeen: false,
    },
  })

  it('resetAll clears the pending document so it is never applied', async () => {
    const { store, timers, mem } = await started()
    type(store, 'house')
    store.getState().submit()
    expect(store.getState().status).toBe('revealing')
    store.getState().applyExternal(raw)
    expect(store.getState().pendingExternal).toBe(raw)
    store.getState().resetAll()
    expect(store.getState().pendingExternal).toBeUndefined()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    type(store, 'crane')
    store.getState().submit()
    timers[timers.length - 1].fn()
    expect(store.getState().boards['wordubado-4']).toBeUndefined()
    expect(
      JSON.parse(mem.getItem(SAVE_KEY)!).state.boards['wordubado-4'],
    ).toBeUndefined()
  })

  it('playAgain and switchBoard also clear it', async () => {
    const { store } = await started()
    store.setState({ pendingExternal: raw })
    store.getState().playAgain()
    expect(store.getState().pendingExternal).toBeUndefined()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    store.setState({ pendingExternal: raw })
    store.getState().switchBoard({ length: 4 })
    expect(store.getState().pendingExternal).toBeUndefined()
  })
})

describe('v2 persisted slices', () => {
  it('a fresh store persists the empty Phase 5 slices for the six Boards', async () => {
    const { store, mem } = await started()
    const doc = JSON.parse(mem.getItem(SAVE_KEY)!)
    expect(Object.keys(doc.state.stats).sort()).toEqual([...BOARD_KEYS].sort())
    const e = emptySave()
    expect(doc.state.dayStreak).toEqual(e.dayStreak)
    expect(doc.state.restores).toEqual({ month: '', used: 0 })
    expect(doc.state.pendingRestore).toBeNull()
    expect(doc.state.streakRev).toBe(0)
    expect(store.getState().stats).toEqual(e.stats)
  })

  it('resetAll and applyExternal(null) restore the empty slices', async () => {
    const { store } = await started()
    const dirty = { ...emptySave().dayStreak, current: 4 }
    store.setState({ dayStreak: dirty, streakRev: 3 })
    store.getState().resetAll()
    expect(store.getState().dayStreak.current).toBe(0)
    expect(store.getState().streakRev).toBe(4)
    store.setState({ dayStreak: dirty, streakRev: 3 })
    store.getState().applyExternal(null)
    expect(store.getState().dayStreak.current).toBe(0)
    expect(store.getState().streakRev).toBe(4)
    expect(store.getState().stats).toEqual(emptySave().stats)
  })
})

describe('persist.migrate (IN-01)', () => {
  it('IN-01 persist migrate throws instead of passing unvalidated data', () => {
    const { store } = setup()
    const migrate = store.persist.getOptions().migrate
    expect(migrate).toBeDefined()
    expect(() => migrate?.({}, 1)).toThrow(/loadSave/)
  })
})

describe('stats recording (D-07, D-12, D-21)', () => {
  function withRows(store: ReturnType<typeof setup>['store'], n: number) {
    const rows = Array.from({ length: n }, () => ({
      letters: 'house',
      states: score('crane', 'house'),
    }))
    store.setState({ rows })
  }

  it('a win records stats and still calls the seam once, already while revealing', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(4)
    type(ctx.store, 'kind')
    ctx.store.getState().submit()
    const s = ctx.store.getState()
    expect(s.status).toBe('revealing')
    expect(s.stats['normal-4']).toMatchObject({
      played: 1,
      wins: 1,
      winStreak: 1,
    })
    expect(s.finishNote).toEqual({ won: true, winStreak: 1, prev: 0 })
    expect(onGameFinished).toHaveBeenCalledTimes(1)
    expect(onGameFinished).toHaveBeenCalledWith('normal-4', 'won')
  })

  it('a following loss resets the streak and reports the previous one', async () => {
    const { store } = setup()
    await store.getState().startGame(4)
    type(store, 'kind')
    store.getState().submit()
    store.getState().finishReveal()
    skipResultPause(store)
    await store.getState().playAgain()
    await vi.waitFor(() => expect(store.getState().status).toBe('playing'))
    expect(store.getState().finishNote).toBeNull()
    for (let i = 0; i < 5; i++) {
      type(store, 'yeet')
      store.getState().submit()
      store.getState().finishReveal()
    }
    expect(store.getState().status).toBe('lost')
    expect(store.getState().finishNote).toEqual({
      won: false,
      winStreak: 0,
      prev: 1,
    })
    expect(store.getState().stats['normal-4']).toMatchObject({
      played: 2,
      winStreak: 0,
      bestWinStreak: 1,
    })
  })

  it('QA-02 R-FORFEIT-4 Give Up counts as a played loss and resets the Win Streak', async () => {
    const { store } = await started()
    store.setState({
      stats: {
        ...store.getState().stats,
        'normal-5': {
          ...store.getState().stats['normal-5'],
          played: 1,
          wins: 1,
          winStreak: 1,
          bestWinStreak: 1,
        },
      },
    })
    withRows(store, 4)
    store.getState().giveUp()
    expect(store.getState().stats['normal-5']).toMatchObject({
      played: 2,
      gaveUp: 1,
      winStreak: 0,
    })
  })

  it('QA-02 R-FORFEIT-4 a Forfeit counts as a played loss and adds to gaveUp (D-07)', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    withRows(ctx.store, 4)
    ctx.store.getState().forfeitNewGame()
    expect(ctx.store.getState().stats['normal-5']).toMatchObject({
      played: 1,
      gaveUp: 1,
    })
    expect(onGameFinished).toHaveBeenCalledWith('normal-5', 'forfeit')
  })

  it('loadBoard and startGame clear finishNote', async () => {
    const { store } = await started()
    withRows(store, 4)
    store.getState().giveUp()
    expect(store.getState().finishNote).not.toBeNull()
    await store.getState().startGame(5)
    expect(store.getState().finishNote).toBeNull()
    store.setState({ finishNote: { won: true, winStreak: 1, prev: 0 } })
    await store.getState().resume()
    expect(store.getState().finishNote).toBeNull()
  })

  it('does not count the same game twice', async () => {
    const onGameFinished = vi.fn()
    const ctx = setup({ onGameFinished })
    await ctx.store.getState().startGame(5)
    withRows(ctx.store, 4)
    ctx.store.getState().giveUp()
    ctx.store.setState({ status: 'playing' })
    ctx.store.getState().giveUp()
    expect(ctx.store.getState().stats['normal-5'].played).toBe(1)
    expect(onGameFinished).toHaveBeenCalledTimes(1)
  })
})

describe('statistics dialog', () => {
  it('openStats opens and closeDialog closes', async () => {
    const { store } = await started()
    store.getState().openStats()
    expect(store.getState().dialog).toBe('stats')
    store.getState().closeDialog()
    expect(store.getState().dialog).toBeNull()
  })

  it('openStats is ignored while status is revealing (D-21)', async () => {
    const { store } = await started()
    type(store, 'house')
    store.getState().submit()
    expect(store.getState().status).toBe('revealing')
    store.getState().openStats()
    expect(store.getState().dialog).toBeNull()
  })

  it('openStats is ignored while another dialog or the info popup is open', async () => {
    const { store } = await started()
    store.setState({ dialog: 'settings' })
    store.getState().openStats()
    expect(store.getState().dialog).toBe('settings')
    store.setState({ dialog: null, infoOpen: true })
    store.getState().openStats()
    expect(store.getState().dialog).toBeNull()
  })
})

describe('Day Streak (STRK-02, D-11, D-21)', () => {
  function withClock(initial: string) {
    const clock = { at: new Date(initial) }
    const ctx = setup({ now: () => clock.at })
    return { ...ctx, clock }
  }
  const DAY = '2026-06-03T09:00:00'

  async function win(ctx: ReturnType<typeof withClock>) {
    await ctx.store.getState().startGame(5)
    type(ctx.store, 'crane')
    ctx.store.getState().submit()
  }

  it('a win credits at submit and the toast follows the praise', async () => {
    const ctx = withClock(DAY)
    const rev0 = ctx.store.getState().streakRev
    await win(ctx)
    const s = ctx.store.getState()
    expect(s.dayStreak).toEqual({
      current: 1,
      longest: 1,
      lastActiveDate: '2026-06-03',
    })
    expect(s.streakRev).toBe(rev0 + 1)
    expect(s.toast).toBeNull()
    const before = ctx.timers.length
    s.finishReveal()
    expect(ctx.store.getState().toast?.text).toBe(PRAISE[0])
    const queued = ctx.timers.slice(before)
    expect(queued).toHaveLength(2)
    expect(queued[0].ms).toBe(TOAST_LIFE_MS)
    expect(queued[1].ms).toBe(resultDelayMs('won', 5, false))
    queued[0].fn()
    expect(ctx.store.getState().toast?.text).toBe('Day streak: 1')
  })

  it('EC-33 a loss credits and toasts at once', async () => {
    const ctx = withClock(DAY)
    await ctx.store.getState().startGame(5)
    for (const w of ['house', 'ghost', 'house', 'ghost', 'house', 'ghost']) {
      type(ctx.store, w)
      ctx.store.getState().submit()
      ctx.store.getState().finishReveal()
    }
    expect(ctx.store.getState().status).toBe('lost')
    expect(ctx.store.getState().dayStreak.current).toBe(1)
    expect(ctx.store.getState().toast?.text).toBe('Day streak: 1')
  })

  it('EC-34 Give Up credits', async () => {
    const ctx = withClock(DAY)
    await ctx.store.getState().startGame(5)
    for (const w of ['house', 'ghost', 'house', 'ghost']) {
      type(ctx.store, w)
      ctx.store.getState().submit()
      ctx.store.getState().finishReveal()
    }
    ctx.store.getState().giveUp()
    expect(ctx.store.getState().dayStreak.current).toBe(1)
    expect(ctx.store.getState().toast?.text).toBe('Day streak: 1')
  })

  it('EC-35 a Forfeit credits', async () => {
    const ctx = withClock(DAY)
    await ctx.store.getState().startGame(5)
    for (const w of ['house', 'ghost', 'house', 'ghost']) {
      type(ctx.store, w)
      ctx.store.getState().submit()
      ctx.store.getState().finishReveal()
    }
    ctx.store.getState().forfeitNewGame()
    expect(ctx.store.getState().dayStreak.current).toBe(1)
    expect(ctx.store.getState().toast?.text).toBe('Day streak: 1')
  })

  it('a second finish on the same day adds nothing and queues no toast', async () => {
    const ctx = withClock(DAY)
    await win(ctx)
    ctx.store.getState().finishReveal()
    const rev = ctx.store.getState().streakRev
    const timers = ctx.timers.length
    await win(ctx)
    ctx.store.getState().finishReveal()
    expect(ctx.store.getState().dayStreak.current).toBe(1)
    expect(ctx.store.getState().streakRev).toBe(rev)
    expect(ctx.timers.length).toBe(timers + 2)
    expect(ctx.store.getState().toast?.text).toBe(PRAISE[0])
  })

  it('EC-30 a clock moved backwards changes nothing', async () => {
    const ctx = withClock(DAY)
    await win(ctx)
    ctx.store.getState().finishReveal()
    ctx.clock.at = new Date('2026-06-01T09:00:00')
    await win(ctx)
    expect(ctx.store.getState().dayStreak).toEqual({
      current: 1,
      longest: 1,
      lastActiveDate: '2026-06-03',
    })
  })

  it('resetAll zeroes the streak and refills Restores (R-RESTORE-11)', async () => {
    const ctx = withClock(DAY)
    await win(ctx)
    ctx.store.getState().resetAll()
    const s = ctx.store.getState()
    expect(s.dayStreak).toEqual({
      current: 0,
      longest: 0,
      lastActiveDate: null,
    })
    expect(s.restores).toEqual({ month: '2026-06', used: 0 })
  })

  it('applyExternal never sets a Day Streak toast', async () => {
    const ctx = withClock(DAY)
    await ctx.store.getState().startGame(5)
    ctx.store.getState().applyExternal(null)
    expect(ctx.store.getState().toast?.text).not.toMatch(/Day streak/)
    expect(ctx.store.getState().dayToastDue).toBeNull()
  })
})

describe('Restore prompt (STRK-04..07)', () => {
  const pend = { streak: 5, missed: 1, creditDeferred: false }

  function seeded(today = '2026-06-03T09:00:00') {
    const clock = { at: new Date(today) }
    const ctx = setup({ now: () => clock.at })
    const stats = emptySave().stats
    for (const k of BOARD_KEYS) {
      stats[k] = { ...stats[k], played: 3, winStreak: 2, bestWinStreak: 4 }
    }
    ctx.store.setState({
      stats,
      dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-01' },
      restores: { month: '2026-06', used: 0 },
    })
    return { ...ctx, clock }
  }

  it('checkStreaks sets the prompt, zeroes every Win Streak and closes dialogs', () => {
    const { store } = seeded()
    store.setState({ dialog: 'settings', infoOpen: true })
    const rev = store.getState().streakRev
    store.getState().checkStreaks()
    const s = store.getState()
    expect(s.pendingRestore).toEqual(pend)
    expect(s.streakRev).toBe(rev + 1)
    expect(s.dialog).toBeNull()
    expect(s.infoOpen).toBe(false)
    for (const k of BOARD_KEYS) {
      expect(s.stats[k].winStreak).toBe(0)
      expect(s.stats[k].bestWinStreak).toBe(4)
    }
  })

  it('checkStreaks twice gives an identical state', () => {
    const { store } = seeded()
    store.getState().checkStreaks()
    const first = store.getState()
    store.getState().checkStreaks()
    const second = store.getState()
    expect(second.streakRev).toBe(first.streakRev)
    expect(second.stats).toBe(first.stats)
    expect(second.pendingRestore).toBe(first.pendingRestore)
  })

  it('blocks input and every dialog while pending', async () => {
    const { store } = seeded()
    await store.getState().startGame(5)
    store.getState().checkStreaks()
    expect(isInputBlocked(store.getState())).toBe(true)
    type(store, 'cra')
    expect(store.getState().current).toBe('')
    expect(store.getState().submit()).toBe('blocked')
    store.getState().openSettings()
    store.getState().openStats()
    store.getState().openDialog('giveUp')
    store.getState().openInfo()
    const s = store.getState()
    expect(s.dialog).toBeNull()
    expect(s.infoOpen).toBe(false)
  })

  it('restore() keeps the streak, toasts and never revives Win Streaks', () => {
    const { store } = seeded()
    store.getState().checkStreaks()
    const rev = store.getState().streakRev
    store.getState().restore()
    const s = store.getState()
    expect(s.toast?.text).toBe('Streak restored. 2 left this month.')
    expect(s.pendingRestore).toBeNull()
    expect(s.dayStreak.current).toBe(5)
    expect(s.streakRev).toBe(rev + 1)
    for (const k of BOARD_KEYS) expect(s.stats[k].winStreak).toBe(0)
  })

  it('declineRestore() resets silently', () => {
    const { store } = seeded()
    store.getState().checkStreaks()
    const rev = store.getState().streakRev
    store.getState().declineRestore()
    const s = store.getState()
    expect(s.toast).toBeNull()
    expect(s.pendingRestore).toBeNull()
    expect(s.dayStreak.current).toBe(0)
    expect(s.dayStreak.longest).toBe(5)
    expect(s.dialog).toBeNull()
    expect(s.streakRev).toBe(rev + 1)
  })
})

describe('finish-time CHECK and break notice (STRK-04, D-16, D-21)', () => {
  const GAP = '2026-06-04T09:00:00'
  type Streak = {
    current: number
    longest: number
    lastActiveDate: string | null
  }
  const FIVE: Streak = {
    current: 5,
    longest: 5,
    lastActiveDate: '2026-06-01',
  }

  function seeded(
    today: string,
    dayStreak: Streak = FIVE,
    extra: Record<string, unknown> = {},
  ) {
    const clock = { at: new Date(today) }
    const ctx = setup({ now: () => clock.at })
    const stats = emptySave().stats
    for (const k of BOARD_KEYS) {
      stats[k] = { ...stats[k], played: 3, winStreak: 2, bestWinStreak: 4 }
    }
    ctx.store.setState({
      stats,
      dayStreak,
      restores: { month: '2026-06', used: 0 },
      ...extra,
    })
    return { ...ctx, clock }
  }

  it('EC-40 a break found at finish records the result and defers the credit', async () => {
    const { store } = seeded(GAP)
    await store.getState().startGame(5)
    type(store, 'crane')
    store.getState().submit()
    const s = store.getState()
    expect(s.stats['normal-5'].winStreak).toBe(1)
    expect(s.stats['normal-5'].played).toBe(4)
    expect(s.stats['normal-4'].winStreak).toBe(0)
    expect(s.pendingRestore).toEqual({
      streak: 5,
      missed: 2,
      creditDeferred: true,
    })
    expect(s.dayStreak.current).toBe(5)
    expect(s.dayToastDue).toBeNull()
    s.finishReveal()
    store.getState().restore()
    expect(store.getState().dayStreak.current).toBe(6)
  })

  it('D-21 EC-40 the prompt state is set at submit but status stays revealing', async () => {
    const { store } = seeded(GAP)
    await store.getState().startGame(5)
    type(store, 'crane')
    store.getState().submit()
    expect(store.getState().status).toBe('revealing')
    expect(store.getState().pendingRestore).not.toBeNull()
    const pending = store.getState().pendingRestore
    store.getState().finishReveal()
    expect(store.getState().status).not.toBe('revealing')
    expect(store.getState().pendingRestore).toBe(pending)
  })

  it('EC-05 EC-07 EC-12 an involuntary loss sets breakNotice once', () => {
    const a = seeded('2026-06-07T09:00:00')
    a.store.getState().checkStreaks()
    expect(a.store.getState().breakNotice).toBe(true)
    a.store.getState().dismissBreak()
    a.store.getState().checkStreaks()
    expect(a.store.getState().breakNotice).toBe(false)

    const b = seeded('2026-06-03T09:00:00')
    b.store.setState({ restores: { month: '2026-06', used: 3 } })
    b.store.getState().checkStreaks()
    expect(b.store.getState().breakNotice).toBe(true)

    const c = seeded('2026-06-08T09:00:00', FIVE, {
      pendingRestore: { streak: 5, missed: 1, creditDeferred: false },
    })
    c.store.getState().checkStreaks()
    expect(c.store.getState().breakNotice).toBe(true)
  })

  it('EC-03 a prompt, declining, S=0 and a first visit never set breakNotice', () => {
    const a = seeded('2026-06-03T09:00:00')
    a.store.getState().checkStreaks()
    expect(a.store.getState().breakNotice).toBe(false)
    a.store.getState().declineRestore()
    expect(a.store.getState().breakNotice).toBe(false)
    const b = seeded('2026-06-07T09:00:00', {
      current: 0,
      longest: 5,
      lastActiveDate: '2026-06-01',
    })
    b.store.getState().checkStreaks()
    expect(b.store.getState().breakNotice).toBe(false)
    const c = seeded('2026-06-07T09:00:00', {
      current: 0,
      longest: 0,
      lastActiveDate: null,
    })
    c.store.getState().checkStreaks()
    expect(c.store.getState().breakNotice).toBe(false)
  })

  it('resetAll and applyExternal(null) clear breakNotice, and it is never stored', async () => {
    const a = seeded('2026-06-07T09:00:00')
    await a.store.getState().startGame(5)
    a.store.getState().checkStreaks()
    expect(a.store.getState().breakNotice).toBe(true)
    expect(a.mem.getItem(SAVE_KEY) ?? '').not.toContain('breakNotice')
    a.store.getState().resetAll()
    expect(a.store.getState().breakNotice).toBe(false)
    a.store.setState({ breakNotice: true })
    a.store.getState().applyExternal(null)
    expect(a.store.getState().breakNotice).toBe(false)
  })

  it('a finish that breaks an unrestorable streak sets breakNotice and credits 1', async () => {
    const { store } = seeded('2026-06-09T09:00:00')
    await store.getState().startGame(5)
    type(store, 'crane')
    store.getState().submit()
    const s = store.getState()
    expect(s.breakNotice).toBe(true)
    expect(s.dayStreak.current).toBe(1)
    expect(s.pendingRestore).toBeNull()
  })

  it('checkStreaks refreshes today and bumps streakRev only when the slice changed', () => {
    const { store, clock } = seeded('2026-06-03T09:00:00', {
      current: 5,
      longest: 5,
      lastActiveDate: '2026-06-03',
    })
    const rev = store.getState().streakRev
    clock.at = new Date('2026-06-04T00:05:00')
    store.getState().checkStreaks()
    expect(store.getState().today).toBe('2026-06-04')
    expect(store.getState().streakRev).toBe(rev)
  })
})

describe('Result modal scheduling (phase 6)', () => {
  const PEND = {
    streak: 3,
    brokenDate: '2026-06-02',
    // cast: only the non-null shape matters for these tests
  } as unknown as NonNullable<
    ReturnType<ReturnType<typeof setup>['store']['getState']>['pendingRestore']
  >

  async function finishing(reduced = false) {
    const ctx = await started(reduced)
    type(ctx.store, 'crane')
    ctx.store.getState().submit()
    return ctx
  }

  function lastTimer(ctx: { timers: { fn: () => void; ms: number }[] }) {
    return ctx.timers[ctx.timers.length - 1]
  }

  it('D-20 win schedules the result', async () => {
    const ctx = await finishing()
    ctx.store.getState().finishReveal()
    expect(ctx.store.getState().resultPending).toBe(true)
    expect(ctx.store.getState().dialog).toBeNull()
    expect(lastTimer(ctx).ms).toBe(resultDelayMs('won', 5, false))
    lastTimer(ctx).fn()
    const s = ctx.store.getState()
    expect(s.dialog).toBe('result')
    expect(s.resultPending).toBe(false)
    expect(s.resultFlourish).toBe(true)
  })

  it('D-20 loss schedules the result at 600 ms without flourish', async () => {
    const ctx = await started()
    for (const w of ['house', 'ghost', 'house', 'ghost', 'house', 'ghost']) {
      type(ctx.store, w)
      ctx.store.getState().submit()
      ctx.store.getState().finishReveal()
    }
    expect(ctx.store.getState().status).toBe('lost')
    expect(lastTimer(ctx).ms).toBe(600)
    lastTimer(ctx).fn()
    expect(ctx.store.getState().dialog).toBe('result')
    expect(ctx.store.getState().resultFlourish).toBe(false)
  })

  it('D-23 reduced motion uses 300 ms and no flourish', async () => {
    const ctx = await finishing(true)
    ctx.store.getState().finishReveal()
    expect(lastTimer(ctx).ms).toBe(300)
    lastTimer(ctx).fn()
    expect(ctx.store.getState().dialog).toBe('result')
    expect(ctx.store.getState().resultFlourish).toBe(false)
  })

  it('D-21 input is blocked during the pause', async () => {
    const ctx = await finishing()
    ctx.store.getState().finishReveal()
    const { store } = ctx
    expect(isInputBlocked(store.getState())).toBe(true)
    expect(isBusy(store.getState())).toBe(true)
    store.getState().openStats()
    store.getState().openSettings()
    store.getState().openInfo()
    store.getState().switchBoard({ length: 4 })
    store.getState().playAgain()
    const s = store.getState()
    expect(s.dialog).toBeNull()
    expect(s.infoOpen).toBe(false)
    expect(s.length).toBe(5)
    expect(s.status).toBe('won')
  })

  it('D-03 skips when a Restore prompt is pending at the reveal end', async () => {
    const ctx = await finishing()
    const before = ctx.timers.length
    ctx.store.setState({ pendingRestore: PEND })
    ctx.store.getState().finishReveal()
    expect(ctx.store.getState().resultPending).toBe(false)
    for (const t of ctx.timers.slice(before)) {
      expect(t.ms).not.toBe(resultDelayMs('won', 5, false))
    }
  })

  it('D-03 skips when a prompt or break notice arrives before the timer fires', async () => {
    const a = await finishing()
    a.store.getState().finishReveal()
    a.store.setState({ pendingRestore: PEND })
    lastTimer(a).fn()
    expect(a.store.getState().resultPending).toBe(false)
    expect(a.store.getState().dialog).toBeNull()

    const b = await finishing()
    b.store.getState().finishReveal()
    b.store.setState({ breakNotice: true })
    lastTimer(b).fn()
    expect(b.store.getState().resultPending).toBe(false)
    expect(b.store.getState().dialog).toBeNull()
  })

  it('D-02 a stale timer does nothing after the Board changed', async () => {
    const ctx = await finishing()
    ctx.store.getState().finishReveal()
    const timer = lastTimer(ctx)
    await ctx.store.getState().startGame(5)
    expect(ctx.store.getState().resultPending).toBe(false)
    timer.fn()
    expect(ctx.store.getState().dialog).toBeNull()
  })

  it('Give Up opens the result in the same update; a Restore prompt suppresses it', async () => {
    const a = await started()
    a.store.setState({
      rows: Array.from({ length: 4 }, () => ({
        letters: 'house',
        states: score('crane', 'house'),
      })),
    })
    a.store.getState().giveUp()
    expect(a.store.getState().status).toBe('gave-up')
    expect(a.store.getState().dialog).toBe('result')
    expect(a.store.getState().resultFlourish).toBe(false)
  })

  it('Forfeit never opens the result', async () => {
    const ctx = await started()
    ctx.store.setState({
      rows: Array.from({ length: 4 }, () => ({
        letters: 'house',
        states: score('crane', 'house'),
      })),
    })
    ctx.store.getState().forfeitNewGame()
    expect(ctx.store.getState().dialog).toBeNull()
  })

  it('openResult only works on a finished, unblocked Board', async () => {
    const ctx = await started()
    ctx.store.getState().openResult()
    expect(ctx.store.getState().dialog).toBeNull()
    type(ctx.store, 'crane')
    ctx.store.getState().submit()
    ctx.store.getState().finishReveal()
    ctx.store.getState().openResult()
    expect(ctx.store.getState().dialog).toBeNull()
    lastTimer(ctx).fn()
    ctx.store.getState().closeDialog()
    ctx.store.getState().openResult()
    expect(ctx.store.getState().dialog).toBe('result')
    expect(ctx.store.getState().resultFlourish).toBe(false)
  })

  it('never persists resultPending or resultFlourish', async () => {
    const ctx = await finishing()
    ctx.store.getState().finishReveal()
    const raw = ctx.mem.getItem(SAVE_KEY)!
    expect(raw).not.toContain('resultPending')
    expect(raw).not.toContain('resultFlourish')
  })
})
