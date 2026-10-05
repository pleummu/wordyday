import { describe, expect, it } from 'vitest'
import { MIGRATIONS, emptyBoardStats, emptySave, emptyStats } from './save'
import { nextSeq, recordResult, type FinishRecord } from './stats'

const rec = (over: Partial<FinishRecord> = {}): FinishRecord => ({
  outcome: 'won',
  guesses: 3,
  id: 1,
  answer: 'crane',
  seq: 1,
  ...over,
})

describe('recordResult', () => {
  it('counts a win', () => {
    const s = recordResult(emptyBoardStats('normal-5'), rec())
    expect(s).toMatchObject({
      played: 1,
      wins: 1,
      winStreak: 1,
      bestWinStreak: 1,
      last: { won: true, guesses: 3, seq: 1 },
      lastCounted: { id: 1, answer: 'crane' },
    })
    expect(s.dist).toEqual([0, 0, 1, 0, 0, 0])
  })

  it('counts a loss and resets the streak', () => {
    const won = recordResult(emptyBoardStats('normal-5'), rec())
    const s = recordResult(
      won,
      rec({ outcome: 'lost', id: 2, seq: 2, guesses: 6 }),
    )
    expect(s.played).toBe(2)
    expect(s.winStreak).toBe(0)
    expect(s.bestWinStreak).toBe(1)
    expect(s.gaveUp).toBe(0)
    expect(s.dist).toEqual(won.dist)
    expect(s.last?.won).toBe(false)
  })

  it.each(['gave-up', 'forfeit'] as const)('counts %s as a give up', (o) => {
    const won = recordResult(emptyBoardStats('normal-5'), rec())
    const s = recordResult(won, rec({ outcome: o, id: 2, seq: 2, guesses: 4 }))
    expect(s.played).toBe(2)
    expect(s.gaveUp).toBe(1)
    expect(s.winStreak).toBe(0)
  })

  it('returns the identical object for an already counted game (D-20)', () => {
    const s = recordResult(emptyBoardStats('normal-5'), rec())
    expect(recordResult(s, rec({ seq: 9 }))).toBe(s)
  })

  it('counts the same id with a different answer', () => {
    const s = recordResult(emptyBoardStats('normal-5'), rec())
    const t = recordResult(s, rec({ answer: 'slate' }))
    expect(t).not.toBe(s)
    expect(t.played).toBe(2)
  })

  it('EC-36 a loss resets only its own Board', () => {
    const all = emptyStats()
    all['normal-5'] = { ...all['normal-5'], winStreak: 3, played: 3, wins: 3 }
    all['normal-4'] = { ...all['normal-4'], winStreak: 2, played: 2, wins: 2 }
    const a = recordResult(all['normal-5'], rec({ outcome: 'lost' }))
    expect(a.winStreak).toBe(0)
    expect(all['normal-4'].winStreak).toBe(2)
  })
})

describe('emptyBoardStats', () => {
  it('sizes dist to the attempts of the length', () => {
    expect(emptyBoardStats('normal-4').dist).toHaveLength(5)
    expect(emptyBoardStats('normal-5').dist).toHaveLength(6)
    expect(emptyBoardStats('wordubado-6').dist).toHaveLength(7)
  })
})

describe('nextSeq', () => {
  it('starts at 1 and follows the highest last.seq', () => {
    const all = emptyStats()
    expect(nextSeq(all)).toBe(1)
    all['normal-5'] = recordResult(all['normal-5'], rec({ seq: 1 }))
    expect(nextSeq(all)).toBe(2)
  })
})

describe('MIGRATIONS[1]', () => {
  it('adds the zero slices and keeps the rest', () => {
    const v1 = {
      boards: {},
      last: { mode: 'wordubado', length: 4 },
      wordubadoInfoSeen: true,
    }
    const out = MIGRATIONS[1](v1)
    const e = emptySave()
    expect(out).toEqual({
      ...v1,
      stats: e.stats,
      dayStreak: e.dayStreak,
      restores: e.restores,
      pendingRestore: null,
      streakRev: 0,
    })
  })

  it('returns a non-object unchanged', () => {
    expect(MIGRATIONS[1](5)).toBe(5)
    expect(MIGRATIONS[1](null)).toBeNull()
  })
})
