import { describe, expect, it } from 'vitest'
import { score } from './score'

describe('R-SCORE-2 worked example ABBEY/BABES', () => {
  it('scores abbey/babes', () => {
    expect(score('abbey', 'babes')).toEqual([
      'present',
      'present',
      'correct',
      'correct',
      'absent',
    ])
  })
})

describe('R-SCORE-3 worked example SPEED/ERASE', () => {
  it('scores speed/erase', () => {
    expect(score('speed', 'erase')).toEqual([
      'present',
      'absent',
      'absent',
      'present',
      'present',
    ])
  })
})

describe('R-SCORE-1 two-pass scoring', () => {
  it('scores an exact match as all correct', () => {
    expect(score('crane', 'crane')).toEqual(Array(5).fill('correct'))
  })

  it('scores no shared letters as all absent', () => {
    expect(score('plumb', 'tread')).toEqual(Array(5).fill('absent'))
  })

  it('handles 4 letters with repeats', () => {
    expect(score('ball', 'lull')).toEqual([
      'absent',
      'absent',
      'correct',
      'correct',
    ])
  })

  it('handles 6 letters with repeats', () => {
    expect(score('banana', 'ananas')).toEqual([
      'present',
      'present',
      'present',
      'present',
      'present',
      'absent',
    ])
  })

  it('handles triple letters', () => {
    expect(score('eerie', 'eeeee')).toEqual([
      'correct',
      'correct',
      'absent',
      'absent',
      'correct',
    ])
  })

  it('gives green priority over an earlier yellow', () => {
    expect(score('hello', 'lllll')).toEqual([
      'absent',
      'absent',
      'correct',
      'correct',
      'absent',
    ])
  })

  it('returns one state per guess letter for 4, 5 and 6', () => {
    expect(score('word', 'wind')).toHaveLength(4)
    expect(score('crane', 'slate')).toHaveLength(5)
    expect(score('planet', 'garden')).toHaveLength(6)
  })
})
