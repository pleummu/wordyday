import { describe, expect, it } from 'vitest'
import { BOARD_CONFIG, type WordLength } from './boards'
import {
  BOARD_KEYS,
  SAVE_VERSION,
  boardKey,
  canForfeit,
  emptySave,
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

// Phase 5's v1 -> v2 migration test must feed this fixture through the chain.
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
    it(`length ${len}: only at max - 2 while playing`, () => {
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
  it('false at zero guesses', () => {
    expect(canForfeit('playing', 0, 2)).toBe(false)
  })
})

describe('migrateSave', () => {
  it('v1 is returned unchanged', () => {
    const x = { a: 1 }
    expect(migrateSave(x, 1)).toBe(x)
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
  it('SAVE_VERSION is 1', () => {
    expect(SAVE_VERSION).toBe(1)
  })
})

describe('validateSave', () => {
  it('accepts the v1 fixture unchanged', () => {
    expect(validateSave(V1_FIXTURE)).toEqual(V1_FIXTURE)
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
    expect(out).toEqual(V1_FIXTURE)
    expect(Object.keys(out as object)).toEqual([
      'boards',
      'last',
      'wordubadoInfoSeen',
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
  ])('rejects %s', (_n, board) => {
    expect(validateSave(withBoard('normal-5', board))).toBeNull()
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
  it('one bad board rejects the whole document', () => {
    const d = clone()
    d.boards['normal-4'] = { answer: 'x', guesses: [], outcome: 'playing' }
    expect(validateSave(d)).toBeNull()
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
    [wrap(V1_FIXTURE, 2)],
    [wrap(V1_FIXTURE, 99)],
    [wrap({ future: true }, 2)],
  ])('flags %s as newer, not invalid (CR-01)', (raw) => {
    expect(loadSave(raw)).toEqual({ ok: false, reason: 'newer' })
  })
  it('loads a valid v1 document', () => {
    expect(loadSave(wrap(V1_FIXTURE, 1))).toEqual({
      ok: true,
      doc: V1_FIXTURE,
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
    expect(validateSave(clone())).toEqual(V1_FIXTURE)
    const noId = validateSave(clone())?.boards['normal-5']
    expect(noId && 'id' in noId).toBe(false)
  })

  it.each([-1, 1.5, '3', null, Number.MAX_SAFE_INTEGER + 1, NaN])(
    'rejects bad id %s',
    (id) => {
      const bad = { answer: 'crane', guesses: [], outcome: 'playing', id }
      expect(validateSave(withBoard('normal-5', bad))).toBeNull()
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
