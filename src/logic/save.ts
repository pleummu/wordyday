import { BOARD_CONFIG, type Mode, type WordLength } from './boards'

export const SAVE_VERSION = 1
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

// Phase 5 adds dayStreak, restores, pendingRestore and boards[k].winStreak
// through a v1 -> v2 migration.
export type SaveDoc = {
  boards: Partial<Record<BoardKey, SavedGame>>
  last: { mode: Mode; length: WordLength }
  wordubadoInfoSeen: boolean
}

export function emptySave(): SaveDoc {
  return {
    boards: {},
    last: { mode: 'normal', length: 5 },
    wordubadoInfoSeen: false,
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

export const MIGRATIONS: Readonly<Record<number, (s: unknown) => unknown>> = {}

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
    if (!game) return null
    out[key] = game
  }
  return {
    boards: out,
    last: { mode: last.mode, length: last.length },
    wordubadoInfoSeen,
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
