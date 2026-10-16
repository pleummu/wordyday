import { describe, expect, it } from 'vitest'
import { applyGuessToKeys, mergeKeyState } from './keys'
import type { TileState } from './score'

describe('R-GUESS-6 key best state', () => {
  it('merges the documented pairs', () => {
    expect(mergeKeyState(undefined, 'absent')).toBe('absent')
    expect(mergeKeyState('present', 'absent')).toBe('present')
    expect(mergeKeyState('correct', 'present')).toBe('correct')
    expect(mergeKeyState('absent', 'correct')).toBe('correct')
  })

  it('never goes backwards for every ordered pair', () => {
    const rank = { absent: 1, present: 2, correct: 3 }
    const all: TileState[] = ['absent', 'present', 'correct']
    for (const prev of all) {
      for (const next of all) {
        expect(rank[mergeKeyState(prev, next)]).toBeGreaterThanOrEqual(
          rank[prev],
        )
      }
    }
  })

  it('applies a guess keeping the best state per letter', () => {
    const keys = applyGuessToKeys({}, 'speed', [
      'present',
      'absent',
      'absent',
      'present',
      'present',
    ])
    expect(keys.s).toBe('present')
    expect(keys.p).toBe('absent')
    expect(keys.e).toBe('present')
    expect(keys.d).toBe('present')
  })

  it('does not mutate its input', () => {
    const input = { a: 'absent' } as const
    const copy = { ...input }
    const out = applyGuessToKeys(input, 'ab', ['correct', 'present'])
    expect(input).toEqual(copy)
    expect(out).not.toBe(input)
  })
})
