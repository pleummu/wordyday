// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAppearance, resolveTheme, startAppearance } from './appearance'

function fakeMq(matches: boolean) {
  let listener: (() => void) | null = null
  return {
    matches,
    addEventListener: vi.fn((_: string, l: () => void) => (listener = l)),
    removeEventListener: vi.fn(() => (listener = null)),
    fire: () => listener?.(),
  }
}

function fakeStore(init: { theme: string; colourBlind: boolean }) {
  let state = init
  const subs = new Set<(s: typeof state) => void>()
  return {
    getState: () => state as never,
    subscribe: (fn: (s: typeof state) => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    set: (p: Partial<typeof state>) => {
      state = { ...state, ...p }
      subs.forEach((f) => f(state))
    },
  }
}

const root = document.documentElement
let stop: (() => void) | null = null

beforeEach(() => {
  document.head.innerHTML = '<meta name="theme-color" content="#fbfaf7">'
  delete root.dataset.theme
  delete root.dataset.palette
})
afterEach(() => {
  stop?.()
  stop = null
})

const themeColor = () =>
  document.querySelector('meta[name="theme-color"]')!.getAttribute('content')

describe('resolveTheme', () => {
  it('resolves system from the media query and passes explicit themes through', () => {
    expect(resolveTheme('system', { matches: true })).toBe('dark')
    expect(resolveTheme('system', { matches: false })).toBe('light')
    expect(resolveTheme('system')).toBe('light')
    expect(resolveTheme('light', { matches: true })).toBe('light')
    expect(resolveTheme('dark', { matches: false })).toBe('dark')
  })
})

describe('applyAppearance', () => {
  it('sets and clears the attributes and theme-color', () => {
    applyAppearance(root, 'dark', true, { matches: false })
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.palette).toBe('colour-blind')
    expect(themeColor()).toBe('#232220')
    applyAppearance(root, 'light', false)
    expect(root.dataset.palette).toBeUndefined()
    expect(themeColor()).toBe('#fbfaf7')
  })
})

describe('startAppearance', () => {
  const start = (
    store: ReturnType<typeof fakeStore>,
    mq: ReturnType<typeof fakeMq>,
  ) => {
    stop = startAppearance(store as never, root, {
      matchMedia: () => mq,
    } as never)
    return stop
  }

  it('applies immediately and on store changes only', () => {
    const store = fakeStore({ theme: 'system', colourBlind: false })
    start(store, fakeMq(true))
    expect(root.dataset.theme).toBe('dark')
    store.set({ theme: 'light' })
    expect(root.dataset.theme).toBe('light')
    store.set({ colourBlind: true })
    expect(root.dataset.palette).toBe('colour-blind')
    root.dataset.theme = 'sentinel'
    store.set({ theme: 'light' })
    expect(root.dataset.theme).toBe('sentinel')
  })

  it('follows the media query only while on system', () => {
    const store = fakeStore({ theme: 'system', colourBlind: false })
    const mq = fakeMq(false)
    start(store, mq)
    mq.matches = true
    mq.fire()
    expect(root.dataset.theme).toBe('dark')
    store.set({ theme: 'light' })
    mq.fire()
    expect(root.dataset.theme).toBe('light')
  })

  it('returns the same stop twice and stop cleans up', () => {
    const store = fakeStore({ theme: 'system', colourBlind: false })
    const mq = fakeMq(false)
    const s1 = start(store, mq)
    expect(
      startAppearance(store as never, root, { matchMedia: () => mq } as never),
    ).toBe(s1)
    s1()
    expect(mq.removeEventListener).toHaveBeenCalledTimes(1)
    store.set({ theme: 'dark' })
    expect(root.dataset.theme).toBe('light')
  })
})
