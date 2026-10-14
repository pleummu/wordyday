import type { StoreApi } from 'zustand'
import type { GameState } from './gameStore'

type Theme = GameState['theme']
type MQ = Pick<MediaQueryList, 'matches'>
type AppearanceStore = Pick<StoreApi<GameState>, 'getState' | 'subscribe'>

// Mirrors --color-bg in tokens.css.
const THEME_COLOR = { light: '#fbfaf7', dark: '#232220' } as const

let started = false
let stop: (() => void) | null = null

export function resolveTheme(theme: Theme, mq?: MQ): 'light' | 'dark' {
  if (theme === 'system') return mq?.matches ? 'dark' : 'light'
  return theme
}

export function applyAppearance(
  root: HTMLElement,
  theme: Theme,
  colourBlind: boolean,
  mq?: MQ,
  doc: Document = document,
): void {
  const resolved = resolveTheme(theme, mq)
  root.dataset.theme = resolved
  if (colourBlind) root.dataset.palette = 'colour-blind'
  else delete root.dataset.palette
  doc
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[resolved])
}

// Keeps data-theme / data-palette in step with the store and the OS.
// Started once, outside React; a second call returns the same stop.
export function startAppearance(
  store: AppearanceStore,
  root: HTMLElement = document.documentElement,
  win: Window = window,
): () => void {
  if (started && stop) return stop
  const mq = win.matchMedia?.('(prefers-color-scheme: dark)')
  let lastTheme: Theme | null = null
  let lastCb: boolean | null = null

  const run = () => {
    const { theme, colourBlind } = store.getState()
    lastTheme = theme
    lastCb = colourBlind
    applyAppearance(root, theme, colourBlind, mq, root.ownerDocument)
  }
  const unsub = store.subscribe((s) => {
    if (s.theme !== lastTheme || s.colourBlind !== lastCb) run()
  })
  const onChange = () => {
    if (store.getState().theme === 'system') run()
  }
  mq?.addEventListener('change', onChange)
  run()
  started = true
  stop = () => {
    unsub()
    mq?.removeEventListener('change', onChange)
    started = false
    stop = null
  }
  return stop
}
