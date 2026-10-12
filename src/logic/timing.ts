import type { WordLength } from './boards.ts'

export const REVEAL_BUFFER_MS = 50

export function revealDurationMs(length: WordLength, reduced: boolean): number {
  return reduced ? 150 : (length - 1) * 300 + 500
}

// Mirrors the .row[data-bounce] keyframes: 400 ms per tile, 100 ms stagger.
export function bounceMs(length: WordLength): number {
  return 400 + (length - 1) * 100
}

export const RESULT_PAUSE_WIN_MS = 400
export const RESULT_PAUSE_LOSS_MS = 600
export const RESULT_PAUSE_REDUCED_MS = 300

// Delay from the end of the reveal until the Result modal opens (D-20, D-23).
export function resultDelayMs(
  outcome: 'won' | 'lost',
  length: WordLength,
  reduced: boolean,
): number {
  if (reduced) return RESULT_PAUSE_REDUCED_MS
  return outcome === 'won'
    ? bounceMs(length) + RESULT_PAUSE_WIN_MS
    : RESULT_PAUSE_LOSS_MS
}
