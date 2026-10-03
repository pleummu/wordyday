import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameStore, revealDurationMs, type GameDeps } from './gameStore'
import type { Pools } from '../data/wordData'
import type { WordLength } from '../logic/boards'
import { score } from '../logic/score'
import { PRAISE } from './copy'
import { createSaveStorage } from './storage'
import {
  createMemoryStorage,
  createThrowingStorage,
} from '../test/storageDoubles'
import { SAVE_KEY, SAVE_VERSION } from '../logic/save'

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

describe('playAgain and switchBoard', () => {
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
    expect(s.dialog).toBeNull()
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
