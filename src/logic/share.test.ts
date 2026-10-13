import { describe, expect, it, vi } from 'vitest'
import { buildShareText, isTouchFirst, runShare } from './share'
import type { TileState } from './score'

const W: TileState = 'correct'
const P: TileState = 'present'
const A: TileState = 'absent'
const win5 = [
  [A, P, A, A, A],
  [A, A, W, A, A],
  [W, W, W, W, W],
]

const base = {
  mode: 'normal' as const,
  length: 5 as const,
  rows: win5,
  maxAttempts: 6,
  outcome: 'won' as const,
  colourBlind: false,
  origin: 'https://x.test',
}

describe('buildShareText', () => {
  it('builds the Normal win text', () => {
    expect(buildShareText(base)).toBe(
      'Wordle 5 - 3/6\n\n⬜🟨⬜⬜⬜\n⬜⬜🟩⬜⬜\n🟩🟩🟩🟩🟩\n\nhttps://x.test',
    )
  })
  it('uses the Wordubado header', () => {
    expect(buildShareText({ ...base, mode: 'wordubado' }).split('\n')[0]).toBe(
      'Unlimited Wordle - Wordubado 5 - 3/6',
    )
  })
  it('uses X for a loss and a give up with rows played', () => {
    const lost = buildShareText({ ...base, outcome: 'lost' })
    expect(lost.split('\n')[0]).toBe('Wordle 5 - X/6')
    const gu = buildShareText({ ...base, outcome: 'gave-up' })
    expect(gu.split('\n')[0]).toBe('Wordle 5 - X/6')
    expect(gu.split('\n').slice(2, -2)).toHaveLength(3)
  })
  it('uses the attempts of 4 and 6 letter boards', () => {
    expect(
      buildShareText({ ...base, length: 4, maxAttempts: 5, outcome: 'lost' }),
    ).toMatch(/^Wordle 4 - X\/5/)
    expect(
      buildShareText({ ...base, length: 6, maxAttempts: 7, outcome: 'lost' }),
    ).toMatch(/^Wordle 6 - X\/7/)
  })
  it('uses orange and blue squares in colour-blind mode', () => {
    const t = buildShareText({ ...base, colourBlind: true })
    expect(t).toContain('🟧')
    expect(t).toContain('🟦')
    expect(t).not.toContain('🟩')
    expect(t).not.toContain('🟨')
  })
  it('has no letters in the grid and no trailing newline', () => {
    const t = buildShareText(base)
    for (const l of t.split('\n').slice(2, -2)) expect(l).not.toMatch(/[a-z]/i)
    expect(t.endsWith('\n')).toBe(false)
  })
})

describe('isTouchFirst', () => {
  const fn = () => {}
  it('is true only for share + coarse + touch points', () => {
    expect(isTouchFirst({ share: fn, coarse: true, maxTouchPoints: 5 })).toBe(
      true,
    )
    expect(
      isTouchFirst({ share: undefined, coarse: true, maxTouchPoints: 5 }),
    ).toBe(false)
    expect(isTouchFirst({ share: fn, coarse: false, maxTouchPoints: 5 })).toBe(
      false,
    )
    expect(isTouchFirst({ share: fn, coarse: true, maxTouchPoints: 0 })).toBe(
      false,
    )
  })
})

describe('runShare', () => {
  const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  }
  const mk = () => ({ copied: vi.fn(), failed: vi.fn() })

  it('shares only text on touch-first and does nothing else', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()
    const on = mk()
    runShare('t', { touchFirst: true, share, writeText }, on)
    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith({ text: 't' })
    await flush()
    expect(writeText).not.toHaveBeenCalled()
    expect(on.copied).not.toHaveBeenCalled()
    expect(on.failed).not.toHaveBeenCalled()
  })
  it('ignores AbortError', async () => {
    const share = vi.fn().mockRejectedValue({ name: 'AbortError' })
    const writeText = vi.fn()
    const on = mk()
    runShare('t', { touchFirst: true, share, writeText }, on)
    await flush()
    expect(writeText).not.toHaveBeenCalled()
    expect(on.copied).not.toHaveBeenCalled()
    expect(on.failed).not.toHaveBeenCalled()
  })
  it('falls back to the clipboard on other share errors', async () => {
    const share = vi.fn().mockRejectedValue({ name: 'NotAllowedError' })
    const writeText = vi.fn().mockResolvedValue(undefined)
    const on = mk()
    runShare('t', { touchFirst: true, share, writeText }, on)
    await flush()
    expect(writeText).toHaveBeenCalledWith('t')
    expect(on.copied).toHaveBeenCalledTimes(1)
  })
  it('copies synchronously when not touch-first', async () => {
    const share = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const on = mk()
    runShare('t', { touchFirst: false, share, writeText }, on)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(share).not.toHaveBeenCalled()
    await flush()
    expect(on.copied).toHaveBeenCalledTimes(1)
  })
  it('reports failure on rejection, missing API and sync throw', async () => {
    const on1 = mk()
    runShare(
      't',
      {
        touchFirst: false,
        writeText: vi.fn().mockRejectedValue(new Error('x')),
      },
      on1,
    )
    await flush()
    expect(on1.failed).toHaveBeenCalledTimes(1)
    const on2 = mk()
    runShare('t', { touchFirst: false }, on2)
    expect(on2.failed).toHaveBeenCalledTimes(1)
    const on3 = mk()
    runShare(
      't',
      {
        touchFirst: false,
        writeText: () => {
          throw new Error('x')
        },
      },
      on3,
    )
    expect(on3.failed).toHaveBeenCalledTimes(1)
  })
})
