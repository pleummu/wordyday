import {
  BOARD_KEYS,
  STAT_CAP,
  boardKey,
  type BoardKey,
  type BoardStats,
} from './save'
import type { Mode } from './boards'

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

export type StatsTab = 4 | 5 | 6 | 'all'

export type StatsView = {
  played: number
  wins: number
  winPct: number | null
  winStreak: number | null
  bestWinStreak: number | null
  gaveUp: number
  dist: number[]
  highlightRow: number | null
  avgGuesses: number | null
}

// Zero-safe view for the Statistics dialog (R-STAT-5): a ratio is null when
// its divisor is 0, never NaN or Infinity.
export function deriveStats(
  stats: Record<BoardKey, BoardStats>,
  mode: Mode,
  tab: StatsTab,
): StatsView {
  let played = 0
  let wins = 0
  let gaveUp = 0
  let dist: number[]
  let winStreak: number | null
  let bestWinStreak: number | null
  let highlightRow: number | null = null
  if (tab === 'all') {
    dist = new Array<number>(7).fill(0)
    winStreak = null
    bestWinStreak = null
    let bestSeq = -1
    for (const n of [4, 5, 6] as const) {
      const b = stats[boardKey(mode, n)]
      played += b.played
      wins += b.wins
      gaveUp += b.gaveUp
      b.dist.forEach((c, i) => {
        dist[i] += c
      })
      if (b.last && b.last.won && b.last.seq > bestSeq) {
        bestSeq = b.last.seq
        highlightRow = b.last.guesses
      }
    }
  } else {
    const b = stats[boardKey(mode, tab)]
    played = b.played
    wins = b.wins
    gaveUp = b.gaveUp
    dist = b.dist.slice()
    winStreak = b.winStreak
    bestWinStreak = b.bestWinStreak
    highlightRow = b.last && b.last.won ? b.last.guesses : null
  }
  let total = 0
  let sum = 0
  dist.forEach((c, i) => {
    total += c
    sum += c * (i + 1)
  })
  return {
    played,
    wins,
    winPct: played > 0 ? Math.round((wins / played) * 100) : null,
    winStreak,
    bestWinStreak,
    gaveUp,
    dist,
    highlightRow,
    avgGuesses: total > 0 ? sum / total : null,
  }
}
