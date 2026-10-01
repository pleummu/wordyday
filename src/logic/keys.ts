import type { TileState } from './score'

export type KeyStates = Partial<Record<string, TileState>>

const RANK: Record<TileState, number> = { absent: 1, present: 2, correct: 3 }

export function mergeKeyState(
  prev: TileState | undefined,
  next: TileState,
): TileState {
  if (prev === undefined) return next
  return RANK[next] > RANK[prev] ? next : prev
}

export function applyGuessToKeys(
  keys: KeyStates,
  letters: string,
  states: readonly TileState[],
): KeyStates {
  const result: KeyStates = { ...keys }
  for (let i = 0; i < letters.length; i++) {
    result[letters[i]] = mergeKeyState(result[letters[i]], states[i])
  }
  return result
}
