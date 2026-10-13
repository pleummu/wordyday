import { describe, it, expect } from 'vitest'
import {
  parseList,
  isInflection,
  buildPools,
  assertInvariants,
  serialisePools,
  parseCutList,
  findBlocklistHits,
  removeCut,
  markReviewed,
  renderSlangReview,
  reviewedDefs,
  reviewedSlang,
} from './lib.mjs'

const ALL = new Set([
  'boat',
  'boats',
  'stop',
  'stopped',
  'bake',
  'baked',
  'city',
  'cities',
  'box',
  'boxes',
  'glass',
  'bless',
  'thing',
  'bring',
  'king',
  'ring',
  'need',
  'nee',
  'seed',
  'see',
  'feed',
  'fee',
  'the',
  're',
  'th',
  'br',
])

describe('R-POOL-7 / D-02 stem rules', () => {
  it.each(['boats', 'stopped', 'baked', 'cities', 'boxes'])('drops %s', (w) => {
    expect(isInflection(w, ALL)).toBe(true)
  })
  it.each([
    'glass',
    'bless',
    'thing',
    'bring',
    'king',
    'ring',
    'need',
    'seed',
    'feed',
  ])('keeps %s', (w) => {
    expect(isInflection(w, ALL)).toBe(false)
  })
})

describe('parseList', () => {
  it('strips comments and blanks, lowercases', () => {
    expect(parseList('# comment\n\nKill  \nfoo # trailing\n')).toEqual([
      'kill',
      'foo',
    ])
  })
})

describe('buildPools', () => {
  const base = () => ({
    length: 4,
    common: new Set([
      'good',
      'blok',
      'excl',
      'prof',
      'slng',
      'cars',
      'hmmm',
      'fine',
    ]),
    all: new Set([
      'good',
      'blok',
      'excl',
      'prof',
      'slng',
      'cars',
      'car',
      'hmmm',
      'fine',
      'rare',
    ]),
    slang: ['slng', 'yeet'],
    extra: ['xtra', 'toolong'],
    blocklist: new Set(['blok']),
    exclude: new Set(['excl']),
    isProfane: (w) => w === 'prof',
  })
  it('filters answers and keeps dropped words as guesses', () => {
    const { answers, guesses } = buildPools(base())
    expect(answers).toEqual(['fine', 'good'])
    for (const w of [
      'blok',
      'excl',
      'prof',
      'slng',
      'cars',
      'hmmm',
      'yeet',
      'xtra',
      'rare',
    ]) {
      expect(answers).not.toContain(w)
      expect(guesses).toContain(w)
    }
    expect(guesses).not.toContain('toolong')
    for (const a of answers) expect(guesses).not.toContain(a)
    expect([...answers]).toEqual([...answers].sort())
    expect([...guesses]).toEqual([...guesses].sort())
  })
})

describe('assertInvariants', () => {
  const ok = () => ({
    length: 4,
    answers: ['fine', 'good'],
    guesses: ['rare', 'slng'],
    slang: ['slng'],
    slangAnswers: ['slng'],
    isProfane: () => false,
    blocklist: new Set(['blok']),
    exclude: new Set(['excl']),
    minAnswers: 2,
  })
  it('passes on a valid fixture', () => {
    expect(() => assertInvariants(ok())).not.toThrow()
  })
  it('throws on violations', () => {
    expect(() =>
      assertInvariants({ ...ok(), answers: ['fine', 'fine'] }),
    ).toThrow()
    expect(() =>
      assertInvariants({ ...ok(), guesses: ['rare', 'fine'] }),
    ).toThrow()
    expect(() =>
      assertInvariants({ ...ok(), answers: ['fine', 'Good'] }),
    ).toThrow()
    expect(() =>
      assertInvariants({ ...ok(), answers: ['fine', 'goods'] }),
    ).toThrow()
    expect(() =>
      assertInvariants({ ...ok(), answers: ['fine', 'blok'] }),
    ).toThrow()
    expect(() =>
      assertInvariants({ ...ok(), answers: ['fine', 'excl'] }),
    ).toThrow()
    expect(() =>
      assertInvariants({
        ...ok(),
        answers: ['fine', 'slng'],
        guesses: ['rare'],
      }),
    ).toThrow()
    expect(() =>
      assertInvariants({ ...ok(), slang: ['slng', 'gone'] }),
    ).toThrow()
    expect(() => assertInvariants({ ...ok(), minAnswers: 3 })).toThrow()
  })
  it('throws on bad slang answers', () => {
    const bad = (slangAnswers, extra = {}) =>
      expect(() =>
        assertInvariants({ ...ok(), slangAnswers, ...extra }),
      ).toThrow()
    bad(['gone'])
    bad(['fine'])
    bad(['slng5'])
    bad(['slng'], { blocklist: new Set(['slng']) })
    bad(['slng'], { isProfane: (w) => w === 'slng' })
  })
})

describe('serialisePools', () => {
  it('ends with one newline and round-trips', () => {
    const t = serialisePools({
      answers: ['a', 'b'],
      guesses: ['c'],
      slang: ['d', 'e'],
    })
    expect(t.endsWith('}\n')).toBe(true)
    expect(JSON.parse(t)).toEqual({
      answers: 'a b',
      guesses: 'c',
      slang: 'd e',
    })
    expect(Object.keys(JSON.parse(t))).toEqual(['answers', 'guesses', 'slang'])
  })
})

describe('parseCutList', () => {
  it('parses word and reason, defaulting to owner cut', () => {
    expect(
      parseCutList(
        'arse  # blocklist hit\nfoo # owner cut\n\n# heading only\nbar\n',
      ),
    ).toEqual([
      { word: 'arse', reason: 'blocklist hit' },
      { word: 'foo', reason: 'owner cut' },
      { word: 'bar', reason: 'owner cut' },
    ])
  })
})

describe('slang review helpers', () => {
  const entries = [
    { word: 'arse', definition: 'x', crude: true, reviewed: false },
    { word: 'yeet', definition: 'y', crude: false, reviewed: false },
    { word: 'blok', definition: 'z', crude: false, reviewed: false },
  ]
  it('findBlocklistHits returns sorted hits', () => {
    expect(
      findBlocklistHits(entries, {
        isProfane: (w) => w === 'arse',
        blocklist: new Set(['blok']),
      }),
    ).toEqual(['arse', 'blok'])
  })
  it('removeCut drops cut words and is idempotent', () => {
    const once = removeCut(entries, new Set(['arse']))
    expect(once.map((e) => e.word)).toEqual(['yeet', 'blok'])
    expect(removeCut(once, new Set(['arse']))).toEqual(once)
  })
  it('markReviewed sets reviewed true only', () => {
    const out = markReviewed(entries)
    expect(out.every((e) => e.reviewed === true)).toBe(true)
    expect(out[0]).toEqual({ ...entries[0], reviewed: true })
  })
  it('renderSlangReview renders cut-list form with Already cut', () => {
    const md = renderSlangReview(entries.slice(1), {
      isProfane: () => false,
      blocklist: new Set(),
      commonByLength: { 4: new Set(), 5: new Set(), 6: new Set() },
      cuts: [{ word: 'arse', reason: 'blocklist hit' }],
    })
    expect(md).toContain('## Already cut (1)')
    expect(md).toContain('| arse | 4 | blocklist hit |')
    expect(md).not.toContain('keep/cut')
    expect(md).toContain('Reply with the words to cut')
  })
})

describe('reviewedSlang', () => {
  it('keeps reviewed words of the length, sorted', () => {
    expect(
      reviewedSlang(
        [
          { word: 'bruh', reviewed: true },
          { word: 'yeet', reviewed: false },
          { word: 'rizzy', reviewed: true },
          { word: 'aight', reviewed: true },
        ],
        5,
      ),
    ).toEqual(['aight', 'rizzy'])
  })
})

describe('reviewedDefs', () => {
  it('keeps reviewed definitions of the length in sorted word order', () => {
    const out = reviewedDefs(
      [
        { word: 'yeet', definition: 'To throw.', reviewed: true },
        { word: 'zzzz', definition: 'x', reviewed: false },
        { word: 'bruhs', definition: 'y', reviewed: true },
        { word: 'bruh', definition: 'Bro.', reviewed: true },
      ],
      4,
    )
    expect(out).toEqual({ bruh: 'Bro.', yeet: 'To throw.' })
    expect(Object.keys(out)).toEqual(['bruh', 'yeet'])
  })
})
