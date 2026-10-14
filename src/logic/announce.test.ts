import { describe, expect, it } from 'vitest'
import { giveUpAnnouncement, guessAnnouncement } from './announce'

const S = ['absent', 'present', 'correct', 'absent', 'absent'] as const

describe('announce', () => {
  it('playing', () => {
    expect(
      guessAnnouncement('crane', S, { kind: 'playing', triesLeft: 4 }),
    ).toBe(
      'CRANE: C absent, R present, A correct, N absent, E absent. 4 tries left.',
    )
  })
  it('singular try', () => {
    expect(
      guessAnnouncement('crane', S, { kind: 'playing', triesLeft: 1 }),
    ).toMatch(/\. 1 try left\.$/)
  })
  it('won', () => {
    const t = guessAnnouncement('crane', S, { kind: 'won', attempts: 4 })
    expect(t).toMatch(/\. You won in 4\.$/)
    expect(t).not.toContain('left')
  })
  it('lost', () => {
    expect(
      guessAnnouncement('house', S, { kind: 'lost', answer: 'crane' }),
    ).toMatch(/\. Out of tries\. The word was CRANE\.$/)
  })
  it('give up', () => {
    expect(giveUpAnnouncement('crane')).toBe('You gave up. The word was CRANE.')
  })
})
