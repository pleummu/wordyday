import { describe, expect, it } from 'vitest'
import { pickAnswer, pickWordubadoAnswer, SLANG_SHARE } from './pickAnswer'

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

describe('WORD-04 pickWordubadoAnswer', () => {
  const slang = Array.from({ length: 20 }, (_, i) => `s${i}`)
  const answers = Array.from({ length: 20 }, (_, i) => `a${i}`)

  it('QA-02 draws slang about 75% of the time over 10000 seeded draws', () => {
    const rng = mulberry32(2026)
    let slangHits = 0
    for (let i = 0; i < 10000; i++) {
      const w = pickWordubadoAnswer({ answers, slang }, rng)
      expect(slang.includes(w) || answers.includes(w)).toBe(true)
      if (slang.includes(w)) slangHits++
    }
    expect(slangHits).toBeGreaterThan(7300)
    expect(slangHits).toBeLessThan(7700)
  })

  it('splits at SLANG_SHARE and consumes exactly 2 draws', () => {
    expect(SLANG_SHARE).toBe(0.75)
    const seq = (...v: number[]) => {
      let i = 0
      return { rng: () => v[i++], used: () => i }
    }
    const a = seq(0.74, 0)
    expect(pickWordubadoAnswer({ answers, slang }, a.rng)).toBe('s0')
    expect(a.used()).toBe(2)
    const b = seq(0.75, 0)
    expect(pickWordubadoAnswer({ answers, slang }, b.rng)).toBe('a0')
    expect(b.used()).toBe(2)
  })

  it('falls back to answers when there is no slang', () => {
    expect(pickWordubadoAnswer({ answers, slang: [] }, () => 0)).toBe('a0')
  })
})
