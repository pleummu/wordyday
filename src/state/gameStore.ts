import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadPools as defaultLoadPools, type Pools } from '../data/wordData'
import { BOARD_CONFIG, type Mode, type WordLength } from '../logic/boards'
import { applyGuessToKeys, type KeyStates } from '../logic/keys'
import { pickAnswer, pickWordubadoAnswer } from '../logic/pickAnswer'
import {
  BOARD_KEYS,
  SAVE_KEY,
  SAVE_VERSION,
  boardKey,
  emptySave,
  gameIdOf,
  maxGameId,
  mergeBoards,
  mergeStats,
  pickStreak,
  type StreakDoc,
  sameGame,
  canForfeit,
  resolveOutcome,
  validateSave,
  type BoardKey,
  type BoardStats,
  type DayStreak,
  type PendingRestore,
  type Restores,
  type SaveDoc,
  type SavedGame,
} from '../logic/save'
import { score, type TileState } from '../logic/score'
import { nextSeq, recordResult } from '../logic/stats'
import {
  check,
  creditDay,
  decline as pureDecline,
  monthOf,
  refill,
  restore as pureRestore,
  restoresLeft,
} from '../logic/streaks'
import {
  ALL_DATA_RESET,
  CORRUPT_TOAST,
  LONG_TOAST_MS,
  STORAGE_FAILED_TOAST,
  TOAST_LIFE_MS,
  dayStreakToast,
  restoreToast,
  NOT_ENOUGH_LETTERS,
  NOT_IN_WORD_LIST,
  OTHER_TAB_TOAST,
  PRAISE,
} from './copy'
import {
  createSaveStorage,
  getLocalStorage,
  type SaveStorage,
  type StorageNotice,
} from './storage'
import { localDateKey } from './clock'
import { readTestAnswer } from './testHook'

export type GameStatus =
  'loading' | 'error' | 'playing' | 'revealing' | 'won' | 'lost' | 'gave-up'
export type DialogName = 'giveUp' | 'newGame' | 'settings' | 'reset' | 'stats'
export type FinishedOutcome = 'won' | 'lost' | 'gave-up' | 'forfeit'

export function isFinished(status: GameStatus): boolean {
  return status === 'won' || status === 'lost' || status === 'gave-up'
}
export type { Mode } from '../logic/boards'
export type Row = { letters: string; states: TileState[] }
export type Toast = {
  id: number
  text: string
  kind: 'error' | 'info'
  lifeMs?: number
}
export type SubmitResult = 'ok' | 'short' | 'invalid' | 'blocked'

export type GameDeps = {
  loadPools: (length: WordLength) => Promise<Pools>
  rng: () => number
  prefersReducedMotion: () => boolean
  setTimer: (fn: () => void, ms: number) => unknown
  storage: SaveStorage
  // The only clock read besides clock.ts; injectable for tests (R-DATE-3).
  now?: () => Date
  // The single "finish game" seam; Phase 5 hangs streaks off it.
  onGameFinished?: (key: BoardKey, outcome: FinishedOutcome) => void
}

export type GameState = {
  mode: Mode
  length: WordLength
  answer: string
  rows: Row[]
  current: string
  status: GameStatus
  keyStates: KeyStates
  toast: Toast | null
  shakeId: number
  shakeRow: number
  pools: Pools | null
  loadToken: number
  gameId: number
  infoOpen: boolean
  dialog: DialogName | null
  boards: Partial<Record<BoardKey, SavedGame>>
  wordubadoInfoSeen: boolean
  stats: Record<BoardKey, BoardStats>
  dayStreak: DayStreak
  restores: Restores
  pendingRestore: PendingRestore | null
  streakRev: number
  // Local calendar day (YYYY-MM-DD) as of the last finish or reset.
  today: string
  // Day Streak value to announce when the reveal ends; transient (D-21).
  dayToastDue: number | null
  finishNote: { won: boolean; winStreak: number; prev: number } | null
  finishedInSession: boolean
  storageOk: boolean
  settingsFocus: 'close' | 'reset'
  // undefined = nothing waiting; null = the other tab reset everything.
  pendingExternal: string | null | undefined
  resume(): Promise<void>
  checkStreaks(): void
  restore(): void
  declineRestore(): void
  openInfo(): void
  closeInfo(): void
  openDialog(name: 'giveUp' | 'newGame'): void
  closeDialog(): void
  openSettings(): void
  openStats(): void
  openReset(): void
  cancelReset(): void
  resetAll(): void
  applyStorageNotice(n: StorageNotice): void
  applyExternal(raw: string | null): void
  giveUp(): void
  forfeitNewGame(): void
  startGame(length: WordLength, mode?: Mode): Promise<void>
  switchBoard(next: { mode?: Mode; length?: WordLength }): void
  playAgain(): void
  retryLoad(): void
  typeLetter(letter: string): void
  backspace(): void
  submit(): SubmitResult
  finishReveal(): void
  dismissToast(id: number): void
}

const REVEAL_BUFFER_MS = 50

export function revealDurationMs(length: WordLength, reduced: boolean): number {
  return reduced ? 150 : (length - 1) * 300 + 500
}

const ATTEMPTS = (length: WordLength) => BOARD_CONFIG[length].attempts

export function isInputBlocked(s: GameState): boolean {
  return s.dialog !== null || s.infoOpen || s.pendingRestore !== null
}

function pickSlice(s: GameState) {
  return {
    dayStreak: s.dayStreak,
    restores: s.restores,
    pendingRestore: s.pendingRestore,
  }
}

// Live view of the active Board as a saved game; null while not started.
function viewToSaved(s: GameState): SavedGame | null {
  const live =
    s.answer !== '' &&
    (s.status === 'playing' ||
      s.status === 'revealing' ||
      s.status === 'won' ||
      s.status === 'lost' ||
      s.status === 'gave-up')
  if (!live) return null
  const guesses = s.rows.map((r) => r.letters)
  const outcome =
    s.status === 'revealing'
      ? resolveOutcome(s.answer, guesses, ATTEMPTS(s.length))
      : (s.status as 'playing' | 'won' | 'lost' | 'gave-up')
  return { answer: s.answer, guesses, outcome, id: s.gameId }
}

function docFromState(s: GameState): SaveDoc {
  const boards: SaveDoc['boards'] = {}
  for (const k of BOARD_KEYS) {
    const g = s.boards[k]
    if (g) boards[k] = g
  }
  const live = viewToSaved(s)
  if (live) boards[boardKey(s.mode, s.length)] = live
  return {
    boards,
    last: { mode: s.mode, length: s.length },
    wordubadoInfoSeen: s.wordubadoInfoSeen,
    stats: s.stats,
    dayStreak: s.dayStreak,
    restores: s.restores,
    pendingRestore: s.pendingRestore,
    streakRev: s.streakRev,
  }
}

function pickFields(s: {
  dayStreak: SaveDoc['dayStreak']
  restores: SaveDoc['restores']
  pendingRestore: SaveDoc['pendingRestore']
  streakRev: number
}): StreakDoc {
  return {
    dayStreak: s.dayStreak,
    restores: s.restores,
    pendingRestore: s.pendingRestore,
    streakRev: s.streakRev,
  }
}

function streakDefaults() {
  const e = emptySave()
  return {
    stats: e.stats,
    dayStreak: e.dayStreak,
    restores: e.restores,
    pendingRestore: e.pendingRestore,
    streakRev: e.streakRev,
  }
}

function mergeDocIntoState(persisted: unknown, current: GameState): GameState {
  const doc = validateSave(persisted) ?? emptySave()
  return {
    ...current,
    boards: doc.boards,
    wordubadoInfoSeen: doc.wordubadoInfoSeen,
    stats: doc.stats,
    dayStreak: doc.dayStreak,
    restores: doc.restores,
    pendingRestore: doc.pendingRestore,
    streakRev: doc.streakRev,
    mode: doc.last.mode,
    length: doc.last.length,
    status: 'loading',
  }
}

export function createGameStore(deps: GameDeps) {
  let toastSeq = 0
  let storageToastShown = false
  let clock = 0
  let resetFloor = -1
  const now = deps.now ?? (() => new Date())

  return create<GameState>()(
    persist(
      (set, get) => {
        // Recorded once per (Board, game id, answer), at submit time (D-21).
        // `extra` rides in the same set so the persisted write never sees a counted
        // game that is still stored as playing.
        function finishGame(
          key: BoardKey,
          outcome: FinishedOutcome,
          extra: Partial<GameState> = {},
        ) {
          const state = get()
          const prevStats = state.stats[key]
          const next = recordResult(prevStats, {
            outcome,
            guesses: state.rows.length,
            id: state.gameId,
            answer: state.answer,
            seq: nextSeq(state.stats),
          })
          if (next === prevStats) {
            if (Object.keys(extra).length > 0) set(extra)
            return
          }
          // R-RESTORE-1: refill first, then credit the local day (D-21: both
          // recorded at submit; the toast waits for the reveal).
          const today = localDateKey(now())
          const refilled = {
            dayStreak: state.dayStreak,
            restores: refill(state.restores, today),
            pendingRestore: state.pendingRestore,
          }
          const { slice, credited } = creditDay(refilled, today)
          const streakChanged = credited || refilled.restores !== state.restores
          set({
            ...extra,
            today,
            ...(streakChanged
              ? { ...slice, streakRev: state.streakRev + 1 }
              : {}),
            ...(credited ? { dayToastDue: slice.dayStreak.current } : {}),
            stats: { ...state.stats, [key]: next },
            finishNote: {
              won: outcome === 'won',
              winStreak: next.winStreak,
              prev: prevStats.winStreak,
            },
          })
          deps.onGameFinished?.(key, outcome)
        }

        function showDueDayToast() {
          const due = get().dayToastDue
          if (due === null) return
          set({
            dayToastDue: null,
            toast: { id: ++toastSeq, text: dayStreakToast(due), kind: 'info' },
          })
        }

        // Reset state: Restores refilled for the current month (R-RESTORE-11).
        function freshToday() {
          const today = localDateKey(now())
          return { today, restores: { month: monthOf(today), used: 0 } }
        }

        // Higher than any id this tab has seen, including during an await.
        function nextGameId(): number {
          clock = Math.max(clock, maxGameId(get().boards), get().gameId) + 1
          return clock
        }

        function autoOpenInfo(prevMode: Mode, nextMode: Mode) {
          if (
            nextMode === 'wordubado' &&
            prevMode !== 'wordubado' &&
            !get().wordubadoInfoSeen
          ) {
            set({ infoOpen: true, wordubadoInfoSeen: true })
          }
        }

        async function loadBoard(): Promise<void> {
          const token = get().loadToken + 1
          const { mode, length } = get()
          const saved = get().boards[boardKey(mode, length)]
          set({
            loadToken: token,
            pendingExternal: undefined,
            status: 'loading',
            rows: [],
            current: '',
            keyStates: {},
            shakeRow: -1,
            finishedInSession: false,
            finishNote: null,
            dayToastDue: null,
            dialog: null,
          })
          if (!saved) {
            await get().startGame(length, mode)
            return
          }
          try {
            const pools = await deps.loadPools(length)
            if (get().loadToken !== token) return
            const rows: Row[] = saved.guesses.map((g) => ({
              letters: g,
              states: score(saved.answer, g),
            }))
            let keyStates: KeyStates = {}
            for (const r of rows) {
              keyStates = applyGuessToKeys(keyStates, r.letters, r.states)
            }
            set({
              pools,
              answer: saved.answer,
              gameId: gameIdOf(saved),
              rows,
              keyStates,
              status: saved.outcome,
            })
          } catch {
            if (get().loadToken !== token) return
            set({ status: 'error' })
          }
        }

        return {
          mode: 'normal',
          length: 5,
          answer: '',
          rows: [],
          current: '',
          status: 'loading',
          keyStates: {},
          toast: null,
          shakeId: 0,
          shakeRow: -1,
          pools: null,
          loadToken: 0,
          gameId: 0,
          infoOpen: false,
          dialog: null,
          boards: {},
          wordubadoInfoSeen: false,
          ...streakDefaults(),
          today: localDateKey(now()),
          dayToastDue: null,
          finishNote: null,
          finishedInSession: false,
          storageOk: deps.storage.isOk(),
          settingsFocus: 'close',
          pendingExternal: undefined,

          async resume() {
            await loadBoard()
          },

          checkStreaks() {
            const state = get()
            const today = localDateKey(now())
            const before = pickSlice(state)
            const r = check(before, today)
            const changed = JSON.stringify(r.slice) !== JSON.stringify(before)
            let stats = state.stats
            if (r.resetWinStreaks) {
              const reset = {} as Record<BoardKey, BoardStats>
              let any = false
              for (const k of BOARD_KEYS) {
                const b = state.stats[k]
                if (b.winStreak > 0) {
                  reset[k] = { ...b, winStreak: 0 }
                  any = true
                } else {
                  reset[k] = b
                }
              }
              if (any) stats = reset
            }
            if (!changed && stats === state.stats && today === state.today) {
              return
            }
            set({
              today,
              stats,
              ...(changed
                ? { ...r.slice, streakRev: state.streakRev + 1 }
                : {}),
              // The prompt wins over every other dialog.
              ...(r.effect === 'prompt'
                ? { dialog: null, infoOpen: false }
                : {}),
            })
          },

          restore() {
            const state = get()
            if (state.pendingRestore === null) return
            const today = localDateKey(now())
            const r = pureRestore(pickSlice(state), today)
            set({
              ...r.slice,
              today,
              streakRev: state.streakRev + 1,
              ...(r.applied
                ? {
                    toast: {
                      id: ++toastSeq,
                      text: restoreToast(restoresLeft(r.slice.restores)),
                      kind: 'info' as const,
                    },
                  }
                : {}),
            })
          },

          declineRestore() {
            const state = get()
            if (state.pendingRestore === null) return
            const today = localDateKey(now())
            set({
              ...pureDecline(pickSlice(state), today),
              today,
              streakRev: state.streakRev + 1,
            })
          },

          openInfo() {
            if (get().pendingRestore !== null) return
            set({ infoOpen: true })
          },

          closeInfo() {
            set({ infoOpen: false })
          },

          openDialog(name) {
            const { dialog, infoOpen, status, rows, length, pendingRestore } =
              get()
            if (dialog !== null || infoOpen || pendingRestore !== null) return
            if (!canForfeit(status, rows.length, ATTEMPTS(length))) return
            set({ dialog: name })
          },

          closeDialog() {
            set({ dialog: null })
          },

          openSettings() {
            const { dialog, infoOpen, pendingRestore } = get()
            if (dialog !== null || infoOpen || pendingRestore !== null) return
            set({ dialog: 'settings', settingsFocus: 'close' })
          },

          openStats() {
            const { dialog, infoOpen, status, pendingRestore } = get()
            if (
              dialog !== null ||
              infoOpen ||
              status === 'revealing' ||
              pendingRestore !== null
            ) {
              return
            }
            set({ dialog: 'stats' })
          },

          openReset() {
            if (get().dialog !== 'settings') return
            set({ dialog: 'reset' })
          },

          cancelReset() {
            if (get().dialog !== 'reset') return
            set({ dialog: 'settings', settingsFocus: 'reset' })
          },

          resetAll() {
            resetFloor = Math.max(clock, maxGameId(get().boards), get().gameId)
            deps.storage.removeItem(SAVE_KEY)
            // The board-less document that follows is the reset itself; other
            // tabs already got the key-removal event.
            set({
              pendingExternal: undefined,
              gameId: 0,
              boards: {},
              wordubadoInfoSeen: false,
              ...streakDefaults(),
              ...freshToday(),
              streakRev: get().streakRev + 1,
              dayToastDue: null,
              finishNote: null,
              dialog: null,
              infoOpen: false,
              mode: 'normal',
              length: 5,
              status: 'loading',
              answer: '',
              rows: [],
              current: '',
            })
            void get().startGame(5, 'normal')
            set({
              toast: { id: ++toastSeq, text: ALL_DATA_RESET, kind: 'info' },
            })
          },

          applyStorageNotice(n) {
            if (n === 'storage-failed') {
              set({ storageOk: false })
              if (!storageToastShown) {
                storageToastShown = true
                set({
                  toast: {
                    id: ++toastSeq,
                    text: STORAGE_FAILED_TOAST,
                    kind: 'info',
                    lifeMs: LONG_TOAST_MS,
                  },
                })
              }
            } else if (n === 'storage-recovered') {
              set({ storageOk: true })
            } else {
              set({
                toast: {
                  id: ++toastSeq,
                  text: CORRUPT_TOAST,
                  kind: 'info',
                  lifeMs: LONG_TOAST_MS,
                },
              })
            }
          },

          // Another tab changed storage. Same validation path as boot; never
          // backs up, never finishes a game, never follows its `last` pointer.
          applyExternal(raw) {
            if (get().status === 'revealing') {
              set({ pendingExternal: raw })
              return
            }
            const read = deps.storage.read(raw)
            if (read === 'invalid' || read === 'newer') return
            const doc = read ?? emptySave()
            const toast = () => ({
              id: ++toastSeq,
              text: OTHER_TAB_TOAST,
              kind: 'info' as const,
            })
            const closeConfirms = (d: DialogName | null) =>
              d === 'giveUp' || d === 'newGame' ? null : d

            // Only a reset starts a fresh game from the outside. Games with an
            // id at or below the highest one seen so far are pre-reset.
            if (raw === null) {
              const s0 = get()
              resetFloor = Math.max(clock, maxGameId(s0.boards), s0.gameId)
              deps.storage.markSeen(raw)
              set({
                boards: {},
                wordubadoInfoSeen: false,
                ...streakDefaults(),
                ...freshToday(),
                streakRev: s0.streakRev + 1,
                dayToastDue: null,
                finishNote: null,
                answer: '',
                rows: [],
                current: '',
                status: 'loading',
                gameId: 0,
                pendingExternal: undefined,
                dialog: closeConfirms(s0.dialog),
              })
              void get().startGame(s0.length, s0.mode)
              set({ toast: toast() })
              return
            }

            // Echo guard: our own write-back of this exact text is deduped.
            deps.storage.markSeen(raw)
            clock = Math.max(clock, maxGameId(doc.boards))
            const state = get()
            const mine = docFromState(state).boards
            const merged = mergeBoards(mine, doc.boards, resetFloor)
            // D-20: counters are picked, never summed; the streak slice
            // follows the copy with the higher streakRev.
            const mergedStats = mergeStats(state.stats, doc.stats, resetFloor)
            const mergedStreak = pickStreak(pickFields(state), pickFields(doc))
            const seen = state.wordubadoInfoSeen || doc.wordubadoInfoSeen
            let changedForMe = seen !== state.wordubadoInfoSeen
            let behindThem = seen !== doc.wordubadoInfoSeen
            for (const k of BOARD_KEYS) {
              if (!sameGame(merged[k], mine[k])) changedForMe = true
              if (!sameGame(merged[k], doc.boards[k])) behindThem = true
            }
            const jm = JSON.stringify([mergedStats, mergedStreak])
            if (jm !== JSON.stringify([state.stats, pickFields(state)])) {
              changedForMe = true
            }
            if (jm !== JSON.stringify([doc.stats, pickFields(doc)])) {
              behindThem = true
            }
            // Nothing to do for either side: no set, so no ping-pong.
            if (!changedForMe && !behindThem) return

            const base = {
              boards: merged,
              wordubadoInfoSeen: seen,
              stats: mergedStats,
              ...mergedStreak,
            }
            const key = boardKey(state.mode, state.length)
            const next = merged[key]
            // We are ahead, or only other Boards changed: one silent set. The
            // persist write carries the merged document to the other tab.
            if (!changedForMe || sameGame(next, mine[key])) {
              set(base)
              return
            }
            // The Board this tab shows changed (next is defined here).
            const loaded =
              state.pools !== null &&
              (state.status === 'playing' || isFinished(state.status))
            if (next && loaded) {
              const rows: Row[] = next.guesses.map((g) => ({
                letters: g,
                states: score(next.answer, g),
              }))
              let keyStates: KeyStates = {}
              for (const r of rows) {
                keyStates = applyGuessToKeys(keyStates, r.letters, r.states)
              }
              set({
                ...base,
                loadToken: state.loadToken + 1,
                pendingExternal: undefined,
                finishNote: null,
                answer: next.answer,
                gameId: gameIdOf(next),
                rows,
                keyStates,
                current: '',
                status: next.outcome,
                finishedInSession: false,
                shakeRow: -1,
                toast: toast(),
                dialog: closeConfirms(state.dialog),
              })
              return
            }
            // Loading or error: clear the live view in the same set so the old
            // answer is not written back, then load the merged Board.
            set({
              ...base,
              answer: '',
              rows: [],
              current: '',
              status: 'loading',
            })
            void loadBoard()
            set({ toast: toast() })
          },

          giveUp() {
            set({ dialog: null })
            const { status, rows, length, mode } = get()
            if (!canForfeit(status, rows.length, ATTEMPTS(length))) return
            set({ status: 'gave-up', finishedInSession: true })
            finishGame(boardKey(mode, length), 'gave-up')
            showDueDayToast()
          },

          forfeitNewGame() {
            set({ dialog: null })
            const { status, rows, length, mode, boards, answer, gameId } = get()
            if (!canForfeit(status, rows.length, ATTEMPTS(length))) return
            // The snapshot is the forfeited game stored as finished so it can
            // never be replayed or re-finished; it is counted here in the same
            // set so no write ever holds a counted game stored as playing.
            finishGame(boardKey(mode, length), 'forfeit', {
              boards: {
                ...boards,
                [boardKey(mode, length)]: {
                  answer,
                  guesses: rows.map((r) => r.letters),
                  outcome: 'gave-up',
                  id: gameId,
                },
              },
              answer: '',
              rows: [],
              current: '',
              status: 'loading',
            })
            const due = get().dayToastDue
            void get().startGame(length, mode)
            if (due !== null) {
              set({
                toast: {
                  id: ++toastSeq,
                  text: dayStreakToast(due),
                  kind: 'info',
                },
              })
            }
          },

          async startGame(length, mode = get().mode) {
            const token = get().loadToken + 1
            const state = get()
            const prev = viewToSaved(state)
            set({
              ...(prev
                ? {
                    boards: {
                      ...state.boards,
                      [boardKey(state.mode, state.length)]: prev,
                    },
                  }
                : {}),
              loadToken: token,
              pendingExternal: undefined,
              mode,
              length,
              status: 'loading',
              rows: [],
              current: '',
              keyStates: {},
              toast: null,
              shakeRow: -1,
              finishedInSession: false,
              finishNote: null,
              dayToastDue: null,
              dialog: null,
            })
            try {
              const pools = await deps.loadPools(length)
              if (get().loadToken !== token) return
              const answer =
                readTestAnswer(length, pools.guesses) ??
                (mode === 'wordubado'
                  ? pickWordubadoAnswer(pools, deps.rng)
                  : pickAnswer(pools.answers, deps.rng))
              set({
                pools,
                answer,
                gameId: nextGameId(),
                status: 'playing',
              })
            } catch {
              if (get().loadToken !== token) return
              set({ status: 'error' })
            }
          },

          switchBoard(next) {
            const state = get()
            const { status, mode, length } = state
            const target = {
              mode: next.mode ?? mode,
              length: next.length ?? length,
            }
            if (status === 'revealing') return
            if (
              target.mode === mode &&
              target.length === length &&
              status !== 'error'
            ) {
              return
            }
            const boards = { ...state.boards }
            const live = viewToSaved(state)
            if (live) boards[boardKey(mode, length)] = live
            set({
              mode: target.mode,
              length: target.length,
              boards,
              status: 'loading',
              answer: '',
              rows: [],
              current: '',
              dialog: null,
            })
            void loadBoard()
            autoOpenInfo(mode, target.mode)
          },

          playAgain() {
            void get().startGame(get().length, get().mode)
          },

          retryLoad() {
            void loadBoard()
          },

          typeLetter(letter) {
            const state = get()
            const { status, current, length } = state
            if (status !== 'playing' || isInputBlocked(state)) return
            if (!/^[a-zA-Z]$/.test(letter)) return
            if (current.length >= length) return
            set({ current: current + letter.toLowerCase() })
          },

          backspace() {
            const state = get()
            const { status, current } = state
            if (status !== 'playing' || isInputBlocked(state)) return
            if (current.length === 0) return
            set({ current: current.slice(0, -1) })
          },

          submit() {
            const { status, current, length, pools, answer, rows, shakeId } =
              get()
            if (status !== 'playing' || pools === null) return 'blocked'
            if (isInputBlocked(get())) return 'blocked'

            const reject = (text: string): SubmitResult => {
              set({
                toast: { id: ++toastSeq, text, kind: 'error' },
                shakeId: shakeId + 1,
                shakeRow: rows.length,
              })
              return text === NOT_ENOUGH_LETTERS ? 'short' : 'invalid'
            }

            if (current.length < length) return reject(NOT_ENOUGH_LETTERS)
            if (current !== answer && !pools.guesses.has(current)) {
              return reject(NOT_IN_WORD_LIST)
            }

            const nextRows = [
              ...rows,
              { letters: current, states: score(answer, current) },
            ]
            set({ rows: nextRows, current: '', status: 'revealing' })
            const outcome = resolveOutcome(
              answer,
              nextRows.map((r) => r.letters),
              ATTEMPTS(length),
            )
            if (outcome !== 'playing') {
              finishGame(boardKey(get().mode, length), outcome)
            }
            const token = get().loadToken
            deps.setTimer(
              () => {
                if (get().loadToken === token) get().finishReveal()
              },
              revealDurationMs(length, deps.prefersReducedMotion()) +
                REVEAL_BUFFER_MS,
            )
            return 'ok'
          },

          finishReveal() {
            const { status, rows, keyStates, length } = get()
            if (status !== 'revealing') return
            const last = rows[rows.length - 1]
            const merged = applyGuessToKeys(
              keyStates,
              last.letters,
              last.states,
            )
            const due = get().dayToastDue
            if (last.states.every((s) => s === 'correct')) {
              set({
                keyStates: merged,
                status: 'won',
                finishedInSession: true,
                toast: {
                  id: ++toastSeq,
                  text: PRAISE[rows.length - 1] ?? PRAISE[PRAISE.length - 1],
                  kind: 'info',
                },
                dayToastDue: null,
              })
              // Queue the Day Streak toast after the praise toast has played.
              if (due !== null) {
                const token = get().loadToken
                deps.setTimer(() => {
                  if (get().loadToken !== token) return
                  set({
                    toast: {
                      id: ++toastSeq,
                      text: dayStreakToast(due),
                      kind: 'info',
                    },
                  })
                }, TOAST_LIFE_MS)
              }
            } else if (rows.length >= BOARD_CONFIG[length].attempts) {
              set({
                keyStates: merged,
                status: 'lost',
                finishedInSession: true,
              })
              showDueDayToast()
            } else {
              set({ keyStates: merged, status: 'playing' })
            }
            const pending = get().pendingExternal
            if (pending !== undefined) {
              set({ pendingExternal: undefined })
              get().applyExternal(pending)
            }
          },

          dismissToast(id) {
            if (get().toast?.id === id) set({ toast: null })
          },
        }
      },
      {
        name: SAVE_KEY,
        version: SAVE_VERSION,
        storage: deps.storage,
        partialize: docFromState,
        merge: mergeDocIntoState,
        // Migrations run in loadSave because the storage adapter always
        // reports SAVE_VERSION; reaching this means that contract broke (IN-01).
        migrate: () => {
          throw new Error(
            'persist.migrate must not run: migrations live in loadSave (MIGRATIONS)',
          )
        },
      },
    ),
  )
}

export const defaultSaveStorage = createSaveStorage(getLocalStorage)

const defaultDeps: GameDeps = {
  loadPools: defaultLoadPools,
  rng: Math.random,
  prefersReducedMotion: () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false,
  setTimer: (fn, ms) => globalThis.setTimeout(fn, ms),
  storage: defaultSaveStorage,
  now: () => new Date(),
}

export const useGameStore = createGameStore(defaultDeps)
