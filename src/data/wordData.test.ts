import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPools, toPools } from './wordData'
import { readTestAnswer } from '../state/testHook'

describe('toPools (D-13)', () => {
  it('splits answers and merges them into the guess set', () => {
    const p = toPools({ answers: 'aa bb', guesses: 'cc', slang: 'dd' })
    expect(p.answers).toEqual(['aa', 'bb'])
    expect(p.slang).toEqual(['dd'])
    expect(p.guesses.size).toBe(4)
    for (const w of ['aa', 'bb', 'cc', 'dd'])
      expect(p.guesses.has(w)).toBe(true)
  })
})

describe('loadPools (D-12)', () => {
  it('memoises per length and every answer is a valid guess', async () => {
    const a = loadPools(4)
    expect(loadPools(4)).toBe(a)
    const p = await a
    expect(p.answers.length).toBeGreaterThanOrEqual(500)
    for (const w of p.answers) expect(p.guesses.has(w)).toBe(true)
  })
})

describe('readTestAnswer (D-22)', () => {
  afterEach(() => {
    globalThis.__WORDLE_TEST__ = undefined
  })
  it('returns the lowercased word when it is in the guess pool', () => {
    globalThis.__WORDLE_TEST__ = { answers: { 5: 'HOUSE' } }
    expect(readTestAnswer(5, new Set(['house']))).toBe('house')
  })
  it('ignores words outside the guess pool', () => {
    globalThis.__WORDLE_TEST__ = { answers: { 5: 'zzzzz' } }
    expect(readTestAnswer(5, new Set(['house']))).toBeUndefined()
  })
  it('returns undefined when the hook is unset', () => {
    expect(readTestAnswer(5, new Set(['house']))).toBeUndefined()
  })
})

describe('loadPools retry after a failed load (D-15)', () => {
  async function failedModule() {
    vi.resetModules()
    vi.doMock('./words-4.json', () => {
      throw new Error('chunk failed')
    })
    const mod = await import('./wordData')
    await expect(mod.loadPools(4)).rejects.toThrow()
    return mod
  }

  afterEach(() => {
    vi.doUnmock('./words-4.json')
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('offline: rejects with offline and does not reload', async () => {
    const mod = await failedModule()
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    vi.stubGlobal('navigator', { onLine: false })
    await expect(mod.loadPools(4)).rejects.toThrow('offline')
    expect(reload).not.toHaveBeenCalled()
  })

  it('online: reloads once and rejects after 3 s if the reload is blocked', async () => {
    const mod = await failedModule()
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    vi.stubGlobal('navigator', { onLine: true })
    vi.useFakeTimers()
    const p = mod.loadPools(4)
    const assertion = expect(p).rejects.toThrow('reload blocked')
    expect(reload).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(3000)
    await assertion
  })
})
