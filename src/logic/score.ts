export type TileState = 'correct' | 'present' | 'absent'

export function score(answer: string, guess: string): TileState[] {
  const result: TileState[] = Array.from(
    { length: guess.length },
    () => 'absent',
  )
  const counts: Record<string, number> = {}

  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct'
    } else {
      counts[answer[i]] = (counts[answer[i]] ?? 0) + 1
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue
    if ((counts[guess[i]] ?? 0) > 0) {
      result[i] = 'present'
      counts[guess[i]]--
    }
  }

  return result
}
