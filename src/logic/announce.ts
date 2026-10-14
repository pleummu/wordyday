import type { TileState } from './score'
import { gaveUpLine, lostLine, triesLeftLine, wonLine } from '../state/copy'

export type AnnounceEnd =
  | { kind: 'playing'; triesLeft: number }
  | { kind: 'won'; attempts: number }
  | { kind: 'lost'; answer: string }

export function guessAnnouncement(
  word: string,
  states: readonly TileState[],
  end: AnnounceEnd,
): string {
  const letters = [...word.toUpperCase()]
    .map((l, i) => `${l} ${states[i]}`)
    .join(', ')
  const tail =
    end.kind === 'won'
      ? wonLine(end.attempts)
      : end.kind === 'lost'
        ? lostLine(end.answer)
        : triesLeftLine(end.triesLeft)
  return `${word.toUpperCase()}: ${letters}. ${tail}`
}

export function giveUpAnnouncement(answer: string): string {
  return gaveUpLine(answer)
}
