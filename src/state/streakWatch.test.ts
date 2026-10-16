// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { msUntilNextLocalMidnight } from './clock'
import { startStreakWatch } from './streakWatch'

const checkStreaks = vi.fn()
const store = { getState: () => ({ checkStreaks }) } as never
const NOW = new Date('2026-06-03T23:00:00')

let stop: (() => void) | null = null

function setVisibility(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => v,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  setVisibility('visible')
})
afterEach(() => {
  stop?.()
  stop = null
  checkStreaks.mockClear()
  vi.useRealTimers()
})

const start = () => {
  stop = startStreakWatch(store, window, document, () => NOW)
  return stop
}

describe('startStreakWatch', () => {
  it('registers one visibilitychange and one focus listener', () => {
    start()
    startStreakWatch(store, window, document, () => NOW)
    window.dispatchEvent(new Event('focus'))
    expect(checkStreaks).toHaveBeenCalledTimes(1)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(checkStreaks).toHaveBeenCalledTimes(2)
  })

  it('ignores a hidden visibilitychange', () => {
    start()
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(checkStreaks).not.toHaveBeenCalled()
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(checkStreaks).toHaveBeenCalledTimes(1)
  })

  it('runs at midnight and re-arms', () => {
    start()
    const ms = msUntilNextLocalMidnight(NOW)
    vi.advanceTimersByTime(ms)
    expect(checkStreaks).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(ms)
    expect(checkStreaks).toHaveBeenCalledTimes(2)
  })

  it('focus and visibility re-arm the midnight timer', () => {
    start()
    expect(vi.getTimerCount()).toBe(1)
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(1)
  })

  it('the returned stop removes listeners and clears the timer', () => {
    const off = start()
    off()
    stop = null
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(checkStreaks).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
