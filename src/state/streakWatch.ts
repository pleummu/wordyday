import type { StoreApi } from 'zustand'
import { msUntilNextLocalMidnight } from './clock'
import type { GameState } from './gameStore'

let started = false
let stop: (() => void) | null = null

type WatchStore = Pick<StoreApi<GameState>, 'getState'>

// Re-runs the idempotent missed-day check when the tab becomes visible, the
// window regains focus and at the next local midnight (STRK-04, R-DATE-4).
// Started once, outside React; a second call returns the same stop.
export function startStreakWatch(
  store: WatchStore,
  target: Window = window,
  doc: Document = document,
  now: () => Date = () => new Date(),
  setT: typeof setTimeout = setTimeout,
  clearT: typeof clearTimeout = clearTimeout,
): () => void {
  if (started && stop) return stop
  let timer: ReturnType<typeof setTimeout> | null = null

  const arm = () => {
    if (timer !== null) clearT(timer)
    timer = setT(() => {
      timer = null
      store.getState().checkStreaks()
      arm()
    }, msUntilNextLocalMidnight(now()))
  }
  const run = () => {
    store.getState().checkStreaks()
    arm()
  }
  const onVisibility = () => {
    if (doc.visibilityState === 'visible') run()
  }

  doc.addEventListener('visibilitychange', onVisibility)
  target.addEventListener('focus', run)
  arm()
  started = true
  stop = () => {
    doc.removeEventListener('visibilitychange', onVisibility)
    target.removeEventListener('focus', run)
    if (timer !== null) clearT(timer)
    timer = null
    started = false
    stop = null
  }
  return stop
}
