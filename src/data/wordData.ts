import type { WordLength } from '../logic/boards'

export type RawPools = { answers: string; guesses: string }
export type Pools = {
  answers: readonly string[]
  guesses: ReadonlySet<string>
}

export function toPools(raw: RawPools): Pools {
  const answers = raw.answers.split(' ').filter(Boolean)
  const extra = raw.guesses.split(' ').filter(Boolean)
  return { answers, guesses: new Set([...answers, ...extra]) }
}

// The only place that references words-N.json (one chunk per length, D-12).
const loaders: Record<WordLength, () => Promise<{ default: RawPools }>> = {
  4: () => import('./words-4.json'),
  5: () => import('./words-5.json'),
  6: () => import('./words-6.json'),
}

const cache = new Map<WordLength, Promise<Pools>>()

export function loadPools(length: WordLength): Promise<Pools> {
  const hit = cache.get(length)
  if (hit) return hit
  const promise = loaders[length]()
    .then((mod) => toPools(mod.default))
    .catch((err: unknown) => {
      cache.delete(length)
      throw err
    })
  cache.set(length, promise)
  return promise
}
