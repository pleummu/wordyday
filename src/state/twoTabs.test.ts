import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameStore } from './gameStore'
import type { Pools } from '../data/wordData'
import type { WordLength } from '../logic/boards'
import { SAVE_KEY, SAVE_VERSION, emptyStats } from '../logic/save'
import { saveEnvelope, v2Save } from '../test/storageDoubles'
import { createSaveStorage } from './storage'

const OTHER_TAB = 'Updated from your other tab.'

const pools5: Pools = {
  answers: ['crane', 'slate'],
  slang: ['bruhs'],
  guesses: new Set([
    'crane',
    'slate',
    'house',
    'ghost',
    'plant',
    'brick',
    'bruhs',
  ]),
}
const pools4: Pools = {
  answers: ['kind', 'bold'],
  slang: ['yeet'],
  guesses: new Set(['kind', 'bold', 'yeet']),
}

type Tab = ReturnType<typeof makeTab>

// Browser-like: storage events go only to the OTHER tab, only when the value
// changed, and arrive asynchronously.
function makeTabs() {
  const shared = new Map<string, string>()
  const tabs: Tab[] = []
  let pending = 0

  function view(self: () => Tab): Storage {
    const deliver = (value: string | null) => {
      const other = tabs.find((t) => t !== self())
      if (!other) return
      pending++
      setTimeout(() => {
        pending--
        other.store.getState().applyExternal(value)
      }, 0)
    }
    return {
      get length() {
        return shared.size
      },
      clear() {
        if (shared.size > 0) {
          shared.clear()
          deliver(null)
        }
      },
      getItem: (k) => (shared.has(k) ? (shared.get(k) as string) : null),
      key: (i) => Array.from(shared.keys())[i] ?? null,
      removeItem(k) {
        if (!shared.has(k)) return
        shared.delete(k)
        if (k === SAVE_KEY) deliver(null)
      },
      setItem(k, v) {
        const value = String(v)
        const old = shared.get(k)
        shared.set(k, value)
        if (old !== value && k === SAVE_KEY) deliver(value)
      },
    }
  }

  function add(rngValue: number) {
    const tab = makeTab(rngValue, (s) => view(s))
    tabs.push(tab)
    return tab
  }

  async function settle() {
    const MAX = 60
    for (let i = 0; i < MAX; i++) {
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      const loading = tabs.some((t) => t.store.getState().status === 'loading')
      if (pending === 0 && !loading) return
    }
    throw new Error('settle: tabs never went quiet (write ping-pong?)')
  }

  return { shared, add, settle }
}

function makeTab(rngValue: number, mkView: (self: () => Tab) => Storage) {
  const onGameFinished = vi.fn()
  const holder: { tab?: Tab } = {}
  const storage = createSaveStorage(() => mkView(() => holder.tab as Tab))
  const store = createGameStore({
    storage,
    loadPools: (length: WordLength) =>
      Promise.resolve(length === 4 ? pools4 : pools5),
    rng: () => rngValue,
    prefersReducedMotion: () => false,
    setTimer: (fn) => setTimeout(fn, 0),
    onGameFinished,
  })
  const tab = { store, onGameFinished }
  holder.tab = tab
  return tab
}

async function twoTabs() {
  const ctx = makeTabs()
  const a = ctx.add(0)
  await a.store.getState().resume()
  const b = ctx.add(0.99)
  await b.store.getState().resume()
  await ctx.settle()
  return { ...ctx, a, b }
}

function type(t: Tab, word: string) {
  for (const ch of word) t.store.getState().typeLetter(ch)
}

function stored(shared: Map<string, string>, key = 'normal-5') {
  const doc = JSON.parse(shared.get(SAVE_KEY) as string)
  return doc.state.boards[key]
}

function rawDoc(boards: Record<string, unknown>) {
  return JSON.stringify({
    state: {
      boards,
      last: { mode: 'normal', length: 5 },
      wordubadoInfoSeen: false,
    },
    version: SAVE_VERSION,
  })
}

function expectSameGame(
  shared: Map<string, string>,
  a: Tab,
  b: Tab,
  key = 'normal-5',
) {
  const sa = a.store.getState()
  const sb = b.store.getState()
  expect(sa.answer).toBe(sb.answer)
  expect(sa.gameId).toBe(sb.gameId)
  expect(stored(shared, key).answer).toBe(sa.answer)
  expect(stored(shared, key).id).toBe(sa.gameId)
  expect(sa.toast?.text).not.toBe(OTHER_TAB)
}

async function guess(t: Tab, settle: () => Promise<void>, word: string) {
  type(t, word)
  t.store.getState().submit()
  await settle()
}

afterEach(() => {
  globalThis.__WORDLE_TEST__ = undefined
})

describe('two tabs', () => {
  it('CR-02 Play again converges on one game', async () => {
    const { shared, a, b, settle } = await twoTabs()
    await guess(a, settle, 'crane')
    expect(a.store.getState().status).toBe('won')
    a.store.getState().playAgain()
    await settle()
    expectSameGame(shared, a, b)
    expect(b.store.getState().toast?.text).toBe(OTHER_TAB)
    expect(b.store.getState().rows).toEqual([])
    expect(b.store.getState().status).toBe('playing')
  })

  it('CR-02 New game converges and finishes the forfeit once', async () => {
    const { shared, a, b, settle } = await twoTabs()
    for (const w of ['house', 'ghost', 'plant', 'brick']) {
      await guess(a, settle, w)
    }
    a.store.getState().forfeitNewGame()
    await settle()
    expectSameGame(shared, a, b)
    expect(a.onGameFinished).toHaveBeenCalledTimes(1)
    expect(a.onGameFinished).toHaveBeenCalledWith('normal-5', 'forfeit')
    expect(b.onGameFinished).not.toHaveBeenCalled()
  })

  it('howToPlaySeen merges with OR across tabs', async () => {
    const { a, b, settle } = await twoTabs()
    a.store.getState().openHelp()
    await settle()
    expect(a.store.getState().howToPlaySeen).toBe(true)
    expect(b.store.getState().howToPlaySeen).toBe(true)
  })

  it('CR-02 Reset converges on one fresh game', async () => {
    const { shared, a, b, settle } = await twoTabs()
    await guess(a, settle, 'house')
    expect(b.store.getState().rows).toHaveLength(1)
    a.store.getState().resetAll()
    await settle()
    expectSameGame(shared, a, b)
    for (const t of [a, b]) {
      expect(Object.keys(t.store.getState().boards)).toEqual(['normal-5'])
      expect(t.store.getState().wordubadoInfoSeen).toBe(false)
    }
    expect(Object.keys(JSON.parse(shared.get(SAVE_KEY)!).state.boards)).toEqual(
      ['normal-5'],
    )
  })

  it('CR-02 a Board-less document never starts a game; merged document is written back', async () => {
    const { shared, a, b, settle } = await twoTabs()
    await guess(b, settle, 'house')
    const before = b.store.getState()
    b.store.getState().applyExternal(
      rawDoc({
        'wordubado-4': {
          answer: 'yeet',
          guesses: [],
          outcome: 'playing',
          id: 50,
        },
      }),
    )
    const s = b.store.getState()
    expect(s.answer).toBe(before.answer)
    expect(s.gameId).toBe(before.gameId)
    expect(s.rows.map((r) => r.letters)).toEqual(['house'])
    expect(Object.keys(s.boards).sort()).toEqual(['normal-5', 'wordubado-4'])
    expect(s.toast?.text).not.toBe(OTHER_TAB)
    await settle()
    const boards = JSON.parse(shared.get(SAVE_KEY)!).state.boards
    expect(Object.keys(boards).sort()).toEqual(['normal-5', 'wordubado-4'])
    expect(boards['normal-5'].answer).toBe(before.answer)
    expect(a.store.getState().boards['wordubado-4']?.answer).toBe('yeet')
  })

  it('CR-02 concurrent Play again converges to one game', async () => {
    const { shared, a, b, settle } = await twoTabs()
    await guess(a, settle, 'crane')
    expect(a.store.getState().status).toBe('won')
    expect(b.store.getState().status).toBe('won')
    a.store.getState().playAgain()
    b.store.getState().playAgain()
    await settle()
    expectSameGame(shared, a, b)
  })

  it('WR-04 a deferred older document never rolls a game back or double-finishes', async () => {
    const { a, settle } = await twoTabs()
    const id = a.store.getState().gameId
    const answer = a.store.getState().answer
    type(a, 'house')
    a.store.getState().submit()
    expect(a.store.getState().status).toBe('revealing')
    a.store
      .getState()
      .applyExternal(
        rawDoc({ 'normal-5': { answer, guesses: [], outcome: 'playing', id } }),
      )
    await settle()
    expect(a.store.getState().rows).toHaveLength(1)

    type(a, 'crane')
    a.store.getState().submit()
    a.store.getState().applyExternal(
      rawDoc({
        'normal-5': { answer, guesses: ['house'], outcome: 'playing', id },
      }),
    )
    await settle()
    const s = a.store.getState()
    expect(s.status).toBe('won')
    expect(s.rows).toHaveLength(2)
    expect(a.onGameFinished).toHaveBeenCalledTimes(1)
    expect(a.onGameFinished).toHaveBeenCalledWith('normal-5', 'won')
    a.store.getState().typeLetter('a')
    expect(a.store.getState().current).toBe('')
    expect(a.store.getState().submit()).toBe('blocked')
  })

  it('WR-04 a stale older game never replaces the new one', async () => {
    const { shared, a, settle } = await twoTabs()
    await guess(a, settle, 'crane')
    const oldId = a.store.getState().gameId
    a.store.getState().playAgain()
    await settle()
    const newId = a.store.getState().gameId
    expect(newId).toBeGreaterThan(oldId)
    a.store.getState().applyExternal(
      rawDoc({
        'normal-5': {
          answer: 'crane',
          guesses: ['crane'],
          outcome: 'won',
          id: oldId,
        },
      }),
    )
    await settle()
    const s = a.store.getState()
    expect(s.gameId).toBe(newId)
    expect(s.status).toBe('playing')
    expect(s.toast?.text).not.toBe(OTHER_TAB)
    expect(stored(shared).id).toBe(newId)
  })

  it('Reset floor ignores pre-reset games afterwards', async () => {
    const { b, a, settle } = await twoTabs()
    const preMax = Math.max(
      a.store.getState().gameId,
      b.store.getState().gameId,
    )
    a.store.getState().resetAll()
    await settle()
    b.store.getState().applyExternal(
      rawDoc({
        'wordubado-4': {
          answer: 'yeet',
          guesses: [],
          outcome: 'playing',
          id: preMax,
        },
      }),
    )
    await settle()
    expect(b.store.getState().boards['wordubado-4']).toBeUndefined()
  })
})

describe('D-20 stats and streak slices', () => {
  const statsOf = (shared: Map<string, string>) =>
    JSON.parse(shared.get(SAVE_KEY) as string).state.stats

  function envelopeFor(t: Tab, over: Record<string, unknown>) {
    const s = t.store.getState()
    return saveEnvelope(
      v2Save({
        boards: s.boards,
        stats: s.stats,
        ...over,
      } as never),
    )
  }

  it('D-20 both tabs finish the same game before the sync arrives: counted once', async () => {
    const { shared, a, b, settle } = await twoTabs()
    type(a, 'crane')
    type(b, 'crane')
    a.store.getState().submit()
    b.store.getState().submit()
    await settle()
    for (const t of [a, b]) {
      const st = t.store.getState().stats['normal-5']
      expect(st.played).toBe(1)
      expect(st.wins).toBe(1)
      expect(st.winStreak).toBe(1)
    }
    expect(statsOf(shared)['normal-5'].played).toBe(1)
  })

  it('D-20 a finish in one tab is adopted by the other and survives its write-back', async () => {
    const { shared, a, b, settle } = await twoTabs()
    await guess(a, settle, 'crane')
    expect(b.store.getState().stats['normal-5'].played).toBe(1)
    b.store.getState().switchBoard({ length: 4 })
    await settle()
    await guess(b, settle, b.store.getState().answer)
    for (const t of [a, b]) {
      expect(t.store.getState().stats['normal-5'].played).toBe(1)
      expect(t.store.getState().stats['normal-4'].played).toBe(1)
    }
    expect(statsOf(shared)['normal-5'].played).toBe(1)
    expect(statsOf(shared)['normal-4'].played).toBe(1)
  })

  it('D-20 a tab that already merged the other tab finish does not count it again', async () => {
    const { shared, a, b, settle } = await twoTabs()
    type(a, 'crane')
    type(b, 'crane')
    a.store.getState().submit()
    b.store.getState().submit()
    await settle()
    expect(a.store.getState().submit()).toBe('blocked')
    expect(statsOf(shared)['normal-5'].played).toBe(1)
  })

  it('D-20 streak slice with the higher streakRev wins in both tabs', async () => {
    const { b, settle } = await twoTabs()
    b.store.getState().applyExternal(
      envelopeFor(b, {
        dayStreak: { current: 3, longest: 3, lastActiveDate: '2026-06-03' },
        streakRev: 5,
      }),
    )
    await settle()
    expect(b.store.getState().dayStreak.current).toBe(3)
    b.store.getState().applyExternal(
      envelopeFor(b, {
        dayStreak: { current: 9, longest: 9, lastActiveDate: '2026-06-04' },
        streakRev: 4,
      }),
    )
    await settle()
    expect(b.store.getState().dayStreak.current).toBe(3)
  })

  it('D-20 a pending prompt answered in the other tab is cleared here', async () => {
    const { b, settle } = await twoTabs()
    b.store.getState().applyExternal(
      envelopeFor(b, {
        pendingRestore: { streak: 5, missed: 1, creditDeferred: false },
        streakRev: 2,
      }),
    )
    await settle()
    expect(b.store.getState().pendingRestore).not.toBeNull()
    b.store
      .getState()
      .applyExternal(envelopeFor(b, { pendingRestore: null, streakRev: 3 }))
    await settle()
    expect(b.store.getState().pendingRestore).toBeNull()
    expect(b.store.getState().toast?.text).not.toBe(OTHER_TAB)
  })

  it('D-20 a stale pre-reset document never brings back stats', async () => {
    const { shared, a, settle } = await twoTabs()
    await guess(a, settle, 'crane')
    const stale = shared.get(SAVE_KEY) as string
    a.store.getState().resetAll()
    await settle()
    a.store.getState().applyExternal(stale)
    await settle()
    expect(a.store.getState().stats).toEqual(emptyStats())
    expect(a.store.getState().dayStreak.current).toBe(0)
  })
})

describe('Restore prompt across tabs', () => {
  it('a Restore answered in tab A closes the prompt in tab B silently', async () => {
    const { a, b, settle } = await twoTabs()
    const pending = { streak: 5, missed: 1, creditDeferred: false }
    const slice = {
      dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-01' },
      restores: { month: '', used: 0 },
      pendingRestore: pending,
      streakRev: 1,
    }
    a.store.setState(slice)
    b.store.setState(slice)
    a.store.getState().restore()
    await settle()
    expect(a.store.getState().pendingRestore).toBeNull()
    expect(b.store.getState().pendingRestore).toBeNull()
    expect(b.store.getState().toast?.text).not.toBe(OTHER_TAB)
  })
})
