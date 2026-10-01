import type { WordLength } from '../logic/boards'

export function readTestAnswer(
  length: WordLength,
  guesses: ReadonlySet<string>,
): string | undefined {
  const word = globalThis.__WORDLE_TEST__?.answers?.[length]?.toLowerCase()
  return word !== undefined && guesses.has(word) ? word : undefined
}
