import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseCutList, parseList } from './lib.mjs'
import { isProfane } from './profanity.mjs'

// D-05: floor agreed with the owner at the Phase 3 review
const SLANG_MIN_PER_LENGTH = 80
const SLANG_MAX_PER_LENGTH = 150

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

  it('has boolean crude and reviewed, with reviewed true (D-02)', () => {
    for (const entry of slang) {
      expect(typeof entry.crude).toBe('boolean')
      expect(entry.reviewed).toBe(true)
    }
  })

  it('has no blocklist hits (D-03)', () => {
    const blocklist = new Set(
      parseList(
        readFileSync(new URL('./blocklist.txt', import.meta.url), 'utf8'),
      ),
    )
    for (const { word } of slang) {
      expect(!isProfane(word) && !blocklist.has(word)).toBe(true)
    }
  })

  it('contains no cut word', () => {
    const cuts = parseCutList(
      readFileSync(new URL('./slang-cuts.txt', import.meta.url), 'utf8'),
    )
    const words = new Set(slang.map((e) => e.word))
    for (const { word } of cuts) expect(words.has(word)).toBe(false)
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
    it('has between SLANG_MIN_PER_LENGTH and SLANG_MAX_PER_LENGTH entries (D-14)', () => {
      const n = slang.filter((e) => e.word.length === length).length
      expect(n).toBeGreaterThanOrEqual(SLANG_MIN_PER_LENGTH)
      expect(n).toBeLessThanOrEqual(SLANG_MAX_PER_LENGTH)
    })
  })
}
