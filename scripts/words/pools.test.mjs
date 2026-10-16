import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseList, reviewedSlang } from './lib.mjs'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const blocklist = new Set(parseList(read('./blocklist.txt')))
const exclude = new Set(parseList(read('./exclude.txt')))
const slangEntries = JSON.parse(read('./slang.json'))
const slang = slangEntries.map((e) => e.word)

describe('D-13 committed pool invariants', () => {
  for (const n of [4, 5, 6]) {
    const data = JSON.parse(read(`../../src/data/words-${n}.json`))
    const answers = data.answers.split(' ')
    const guesses = data.guesses.split(' ')
    const all = [...answers, ...guesses]
    const answerSet = new Set(answers)

    describe(`${n}-letter pools`, () => {
      it('contains only a-z words of the exact length', () => {
        for (const w of all) {
          expect(w).toMatch(/^[a-z]+$/)
          expect(w).toHaveLength(n)
        }
      })

      it('has no duplicates and answers and guesses are disjoint', () => {
        expect(new Set(all).size).toBe(all.length)
        for (const w of guesses) expect(answerSet.has(w)).toBe(false)
      })

      it('includes every slang word of this length in the pool', () => {
        const pool = new Set(all)
        for (const w of slang.filter((s) => s.length === n)) {
          expect(pool.has(w)).toBe(true)
        }
      })

      it('keeps blocklist, exclude and slang words out of answers', () => {
        for (const w of answers) {
          expect(blocklist.has(w)).toBe(false)
          expect(exclude.has(w)).toBe(false)
          expect(slang.includes(w)).toBe(false)
        }
      })

      it('slang field equals the reviewed slang of this length', () => {
        expect(data.slang).toBe(reviewedSlang(slangEntries, n).join(' '))
      })

      it('every slang answer is a guess and never a Normal answer (WORD-03)', () => {
        const pool = new Set(all)
        for (const w of data.slang.split(' ')) {
          expect(pool.has(w)).toBe(true)
          expect(answerSet.has(w)).toBe(false)
        }
      })

      it('has at least 500 answers', () => {
        expect(answers.length).toBeGreaterThanOrEqual(500)
      })
    })
  }

  it('applies the D-02 stem rule to real data', () => {
    const load = (n) =>
      new Set(
        JSON.parse(read(`../../src/data/words-${n}.json`)).answers.split(' '),
      )
    const a5 = load(5)
    const a4 = load(4)
    const a6 = load(6)
    for (const w of ['boats', 'baked']) expect(a5.has(w)).toBe(false)
    expect(a6.has('cities')).toBe(false)
    const skip = (w) => exclude.has(w) || slang.includes(w)
    for (const w of ['glass', 'bless', 'thing', 'bring']) {
      if (!skip(w)) expect(a5.has(w)).toBe(true)
    }
    for (const w of ['king', 'need', 'seed']) {
      if (!skip(w)) expect(a4.has(w)).toBe(true)
    }
  })
})
