import { BOARD_KEYS, STAT_CAP, type BoardKey, type BoardStats } from './save'

export type FinishedOutcomeLike = 'won' | 'lost' | 'gave-up' | 'forfeit'

export type FinishRecord = {
  outcome: FinishedOutcomeLike
  guesses: number
  id: number
  answer: string
  seq: number
}

const bump = (n: number) => Math.min(STAT_CAP, n + 1)

// Pure. Returns the same object when this exact game was already counted
// (ledger equality on id and answer, D-20).
export function recordResult(s: BoardStats, r: FinishRecord): BoardStats {
  if (
    s.lastCounted &&
    s.lastCounted.id === r.id &&
    s.lastCounted.answer === r.answer
  ) {
    return s
  }
  const won = r.outcome === 'won'
  const dist = s.dist.slice()
  if (won && r.guesses >= 1 && r.guesses <= dist.length) {
    dist[r.guesses - 1] = bump(dist[r.guesses - 1])
  }
  const winStreak = won ? bump(s.winStreak) : 0
  return {
    played: bump(s.played),
    wins: won ? bump(s.wins) : s.wins,
    gaveUp:
      r.outcome === 'gave-up' || r.outcome === 'forfeit'
        ? bump(s.gaveUp)
        : s.gaveUp,
    dist,
    winStreak,
    bestWinStreak: Math.max(s.bestWinStreak, winStreak),
    last: { won, guesses: r.guesses, seq: r.seq },
    lastCounted: { id: r.id, answer: r.answer },
  }
}

export function nextSeq(stats: Record<BoardKey, BoardStats>): number {
  let max = 0
  for (const k of BOARD_KEYS) {
    const l = stats[k].last
    if (l) max = Math.max(max, l.seq)
  }
  return max + 1
}
