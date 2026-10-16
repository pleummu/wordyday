import type { WordLength } from '../logic/boards'

export function readTestAnswer(
  length: WordLength,
  guesses: ReadonlySet<string>,
): string | undefined {
  // Build-time gate: production builds fold this to a plain return, so the
  // console cannot fix the answer (WR-01).
  if (import.meta.env.MODE !== 'e2e' && import.meta.env.MODE !== 'test')
    return undefined
  const word = globalThis.__WORDLE_TEST__?.answers?.[length]?.toLowerCase()
  return word !== undefined && guesses.has(word) ? word : undefined
}
