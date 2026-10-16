import { describe, expect, it } from 'vitest'
import { pickAnswer } from './pickAnswer'

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('R-POOL-4 pickAnswer', () => {
  const pool = ['a', 'b', 'c', 'd']

  it('returns the first word for rng 0', () => {
    expect(pickAnswer(pool, () => 0)).toBe('a')
  })

  it('returns the last word for rng just below 1', () => {
    expect(pickAnswer(pool, () => 0.999999)).toBe('d')
  })

  it('clamps rng 1 to the last word', () => {
    expect(pickAnswer(pool, () => 1)).toBe('d')
  })

  it('allows repeats: same rng value gives the same word', () => {
    const rng = () => 0.5
    expect(pickAnswer(pool, rng)).toBe(pickAnswer(pool, rng))
  })

  it('is roughly uniform over 10000 seeded draws', () => {
    const rng = mulberry32(12345)
    const hits: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
    for (let i = 0; i < 10000; i++) hits[pickAnswer(pool, rng)]++
    for (const word of pool) {
      expect(hits[word]).toBeGreaterThan(2200)
      expect(hits[word]).toBeLessThan(2800)
    }
  })

  it('throws on an empty pool', () => {
    expect(() => pickAnswer([])).toThrow('empty answer pool')
  })
})
