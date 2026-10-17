import { BOARD_CONFIG, type Mode, type WordLength } from './boards'

export const SAVE_VERSION = 4
export type Theme = 'system' | 'light' | 'dark'
export const SAVE_KEY = 'unlimited-wordle'
// Backup key for an unreadable document is SAVE_KEY + CORRUPT_SUFFIX.
export const CORRUPT_SUFFIX = ':corrupt'

export type BoardKey = `${Mode}-${WordLength}`

export const BOARD_KEYS = [
  'normal-4',
  'normal-5',
  'normal-6',
  'wordubado-4',
  'wordubado-5',
  'wordubado-6',
] as const satisfies readonly BoardKey[]

export function boardKey(mode: Mode, length: WordLength): BoardKey {
  return `${mode}-${length}`
}

export type Outcome = 'playing' | 'won' | 'lost' | 'gave-up'

// Only the facts are stored; row states and key states are recomputed on restore.
export type SavedGame = {
  answer: string
  guesses: string[]
  outcome: Outcome
  // Optional game id (per-tab Lamport-style counter); absent reads as 0.
  id?: number
}

export const STAT_CAP = 1_000_000_000

// Running counters per Board, not a game history (D-19).
export type BoardStats = {
  played: number
  wins: number
  gaveUp: number
  dist: number[]
  winStreak: number
  bestWinStreak: number
  last: { won: boolean; guesses: number; seq: number } | null
  lastCounted: { id: number; answer: string } | null
}

export type DayStreak = {
  current: number
  longest: number
  lastActiveDate: string | null
}

// month is '' (never refilled yet) or 'YYYY-MM'.
export type Restores = { month: string; used: number }

export type PendingRestore = {
  streak: number
  missed: number
  // The day a game finished while the offer was open; credited on answer.
  creditDate: string | null
}

export type SaveDoc = {
  boards: Partial<Record<BoardKey, SavedGame>>
  last: { mode: Mode; length: WordLength }
  wordubadoInfoSeen: boolean
  stats: Record<BoardKey, BoardStats>
  dayStreak: DayStreak
  restores: Restores
  pendingRestore: PendingRestore | null
  streakRev: number
  theme: Theme
  colourBlind: boolean
  howToPlaySeen: boolean
}

function lengthOfKey(key: BoardKey): WordLength {
  return Number(key.split('-')[1]) as WordLength
}

export function emptyBoardStats(key: BoardKey): BoardStats {
  return {
    played: 0,
    wins: 0,
    gaveUp: 0,
    dist: new Array<number>(BOARD_CONFIG[lengthOfKey(key)].attempts).fill(0),
    winStreak: 0,
    bestWinStreak: 0,
    last: null,
    lastCounted: null,
  }
}

export function emptyStats(): Record<BoardKey, BoardStats> {
  const out = {} as Record<BoardKey, BoardStats>
  for (const k of BOARD_KEYS) out[k] = emptyBoardStats(k)
  return out
}

export function emptyDayStreak(): DayStreak {
  return { current: 0, longest: 0, lastActiveDate: null }
}

export function emptySave(): SaveDoc {
  return {
    boards: {},
    last: { mode: 'normal', length: 5 },
    wordubadoInfoSeen: false,
    stats: emptyStats(),
    dayStreak: emptyDayStreak(),
    restores: { month: '', used: 0 },
    pendingRestore: null,
    streakRev: 0,
    theme: 'system',
    colourBlind: false,
    howToPlaySeen: false,
  }
}

export function resolveOutcome(
  answer: string,
  guesses: readonly string[],
  attempts: number,
): 'playing' | 'won' | 'lost' {
  if (guesses.length > 0 && guesses[guesses.length - 1] === answer) return 'won'
  if (guesses.length >= attempts) return 'lost'
  return 'playing'
}

export function canForfeit(
  status: string,
  attemptsUsed: number,
  maxAttempts: number,
): boolean {
  return (
    status === 'playing' && attemptsUsed > 0 && attemptsUsed === maxAttempts - 2
  )
}

// v1 -> v2: add the Phase 5 slices, all at zero. Boards, last and the info flag
// are untouched. v2 -> v3: add the Phase 7 appearance and How-to-play flag, so
// existing players see How-to-play once. v3 -> v4: the deferred credit flag
// becomes the play date; the offer day (lastActiveDate + missed + 1) is the
// earliest day the game can have finished. A non-object is returned as is so validation rejects it.
export const MIGRATIONS: Readonly<Record<number, (s: unknown) => unknown>> = {
  1: (s) => {
    if (typeof s !== 'object' || s === null || Array.isArray(s)) return s
    const e = emptySave()
    return {
      ...(s as Record<string, unknown>),
      stats: e.stats,
      dayStreak: e.dayStreak,
      restores: e.restores,
      pendingRestore: e.pendingRestore,
      streakRev: e.streakRev,
    }
  },
  2: (s) => {
    if (typeof s !== 'object' || s === null || Array.isArray(s)) return s
    return {
      ...(s as Record<string, unknown>),
      theme: 'system',
      colourBlind: false,
      howToPlaySeen: false,
    }
  },
  3: (s) => {
    if (typeof s !== 'object' || s === null || Array.isArray(s)) return s
    const doc = s as Record<string, unknown>
    const p = doc.pendingRestore
    if (typeof p !== 'object' || p === null || Array.isArray(p)) return s
    const { creditDeferred, ...rest } = p as Record<string, unknown>
    const ds = doc.dayStreak as { lastActiveDate?: unknown } | null
    const lad = ds?.lastActiveDate
    const creditDate =
      creditDeferred === true && typeof lad === 'string' && DATE_RE.test(lad)
        ? offerDay(lad, rest.missed)
        : null
    return { ...doc, pendingRestore: { ...rest, creditDate } }
  },
}

function offerDay(lad: string, missed: unknown): string | null {
  if (typeof missed !== 'number' || !Number.isInteger(missed)) return null
  const [y, m, d] = lad.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + missed + 1)).toISOString().slice(0, 10)
}

export function migrateSave(
  state: unknown,
  from: number,
  to: number = SAVE_VERSION,
  steps: Readonly<Record<number, (s: unknown) => unknown>> = MIGRATIONS,
): unknown {
  if (from < 1) throw new Error('unsupported save version ' + from)
  let s = state
  for (let v = from; v < to; v++) {
    const step = steps[v]
    if (!step) throw new Error('no migration from v' + v)
    s = step(s)
  }
  return s
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function has(o: Record<string, unknown>, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k)
}

function isLength(x: unknown): x is WordLength {
  return x === 4 || x === 5 || x === 6
}

function isMode(x: unknown): x is Mode {
  return x === 'normal' || x === 'wordubado'
}

function validateGame(x: unknown, length: WordLength): SavedGame | null {
  if (!isObject(x)) return null
  const { answer, guesses, outcome } = x
  const attempts = BOARD_CONFIG[length].attempts
  if (typeof answer !== 'string' || !/^[a-z]+$/.test(answer)) return null
  if (answer.length !== length) return null
  if (!Array.isArray(guesses) || guesses.length > attempts) return null
  const clean: string[] = []
  for (const g of guesses as unknown[]) {
    if (typeof g !== 'string' || g.length !== length || !/^[a-z]+$/.test(g)) {
      return null
    }
    clean.push(g)
  }
  const hasAnswer = clean.includes(answer)
  switch (outcome) {
    case 'won':
      if (clean.length === 0 || clean[clean.length - 1] !== answer) return null
      break
    case 'playing':
      if (hasAnswer || clean.length >= attempts) return null
      break
    case 'lost':
      if (hasAnswer || clean.length < attempts) return null
      break
    case 'gave-up':
      if (hasAnswer || clean.length >= attempts) return null
      break
    default:
      return null
  }
  if (has(x, 'id')) {
    const id = x.id
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) {
      return null
    }
    return { answer, guesses: clean, outcome, id }
  }
  return { answer, guesses: clean, outcome }
}

export function gameIdOf(g: SavedGame): number {
  return g.id ?? 0
}

export function sameGame(
  a: SavedGame | undefined,
  b: SavedGame | undefined,
): boolean {
  if (!a || !b) return !a && !b
  return (
    a.answer === b.answer &&
    a.outcome === b.outcome &&
    a.guesses.join(',') === b.guesses.join(',') &&
    gameIdOf(a) === gameIdOf(b)
  )
}

export function maxGameId(boards: SaveDoc['boards']): number {
  let max = 0
  for (const key of BOARD_KEYS) {
    const g = boards[key]
    if (g) max = Math.max(max, gameIdOf(g))
  }
  return max
}

// Total order, so pickGame(a, b) equals pickGame(b, a): two tabs merging each
// other's documents must end on the same game without talking to each other.
// 1. higher id; 2. same answer: finished beats playing, then more guesses;
// 3. different answers: lower answer; 4. lower outcome:guesses string.
export function pickGame(a: SavedGame, b: SavedGame): SavedGame {
  const ia = gameIdOf(a)
  const ib = gameIdOf(b)
  if (ia !== ib) return ia > ib ? a : b
  if (a.answer === b.answer) {
    const fa = a.outcome !== 'playing'
    const fb = b.outcome !== 'playing'
    if (fa !== fb) return fa ? a : b
    if (a.guesses.length !== b.guesses.length) {
      return a.guesses.length > b.guesses.length ? a : b
    }
  } else {
    return a.answer < b.answer ? a : b
  }
  const ka = a.outcome + ':' + a.guesses.join(',')
  const kb = b.outcome + ':' + b.guesses.join(',')
  return kb < ka ? b : a
}

export function mergeBoard(
  mine: SavedGame | undefined,
  theirs: SavedGame | undefined,
  floor = -1,
): SavedGame | undefined {
  const t = theirs && gameIdOf(theirs) > floor ? theirs : undefined
  if (!t) return mine
  if (!mine) return t
  return pickGame(mine, t)
}

export function mergeBoards(
  mine: SaveDoc['boards'],
  theirs: SaveDoc['boards'],
  floor = -1,
): SaveDoc['boards'] {
  const out: SaveDoc['boards'] = {}
  for (const key of BOARD_KEYS) {
    const merged = mergeBoard(mine[key], theirs[key], floor)
    if (merged) out[key] = merged
  }
  return out
}

// Counters are picked, never summed: adding two copies of the same finish
// would double-count it. Total order, so mergeBoardStats(a, b) equals
// mergeBoardStats(b, a): 1. higher played; 2. lower winStreak (a missed-day
// reset in one tab is never undone by the other); 3. smaller JSON.stringify.
export function mergeBoardStats(a: BoardStats, b: BoardStats): BoardStats {
  if (a.played !== b.played) return a.played > b.played ? a : b
  if (a.winStreak !== b.winStreak) return a.winStreak < b.winStreak ? a : b
  return JSON.stringify(b) < JSON.stringify(a) ? b : a
}

// Per Board pick-one merge. A copy whose last counted game is at or below the
// reset floor is pre-reset and is ignored.
export function mergeStats(
  mine: Record<BoardKey, BoardStats>,
  theirs: Record<BoardKey, BoardStats>,
  floor = -1,
): Record<BoardKey, BoardStats> {
  const out = {} as Record<BoardKey, BoardStats>
  for (const k of BOARD_KEYS) {
    const t = theirs[k]
    const stale = t.lastCounted !== null && t.lastCounted.id <= floor
    out[k] = stale ? mine[k] : mergeBoardStats(mine[k], t)
  }
  return out
}

export type StreakDoc = Pick<
  SaveDoc,
  'dayStreak' | 'restores' | 'pendingRestore' | 'streakRev'
>

// The Day Streak slice moves as one unit. Total order: 1. higher streakRev;
// 2. smaller JSON.stringify. Every change to the slice bumps streakRev.
export function pickStreak(a: StreakDoc, b: StreakDoc): StreakDoc {
  if (a.streakRev !== b.streakRev) return a.streakRev > b.streakRev ? a : b
  return JSON.stringify(b) < JSON.stringify(a) ? b : a
}

function isCount(x: unknown, max = STAT_CAP): x is number {
  return typeof x === 'number' && Number.isSafeInteger(x) && x >= 0 && x <= max
}

function validateBoardStats(x: unknown, key: BoardKey): BoardStats {
  const fallback = emptyBoardStats(key)
  if (!isObject(x)) return fallback
  const length = lengthOfKey(key)
  const attempts = BOARD_CONFIG[length].attempts
  const { played, wins, gaveUp, dist, winStreak, bestWinStreak } = x
  if (
    !isCount(played) ||
    !isCount(wins) ||
    !isCount(gaveUp) ||
    !isCount(winStreak) ||
    !isCount(bestWinStreak) ||
    wins > played
  ) {
    return fallback
  }
  if (!Array.isArray(dist) || dist.length !== attempts) return fallback
  if (!(dist as unknown[]).every((d) => isCount(d))) return fallback
  let last: BoardStats['last'] = null
  if (x.last !== null) {
    const l = x.last
    if (
      !isObject(l) ||
      typeof l.won !== 'boolean' ||
      !isCount(l.guesses, attempts) ||
      l.guesses < 1 ||
      !isCount(l.seq)
    ) {
      return fallback
    }
    last = { won: l.won, guesses: l.guesses, seq: l.seq }
  }
  let lastCounted: BoardStats['lastCounted'] = null
  if (x.lastCounted !== null) {
    const c = x.lastCounted
    if (
      !isObject(c) ||
      !isCount(c.id) ||
      typeof c.answer !== 'string' ||
      c.answer.length !== length ||
      !/^[a-z]+$/.test(c.answer)
    ) {
      return fallback
    }
    lastCounted = { id: c.id, answer: c.answer }
  }
  return {
    played,
    wins,
    gaveUp,
    dist: [...(dist as number[])],
    winStreak,
    bestWinStreak,
    last,
    lastCounted,
  }
}

function validateStats(x: unknown): Record<BoardKey, BoardStats> {
  const out = {} as Record<BoardKey, BoardStats>
  const src = isObject(x) ? x : {}
  for (const k of BOARD_KEYS) {
    out[k] = validateBoardStats(has(src, k) ? src[k] : null, k)
  }
  return out
}

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function validateDayStreak(x: unknown): DayStreak {
  if (!isObject(x)) return emptyDayStreak()
  const { current, longest, lastActiveDate } = x
  if (!isCount(current) || !isCount(longest)) return emptyDayStreak()
  if (lastActiveDate !== null) {
    if (typeof lastActiveDate !== 'string' || !DATE_RE.test(lastActiveDate)) {
      return emptyDayStreak()
    }
  }
  return { current, longest, lastActiveDate }
}

function validateRestores(x: unknown): Restores {
  const fallback = { month: '', used: 0 }
  if (!isObject(x)) return fallback
  const { month, used } = x
  if (typeof month !== 'string' || (month !== '' && !MONTH_RE.test(month))) {
    return fallback
  }
  if (typeof used !== 'number' || !Number.isInteger(used)) return fallback
  return { month, used: Math.min(3, Math.max(0, used)) }
}

function validatePending(x: unknown): PendingRestore | null {
  if (!isObject(x)) return null
  const { streak, missed, creditDate } = x
  if (
    !isCount(streak) ||
    streak < 1 ||
    !isCount(missed, 4) ||
    missed < 1 ||
    !(
      creditDate === null ||
      (typeof creditDate === 'string' && DATE_RE.test(creditDate))
    )
  ) {
    return null
  }
  return { streak, missed, creditDate }
}

export function validateSave(x: unknown): SaveDoc | null {
  if (!isObject(x)) return null
  const { boards, last, wordubadoInfoSeen } = x
  if (!isObject(boards)) return null
  if (!isObject(last)) return null
  if (typeof wordubadoInfoSeen !== 'boolean') return null
  if (!isMode(last.mode) || !isLength(last.length)) return null

  // Reject any own key that is not one of the six Boards (includes __proto__).
  for (const k of Object.getOwnPropertyNames(boards)) {
    if (!(BOARD_KEYS as readonly string[]).includes(k)) return null
  }

  const out: SaveDoc['boards'] = {}
  for (const key of BOARD_KEYS) {
    if (!has(boards, key)) continue
    const length = Number(key.split('-')[1]) as WordLength
    const game = validateGame(boards[key], length)
    // WR-03: one malformed Board is skipped; the other Boards are kept.
    if (!game) continue
    out[key] = game
  }
  return {
    boards: out,
    last: { mode: last.mode, length: last.length },
    wordubadoInfoSeen,
    stats: validateStats(x.stats),
    dayStreak: validateDayStreak(x.dayStreak),
    restores: validateRestores(x.restores),
    pendingRestore: validatePending(x.pendingRestore),
    streakRev: isCount(x.streakRev) ? x.streakRev : 0,
    theme: x.theme === 'light' || x.theme === 'dark' ? x.theme : 'system',
    colourBlind: x.colourBlind === true,
    howToPlaySeen: x.howToPlaySeen === true,
  }
}

export type LoadResult =
  { ok: true; doc: SaveDoc } | { ok: false; reason: 'invalid' | 'newer' }

// 'newer' (written by a later build) must never be backed up or overwritten (CR-01).
export function loadSave(raw: string): LoadResult {
  try {
    const env: unknown = JSON.parse(raw)
    if (!isObject(env)) return { ok: false, reason: 'invalid' }
    const { version, state } = env
    if (typeof version === 'number' && Number.isInteger(version)) {
      if (version > SAVE_VERSION) return { ok: false, reason: 'newer' }
    }
    if (
      typeof version !== 'number' ||
      !Number.isInteger(version) ||
      version < 1 ||
      !isObject(state)
    ) {
      return { ok: false, reason: 'invalid' }
    }
    const doc = validateSave(migrateSave(state, version))
    return doc ? { ok: true, doc } : { ok: false, reason: 'invalid' }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}
