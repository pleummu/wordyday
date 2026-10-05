import { afterEach, describe, expect, it, vi } from 'vitest'
import { localDateKey, msUntilNextLocalMidnight } from './clock'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe.each([
  'UTC',
  'America/Los_Angeles',
  'Pacific/Auckland',
  'Asia/Kolkata',
])('EC-28 localDateKey uses local fields (%s)', (tz) => {
  it('keeps the local day at 00:30 and 23:59', () => {
    vi.stubEnv('TZ', tz)
    expect(localDateKey(new Date(2026, 5, 3, 0, 30))).toBe('2026-06-03')
    expect(localDateKey(new Date(2026, 5, 3, 23, 59))).toBe('2026-06-03')
  })
})

describe('msUntilNextLocalMidnight', () => {
  const HOUR = 3_600_000

  it('EC-26 DST spring forward is about 23 h', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    const ms = msUntilNextLocalMidnight(new Date(2026, 2, 8, 0, 0))
    expect(ms).toBe(23 * HOUR + 50)
  })

  it('EC-27 DST fall back is about 25 h', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    const ms = msUntilNextLocalMidnight(new Date(2026, 10, 1, 0, 0))
    expect(ms).toBe(25 * HOUR + 50)
  })

  it('is never below 1000', () => {
    vi.stubEnv('TZ', 'UTC')
    const ms = msUntilNextLocalMidnight(new Date(2026, 5, 3, 23, 59, 59, 999))
    expect(ms).toBe(1000)
  })
})
