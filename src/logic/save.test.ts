import { describe, expect, it } from 'vitest'
import { BOARD_CONFIG, type WordLength } from './boards'
import {
  BOARD_KEYS,
  SAVE_VERSION,
  boardKey,
  canForfeit,
  emptySave,
  loadSave,
  migrateSave,
  resolveOutcome,
  validateSave,
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
    [wrap(V1_FIXTURE, 2)],
    [wrap(V1_FIXTURE, 0)],
    [wrap(V1_FIXTURE, 1.5)],
    [JSON.stringify({ version: 1 })],
    [wrap(null, 1)],
    [wrap({}, 1)],
    [''],
  ])('rejects %s without throwing', (raw) => {
    expect(loadSave(raw)).toEqual({ ok: false })
  })
  it('loads a valid v1 document', () => {
    expect(loadSave(wrap(V1_FIXTURE, 1))).toEqual({
      ok: true,
      doc: V1_FIXTURE,
    })
  })
})
