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

const cache = new Map<WordLength, Promise<Pools>>()
const failed = new Set<WordLength>()

export function loadPools(length: WordLength): Promise<Pools> {
  const hit = cache.get(length)
  if (hit) return hit
  if (failed.has(length)) {
    // A failed dynamic import stays failed in the browser's module map for the
    // life of the page, so retrying in place cannot succeed. Reload instead
    // (safe in Phase 2: there is no saved progress yet).
    globalThis.location.reload()
    return new Promise<Pools>(() => {})
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
