import type { WordLength } from '../logic/boards'

export type RawPools = { answers: string; guesses: string; slang: string }
export type Pools = {
  answers: readonly string[]
  slang: readonly string[]
  guesses: ReadonlySet<string>
}

export function toPools(raw: RawPools): Pools {
  const answers = raw.answers.split(' ').filter(Boolean)
  const extra = raw.guesses.split(' ').filter(Boolean)
  const slang = raw.slang.split(' ').filter(Boolean)
  return { answers, slang, guesses: new Set([...answers, ...slang, ...extra]) }
}

// The only place that references words-N.json (one chunk per length, D-12).
const loaders: Record<WordLength, () => Promise<{ default: RawPools }>> = {
  4: () => import('./words-4.json'),
  5: () => import('./words-5.json'),
  6: () => import('./words-6.json'),
}

const RELOAD_TIMEOUT_MS = 3000

const cache = new Map<WordLength, Promise<Pools>>()
const failed = new Set<WordLength>()

export function loadPools(length: WordLength): Promise<Pools> {
  const hit = cache.get(length)
  if (hit) return hit
  if (failed.has(length)) {
    // A failed dynamic import stays failed in the browser's module map for the
    // life of the page, so retrying in place cannot succeed. Reload instead.
    // Saved progress is safe: every submitted guess is written synchronously
    // by the persist adapter; only a half-typed row is lost (R-BOARD-3).
    if (globalThis.navigator?.onLine === false) {
      return Promise.reject(new Error('offline'))
    }
    globalThis.location.reload()
    return new Promise<Pools>((_, reject) => {
      setTimeout(() => reject(new Error('reload blocked')), RELOAD_TIMEOUT_MS)
    })
  }
  const promise = loaders[length]()
    .then((mod) => toPools(mod.default))
    .catch((err: unknown) => {
      cache.delete(length)
      failed.add(length)
      throw err
    })
  cache.set(length, promise)
  return promise
}
