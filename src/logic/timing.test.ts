import { describe, expect, it } from 'vitest'
import { bounceMs, resultDelayMs, revealDurationMs } from './timing'

describe('revealDurationMs', () => {
  it('follows the timing contract', () => {
    expect(revealDurationMs(4, false)).toBe(1400)
    expect(revealDurationMs(5, false)).toBe(1700)
    expect(revealDurationMs(6, false)).toBe(2000)
    expect(revealDurationMs(4, true)).toBe(150)
    expect(revealDurationMs(6, true)).toBe(150)
  })
})

describe('bounceMs', () => {
  it('is 400 ms plus a 100 ms stagger per extra tile', () => {
    expect(bounceMs(4)).toBe(700)
    expect(bounceMs(5)).toBe(800)
    expect(bounceMs(6)).toBe(900)
  })
})

describe('resultDelayMs (D-20, D-23)', () => {
  it('wins wait for the bounce plus 400 ms', () => {
    expect(resultDelayMs('won', 4, false)).toBe(1100)
    expect(resultDelayMs('won', 5, false)).toBe(1200)
    expect(resultDelayMs('won', 6, false)).toBe(1300)
  })
  it('losses wait 600 ms', () => {
    expect(resultDelayMs('lost', 5, false)).toBe(600)
  })
  it('reduced motion waits 300 ms', () => {
    expect(resultDelayMs('won', 5, true)).toBe(300)
    expect(resultDelayMs('lost', 6, true)).toBe(300)
  })
})
