import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const slang = JSON.parse(
  readFileSync(new URL('./slang.json', import.meta.url), 'utf8'),
)

describe('D-18 slang.json shape', () => {
  it('parses to an array', () => {
    expect(Array.isArray(slang)).toBe(true)
  })

  it('has exactly the keys word, definition, crude, reviewed', () => {
    for (const entry of slang) {
      expect(Object.keys(entry).sort()).toEqual([
        'crude',
        'definition',
        'reviewed',
        'word',
      ])
    }
  })

  it('has lowercase a-z words of length 4 to 6', () => {
    for (const { word } of slang) expect(word).toMatch(/^[a-z]{4,6}$/)
  })

  it('has trimmed non-empty definitions', () => {
    for (const { definition } of slang) {
      expect(typeof definition).toBe('string')
      expect(definition.length).toBeGreaterThan(0)
      expect(definition).toBe(definition.trim())
    }
  })

  it('has boolean crude and reviewed, with reviewed false (D-15)', () => {
    for (const entry of slang) {
      expect(typeof entry.crude).toBe('boolean')
      expect(entry.reviewed).toBe(false)
    }
  })

  it('has no duplicate words', () => {
    const words = slang.map((e) => e.word)
    expect(new Set(words).size).toBe(words.length)
  })

  it('is sorted by word', () => {
    const words = slang.map((e) => e.word)
    expect(words).toEqual([...words].sort())
  })
})

for (const length of [4, 5, 6]) {
  describe(`${length}-letter slang count`, () => {
    it('has between 80 and 150 entries (D-14)', () => {
      const n = slang.filter((e) => e.word.length === length).length
      expect(n).toBeGreaterThanOrEqual(80)
      expect(n).toBeLessThanOrEqual(150)
    })
  })
}
