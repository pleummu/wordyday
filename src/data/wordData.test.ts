import { afterEach, describe, expect, it } from 'vitest'
import { loadPools, toPools } from './wordData'
import { readTestAnswer } from '../state/testHook'

describe('toPools (D-13)', () => {
  it('splits answers and merges them into the guess set', () => {
    const p = toPools({ answers: 'aa bb', guesses: 'cc' })
    expect(p.answers).toEqual(['aa', 'bb'])
    expect(p.guesses.size).toBe(3)
    for (const w of ['aa', 'bb', 'cc']) expect(p.guesses.has(w)).toBe(true)
  })
})

describe('loadPools (D-12)', () => {
  it('memoises per length and every answer is a valid guess', async () => {
    const a = loadPools(4)
    expect(loadPools(4)).toBe(a)
    const p = await a
    expect(p.answers.length).toBeGreaterThanOrEqual(500)
    for (const w of p.answers) expect(p.guesses.has(w)).toBe(true)
  })
})

describe('readTestAnswer (D-22)', () => {
  afterEach(() => {
    globalThis.__WORDLE_TEST__ = undefined
  })
  it('returns the lowercased word when it is in the guess pool', () => {
    globalThis.__WORDLE_TEST__ = { answers: { 5: 'HOUSE' } }
    expect(readTestAnswer(5, new Set(['house']))).toBe('house')
  })
  it('ignores words outside the guess pool', () => {
    globalThis.__WORDLE_TEST__ = { answers: { 5: 'zzzzz' } }
    expect(readTestAnswer(5, new Set(['house']))).toBeUndefined()
  })
  it('returns undefined when the hook is unset', () => {
    expect(readTestAnswer(5, new Set(['house']))).toBeUndefined()
  })
})
