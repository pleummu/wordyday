import { describe, expect, it } from 'vitest'
import { BOARD_CONFIG, type WordLength } from './boards'
import {
  MIGRATIONS,
  type SaveDoc,
  mergeBoardStats,
  mergeStats,
  pickStreak,
  BOARD_KEYS,
  SAVE_VERSION,
  boardKey,
  canForfeit,
  STAT_CAP,
  emptyBoardStats,
  emptySave,
  emptyStats,
  gameIdOf,
  loadSave,
  maxGameId,
  mergeBoard,
  mergeBoards,
  migrateSave,
  pickGame,
  resolveOutcome,
  sameGame,
  validateSave,
  type Outcome,
  type SavedGame,
} from './save'

// The v1 -> v2 migration test (D-18) feeds this fixture through the chain.
const V1_FIXTURE = {
  boards: {
    'normal-5': { answer: 'crane', guesses: ['house'], outcome: 'playing' },
    'wordubado-4': { answer: 'yeet', guesses: ['yeet'], outcome: 'won' },
    'normal-6': {
      answer: 'planet',
      guesses: ['garden', 'silver', 'winter', 'button', 'pocket'],
      outcome: 'gave-up',
    },
  },
  last: { mode: 'wordubado', length: 4 },
  wordubadoInfoSeen: true,
}

const V2_ZERO = {
  stats: emptyStats(),
  dayStreak: { current: 0, longest: 0, lastActiveDate: null },
  restores: { month: '', used: 0 },
  pendingRestore: null,
  streakRev: 0,
  theme: 'system',
  colourBlind: false,
  howToPlaySeen: false,
}
const V1_AS_V2 = { ...V1_FIXTURE, ...V2_ZERO }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clone = () => structuredClone(V1_FIXTURE) as Record<string, any>
const withBoard = (key: string, board: unknown) => {
  const d = clone()
  d.boards = { [key]: board }
  return d
}

describe('boardKey', () => {
  it('joins mode and length', () => {
    expect(boardKey('normal', 5)).toBe('normal-5')
    expect(boardKey('wordubado', 4)).toBe('wordubado-4')
  })
  it('lists the six keys in order', () => {
    expect(BOARD_KEYS).toEqual([
      'normal-4',
      'normal-5',
      'normal-6',
      'wordubado-4',
      'wordubado-5',
      'wordubado-6',
    ])
  })
  it('emptySave is the first-visit document', () => {
    expect(emptySave()).toEqual({
      boards: {},
      last: { mode: 'normal', length: 5 },
      wordubadoInfoSeen: false,
      ...V2_ZERO,
    })
  })
})

describe('resolveOutcome', () => {
  it('playing, won, lost', () => {
    expect(resolveOutcome('crane', ['house'], 6)).toBe('playing')
    expect(resolveOutcome('crane', ['house', 'crane'], 6)).toBe('won')
    expect(resolveOutcome('crane', Array(6).fill('house'), 6)).toBe('lost')
  })
  it('a win on the last try is a win', () => {
    expect(
      resolveOutcome('crane', [...Array(5).fill('house'), 'crane'], 6),
    ).toBe('won')
  })
})

describe('canForfeit', () => {
  for (const len of [4, 5, 6] as WordLength[]) {
    const max = BOARD_CONFIG[len].attempts
    it(`QA-02 R-FORFEIT-6 length ${len}: only at exactly 2 tries left while playing`, () => {
      for (let n = 0; n <= max; n++) {
        expect(canForfeit('playing', n, max)).toBe(n === max - 2)
      }
    })
  }
  it.each(['revealing', 'won', 'lost', 'gave-up', 'loading', 'error'])(
    'false for status %s',
    (status) => {
      expect(canForfeit(status, 4, 6)).toBe(false)
    },
  )
  it('QA-02 R-FORFEIT-6 a fresh Board cannot be abandoned', () => {
    expect(canForfeit('playing', 0, 2)).toBe(false)
  })
})

describe('migrateSave', () => {
  it('the current version is returned unchanged', () => {
    const x = { a: 1 }
    expect(migrateSave(x, SAVE_VERSION)).toBe(x)
  })
  it('D-18 migrateSave v1 to v2 keeps boards, last and wordubadoInfoSeen and zeroes every streak and stat', () => {
    expect(validateSave(migrateSave(clone(), 1))).toEqual(V1_AS_V2)
  })
  it('version 0 throws', () => {
    expect(() => migrateSave({}, 0)).toThrow()
  })
  it('runs injected steps', () => {
    const f = (s: unknown) => ({ wrapped: s })
    expect(migrateSave({ a: 1 }, 1, 2, { 1: f })).toEqual({
      wrapped: { a: 1 },
    })
  })
  it('missing step throws', () => {
    expect(() => migrateSave({}, 1, 3, { 1: (s) => s })).toThrow()
  })
  it('SAVE_VERSION is 4', () => {
    expect(SAVE_VERSION).toBe(4)
  })
  it('migrateSave v2 to v3 adds the appearance defaults and keeps the rest', () => {
    const v2 = { ...V1_AS_V2 } as Record<string, unknown>
    delete v2.theme
    delete v2.colourBlind
    delete v2.howToPlaySeen
    expect(migrateSave(v2, 2)).toEqual(V1_AS_V2)
  })
  it('CR-01 migrateSave v3 to v4 turns the deferred flag into the offer day', () => {
    const dayStreak = { current: 5, longest: 9, lastActiveDate: '2026-10-04' }
    const v3 = (creditDeferred: boolean) => ({
      ...V1_AS_V2,
      dayStreak,
      pendingRestore: { streak: 5, missed: 2, creditDeferred },
    })
    expect(validateSave(migrateSave(v3(true), 3))?.pendingRestore).toEqual({
      streak: 5,
      missed: 2,
      creditDate: '2026-10-07',
    })
    expect(validateSave(migrateSave(v3(false), 3))?.pendingRestore).toEqual({
      streak: 5,
      missed: 2,
      creditDate: null,
    })
    expect(migrateSave(V1_AS_V2, 3)).toEqual(V1_AS_V2)
  })
  it('MIGRATIONS[3] returns a non-object unchanged', () => {
    expect(MIGRATIONS[3]!(null)).toBeNull()
  })
  it('MIGRATIONS[2] returns a non-object unchanged', () => {
    expect(MIGRATIONS[2]!(null)).toBeNull()
    expect(MIGRATIONS[2]!([1])).toEqual([1])
  })
  it('coerces bad theme and flags to defaults', () => {
    for (const theme of ['purple', 42, undefined]) {
      const d = { ...clone(), theme }
      expect((validateSave(d) as SaveDoc).theme).toBe('system')
    }
    expect((validateSave({ ...clone(), theme: 'dark' }) as SaveDoc).theme).toBe(
      'dark',
    )
    const bad = validateSave({
      ...clone(),
      colourBlind: 'yes',
      howToPlaySeen: 1,
    }) as SaveDoc
    expect(bad.colourBlind).toBe(false)
    expect(bad.howToPlaySeen).toBe(false)
    expect(
      (validateSave({ ...clone(), howToPlaySeen: true }) as SaveDoc)
        .howToPlaySeen,
    ).toBe(true)
  })
})

describe('validateSave', () => {
  it('accepts the v1 fixture with zeroed new slices', () => {
    expect(validateSave(V1_FIXTURE)).toEqual(V1_AS_V2)
  })
  it('accepts the empty save', () => {
    expect(validateSave(emptySave())).toEqual(emptySave())
  })
  it('strips unknown keys at every level', () => {
    const d = clone()
    d.extra = 1
    d.boards['normal-5'].extra = 1
    d.last.extra = 1
    const out = validateSave(d)
    expect(out).toEqual(V1_AS_V2)
    expect(Object.keys(out as object)).toEqual([
      'boards',
      'last',
      'wordubadoInfoSeen',
      'stats',
      'dayStreak',
      'restores',
      'pendingRestore',
      'streakRev',
      'theme',
      'colourBlind',
      'howToPlaySeen',
    ])
  })
  it.each([
    ['null', null],
    ['string', 'x'],
    ['array', []],
    ['number', 3],
  ])('rejects non-object: %s', (_n, v) => {
    expect(validateSave(v)).toBeNull()
  })
  it('rejects boards not an object', () => {
    const d = clone()
    d.boards = []
    expect(validateSave(d)).toBeNull()
    d.boards = 'x'
    expect(validateSave(d)).toBeNull()
  })
  it('rejects unknown board keys', () => {
    const ok = { answer: 'crane', guesses: [], outcome: 'playing' }
    expect(validateSave(withBoard('normal-7', ok))).toBeNull()
    const d = clone()
    d.boards = JSON.parse('{"__proto__":{"answer":"crane"}}')
    expect(validateSave(d)).toBeNull()
  })
  const six = Array(6).fill('house')
  it.each([
    ['uppercase answer', { answer: 'CRANE', guesses: [], outcome: 'playing' }],
    ['digit answer', { answer: 'cran3', guesses: [], outcome: 'playing' }],
    ['short answer', { answer: 'cran', guesses: [], outcome: 'playing' }],
    [
      'guesses not array',
      { answer: 'crane', guesses: 'x', outcome: 'playing' },
    ],
    [
      'wrong length guess',
      { answer: 'crane', guesses: ['hous'], outcome: 'playing' },
    ],
    ['non-string guess', { answer: 'crane', guesses: [5], outcome: 'playing' }],
    [
      'too many guesses',
      { answer: 'crane', guesses: Array(7).fill('house'), outcome: 'lost' },
    ],
    [
      'won without answer last',
      { answer: 'crane', guesses: ['house'], outcome: 'won' },
    ],
    ['won with no guesses', { answer: 'crane', guesses: [], outcome: 'won' }],
    [
      'playing containing answer',
      { answer: 'crane', guesses: ['crane'], outcome: 'playing' },
    ],
    [
      'playing with full guesses',
      { answer: 'crane', guesses: six, outcome: 'playing' },
    ],
    [
      'lost with too few guesses',
      { answer: 'crane', guesses: ['house'], outcome: 'lost' },
    ],
    [
      'lost containing answer',
      {
        answer: 'crane',
        guesses: [...Array(5).fill('house'), 'crane'],
        outcome: 'lost',
      },
    ],
    [
      'gave-up with full guesses',
      { answer: 'crane', guesses: six, outcome: 'gave-up' },
    ],
    [
      'gave-up containing answer',
      { answer: 'crane', guesses: ['crane'], outcome: 'gave-up' },
    ],
    ['unknown outcome', { answer: 'crane', guesses: [], outcome: 'forfeit' }],
    ['null board', null],
  ])('skips a Board with %s (WR-03)', (_n, board) => {
    expect(validateSave(withBoard('normal-5', board))?.boards).toEqual({})
  })
  it('rejects a bad last and flag', () => {
    for (const patch of [
      { last: { mode: 'hard', length: 5 } },
      { last: { mode: 'normal', length: 7 } },
      { last: { mode: 'normal', length: '5' } },
      { last: null },
      { wordubadoInfoSeen: 'yes' },
      { wordubadoInfoSeen: undefined },
    ]) {
      expect(validateSave({ ...clone(), ...patch })).toBeNull()
    }
  })
  it('WR-03 one malformed Board is skipped and the rest are kept', () => {
    const d = clone()
    d.boards['normal-4'] = { answer: 'x1', guesses: [], outcome: 'playing' }
    const out = validateSave(d)
    expect(out?.boards['normal-4']).toBeUndefined()
    expect(out?.boards).toEqual(V1_FIXTURE.boards)
  })
})

describe('loadSave', () => {
  const wrap = (state: unknown, version: unknown) =>
    JSON.stringify({ state, version })
  it.each([
    ['not json'],
    ['null'],
    ['[]'],
    ['{"state":{},"version":"1"}'],
    [wrap(V1_FIXTURE, 0)],
    [wrap(V1_FIXTURE, 1.5)],
    [JSON.stringify({ version: 1 })],
    [wrap(null, 1)],
    [wrap({}, 1)],
    [''],
  ])('rejects %s without throwing', (raw) => {
    expect(loadSave(raw)).toEqual({ ok: false, reason: 'invalid' })
  })
  it.each([
    [wrap(V1_FIXTURE, SAVE_VERSION + 1)],
    [wrap(V1_FIXTURE, 99)],
    [wrap({ future: true }, SAVE_VERSION + 1)],
  ])('flags %s as newer, not invalid (CR-01)', (raw) => {
    expect(loadSave(raw)).toEqual({ ok: false, reason: 'newer' })
  })
  it('loads a valid v1 document as v2 with zeroed slices', () => {
    expect(loadSave(wrap(V1_FIXTURE, 1))).toEqual({
      ok: true,
      doc: V1_AS_V2,
    })
  })
})

const g = (
  id: number | undefined,
  answer: string,
  guesses: string[],
  outcome: Outcome,
): SavedGame => {
  const game: SavedGame = { answer, guesses, outcome }
  if (id !== undefined) game.id = id
  return game
}

describe('game ids', () => {
  it('round-trips a valid id and leaves id-less games alone', () => {
    const withId = {
      answer: 'crane',
      guesses: ['house'],
      outcome: 'playing',
      id: 3,
    }
    expect(
      validateSave(withBoard('normal-5', withId))?.boards['normal-5'],
    ).toEqual(withId)
    expect(validateSave(clone())).toEqual(V1_AS_V2)
    const noId = validateSave(clone())?.boards['normal-5']
    expect(noId && 'id' in noId).toBe(false)
  })

  it.each([-1, 1.5, '3', null, Number.MAX_SAFE_INTEGER + 1, NaN])(
    'skips a Board with bad id %s (WR-03)',
    (id) => {
      const bad = { answer: 'crane', guesses: [], outcome: 'playing', id }
      expect(validateSave(withBoard('normal-5', bad))?.boards).toEqual({})
    },
  )

  it('gameIdOf defaults to 0', () => {
    expect(gameIdOf(g(undefined, 'crane', [], 'playing'))).toBe(0)
    expect(gameIdOf(g(4, 'crane', [], 'playing'))).toBe(4)
  })

  it('sameGame compares id, answer, outcome and guesses', () => {
    const a = g(1, 'crane', ['house'], 'playing')
    expect(sameGame(undefined, undefined)).toBe(true)
    expect(sameGame(a, undefined)).toBe(false)
    expect(sameGame(undefined, a)).toBe(false)
    expect(sameGame(a, g(1, 'crane', ['house'], 'playing'))).toBe(true)
    expect(sameGame(a, g(2, 'crane', ['house'], 'playing'))).toBe(false)
    expect(sameGame(a, g(1, 'slate', ['house'], 'playing'))).toBe(false)
    expect(sameGame(a, g(1, 'crane', ['house'], 'gave-up'))).toBe(false)
    expect(sameGame(a, g(1, 'crane', [], 'playing'))).toBe(false)
  })

  it('maxGameId is the highest id, 0 when empty', () => {
    expect(maxGameId({})).toBe(0)
    expect(
      maxGameId({
        'normal-4': g(2, 'yeet', [], 'playing'),
        'normal-5': g(9, 'crane', [], 'playing'),
        'normal-6': g(undefined, 'planet', [], 'playing'),
      }),
    ).toBe(9)
  })
})

const CASES: [string, SavedGame, SavedGame, SavedGame][] = (() => {
  const c1 = g(1, 'crane', [], 'playing')
  const c2 = g(2, 'crane', [], 'playing')
  const s2 = g(2, 'slate', ['house'], 'playing')
  const w1 = g(1, 'crane', ['house', 'crane'], 'won')
  const p1 = g(1, 'crane', ['house'], 'playing')
  const p1b = g(1, 'crane', ['house', 'ghost'], 'playing')
  const gu = g(1, 'crane', ['house'], 'gave-up')
  const c2b = g(2, 'crane', [], 'playing')
  const s2b = g(2, 'slate', [], 'playing')
  const n1 = g(undefined, 'crane', ['house'], 'playing')
  const n2 = g(undefined, 'crane', ['house', 'ghost'], 'playing')
  return [
    ['higher id wins', c1, c2, c2],
    ['new game beats old finished game', s2, w1, s2],
    ['finished beats playing', p1, w1, w1],
    ['more guesses wins', p1b, p1, p1b],
    ['finished never goes back to playing', gu, p1b, gu],
    ['lower answer wins at same id', c2b, s2b, c2b],
    ['no ids: more guesses', n1, n2, n2],
  ]
})()

describe('pickGame', () => {
  it.each(CASES)('%s', (_n, a, b, expected) => {
    expect(pickGame(a, b)).toEqual(expected)
    expect(pickGame(b, a)).toEqual(expected)
  })

  it('is symmetric for every ordered pair and idempotent', () => {
    const all = CASES.flatMap(([, a, b]) => [a, b])
    for (const a of all) {
      expect(pickGame(a, a)).toBe(a)
      for (const b of all) {
        expect(sameGame(pickGame(a, b), pickGame(b, a))).toBe(true)
      }
    }
  })

  it('breaks a full tie by the outcome/guesses string', () => {
    const a = g(1, 'crane', ['house'], 'gave-up')
    const b = g(1, 'crane', ['house'], 'gave-up')
    expect(pickGame(a, b)).toBe(a)
  })
})

describe('mergeBoard', () => {
  const A = g(7, 'crane', [], 'playing')
  const B3 = g(3, 'slate', [], 'playing')
  const B6 = g(6, 'slate', [], 'playing')
  it('keeps mine when theirs is missing (CR-02)', () => {
    expect(mergeBoard(A, undefined)).toBe(A)
  })
  it('ignores theirs at or below the floor', () => {
    expect(mergeBoard(undefined, B3, 5)).toBeUndefined()
    expect(
      mergeBoard(undefined, g(5, 'slate', [], 'playing'), 5),
    ).toBeUndefined()
    expect(mergeBoard(undefined, B6, 5)).toBe(B6)
    expect(mergeBoard(A, B3, 5)).toBe(A)
  })
  it('picks between both', () => {
    expect(mergeBoard(B3, A)).toBe(A)
  })
})

describe('mergeBoards', () => {
  it('merges per Board in BOARD_KEYS order without mutating inputs', () => {
    const mine = {
      'wordubado-4': g(1, 'yeet', [], 'playing'),
      'normal-5': g(1, 'crane', [], 'playing'),
    }
    const theirs = {
      'normal-6': g(1, 'planet', [], 'playing'),
      'normal-5': g(2, 'slate', [], 'playing'),
    }
    const before = structuredClone({ mine, theirs })
    const out = mergeBoards(mine, theirs)
    expect(Object.keys(out)).toEqual(['normal-5', 'normal-6', 'wordubado-4'])
    expect(out['normal-5']?.answer).toBe('slate')
    expect(out['normal-6']?.answer).toBe('planet')
    expect(out['wordubado-4']?.answer).toBe('yeet')
    expect({ mine, theirs }).toEqual(before)
  })
  it('applies the floor and drops empty keys', () => {
    expect(
      mergeBoards({}, { 'normal-4': g(2, 'yeet', [], 'playing') }, 2),
    ).toEqual({})
  })
})

describe('v2 slice validation (T-05-01, T-05-02)', () => {
  const doc = (patch: Record<string, unknown>) => ({ ...clone(), ...patch })
  const statsWith = (key: string, patch: Record<string, unknown>) => {
    const stats = emptyStats() as unknown as Record<string, unknown>
    stats[key] = { ...emptyBoardStats('normal-5'), ...patch }
    return stats
  }

  it('keeps a valid stats entry', () => {
    const good = {
      ...emptyBoardStats('normal-5'),
      played: 3,
      wins: 2,
      dist: [0, 2, 0, 0, 0, 0],
      winStreak: 2,
      bestWinStreak: 2,
      last: { won: true, guesses: 2, seq: 4 },
      lastCounted: { id: 3, answer: 'crane' },
    }
    const out = validateSave(doc({ stats: statsWith('normal-5', good) }))
    expect(out?.stats['normal-5']).toEqual(good)
  })

  it.each([
    ['negative counter', { played: -1 }],
    ['over the cap', { played: STAT_CAP + 1, wins: 0 }],
    ['wins above played', { played: 1, wins: 2 }],
    ['dist of the wrong length', { dist: [0, 0] }],
    ['bad last', { last: { won: true, guesses: 9, seq: 1 } }],
    ['bad lastCounted', { lastCounted: { id: 1, answer: 'cran' } }],
  ])(
    'a malformed stats entry (%s) falls back for that Board only',
    (_n, patch) => {
      const stats = statsWith('normal-5', patch)
      stats['normal-4'] = { ...emptyBoardStats('normal-4'), played: 2, wins: 1 }
      const out = validateSave(doc({ stats }))
      expect(out?.stats['normal-5']).toEqual(emptyBoardStats('normal-5'))
      expect(out?.stats['normal-4'].played).toBe(2)
      expect(out?.boards).toEqual(V1_FIXTURE.boards)
    },
  )

  it.each([
    [
      'dayStreak',
      { dayStreak: { current: 1, longest: 1, lastActiveDate: '2026-13-01' } },
    ],
    ['dayStreak', { dayStreak: 'x' }],
    ['restores', { restores: { month: '2026-13', used: 1 } }],
    [
      'pendingRestore',
      { pendingRestore: { streak: 3, missed: 5, creditDate: null } },
    ],
  ])(
    'a malformed %s falls back to its default and keeps Boards',
    (name, patch) => {
      const out = validateSave(doc(patch)) as unknown as Record<string, unknown>
      expect(out[name]).toEqual((V2_ZERO as Record<string, unknown>)[name])
      expect((out as { boards: unknown }).boards).toEqual(V1_FIXTURE.boards)
    },
  )

  it('accepts a valid dayStreak and pendingRestore', () => {
    const dayStreak = { current: 5, longest: 9, lastActiveDate: '2026-10-04' }
    const pendingRestore = { streak: 5, missed: 2, creditDate: '2026-10-07' }
    const out = validateSave(doc({ dayStreak, pendingRestore }))
    expect(out?.dayStreak).toEqual(dayStreak)
    expect(out?.pendingRestore).toEqual(pendingRestore)
  })

  it('EC-44 restores.used 7 is clamped to 3 on load', () => {
    expect(
      validateSave(doc({ restores: { month: '2026-10', used: 7 } }))?.restores,
    ).toEqual({ month: '2026-10', used: 3 })
    expect(
      validateSave(doc({ restores: { month: '2026-10', used: -1 } }))?.restores
        .used,
    ).toBe(0)
    expect(
      validateSave(doc({ restores: { month: '2026-10', used: 1.5 } }))
        ?.restores,
    ).toEqual({ month: '', used: 0 })
  })

  it('ignores __proto__ and unknown keys in stats', () => {
    const stats = JSON.parse(
      '{"__proto__":{"played":5},"evil-9":{}}',
    ) as Record<string, unknown>
    const out = validateSave(doc({ stats }))
    expect(Object.keys(out?.stats ?? {})).toEqual([...BOARD_KEYS])
    expect(out?.stats).toEqual(emptyStats())
  })
})

describe('D-20 stats merges', () => {
  const a = { ...emptyBoardStats('normal-5'), played: 2, wins: 2 }
  const b = { ...emptyBoardStats('normal-5'), played: 3, wins: 1 }
  const tieA = { ...emptyBoardStats('normal-5'), played: 1, winStreak: 1 }
  const tieB = { ...emptyBoardStats('normal-5'), played: 1, winStreak: 2 }

  it('mergeBoardStats is symmetric and never sums', () => {
    expect(mergeBoardStats(a, b)).toEqual(mergeBoardStats(b, a))
    expect(mergeBoardStats(a, b).played).toBe(3)
    expect(mergeBoardStats(tieA, tieB)).toEqual(mergeBoardStats(tieB, tieA))
  })

  it('mergeBoardStats with equal played prefers the lower winStreak', () => {
    expect(mergeBoardStats(tieA, tieB).winStreak).toBe(1)
    expect(mergeBoardStats(tieB, tieA).winStreak).toBe(1)
  })

  it('mergeStats picks per Board and honours the floor', () => {
    const mine = emptyStats()
    const theirs = emptyStats()
    theirs['normal-5'] = { ...b, lastCounted: { id: 5, answer: 'crane' } }
    expect(mergeStats(mine, theirs)['normal-5'].played).toBe(3)
    expect(mergeStats(mine, theirs, 5)['normal-5'].played).toBe(0)
  })

  it('pickStreak is symmetric, higher streakRev wins, ties are ordered', () => {
    const base = emptySave()
    const x = { ...base, streakRev: 2 }
    const y = {
      ...base,
      streakRev: 3,
      dayStreak: { current: 4, longest: 4, lastActiveDate: '2026-06-01' },
    }
    expect(pickStreak(x, y)).toBe(y)
    expect(pickStreak(y, x)).toBe(y)
    const t1 = { ...base, streakRev: 3 }
    expect(pickStreak(t1, y)).toEqual(pickStreak(y, t1))
  })
})
