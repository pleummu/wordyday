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
  migrateSave,
  canForfeit,
  resolveOutcome,
  validateSave,
  type BoardKey,
  type SaveDoc,
  type SavedGame,
} from '../logic/save'
import { score, type TileState } from '../logic/score'
import {
  ALL_DATA_RESET,
  NOT_ENOUGH_LETTERS,
  NOT_IN_WORD_LIST,
  PRAISE,
} from './copy'
import {
  createSaveStorage,
  getLocalStorage,
  type SaveStorage,
  type StorageNotice,
} from './storage'
import { readTestAnswer } from './testHook'

export type GameStatus =
  'loading' | 'error' | 'playing' | 'revealing' | 'won' | 'lost' | 'gave-up'
export type DialogName = 'giveUp' | 'newGame' | 'settings' | 'reset'
export type FinishedOutcome = 'won' | 'lost' | 'gave-up' | 'forfeit'

export function isFinished(status: GameStatus): boolean {
  return status === 'won' || status === 'lost' || status === 'gave-up'
}
export type { Mode } from '../logic/boards'
export type Row = { letters: string; states: TileState[] }
export type Toast = { id: number; text: string; kind: 'error' | 'info' }
export type SubmitResult = 'ok' | 'short' | 'invalid' | 'blocked'

export type GameDeps = {
  loadPools: (length: WordLength) => Promise<Pools>
  rng: () => number
  prefersReducedMotion: () => boolean
  setTimer: (fn: () => void, ms: number) => unknown
  storage: SaveStorage
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
  infoOpen: boolean
  dialog: DialogName | null
  boards: Partial<Record<BoardKey, SavedGame>>
  wordubadoInfoSeen: boolean
  finishedInSession: boolean
  storageOk: boolean
  settingsFocus: 'close' | 'reset'
  resume(): Promise<void>
  openInfo(): void
  closeInfo(): void
  openDialog(name: 'giveUp' | 'newGame'): void
  closeDialog(): void
  openSettings(): void
  openReset(): void
  cancelReset(): void
  resetAll(): void
  applyStorageNotice(n: StorageNotice): void
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
  return s.dialog !== null || s.infoOpen
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
  return { answer: s.answer, guesses, outcome }
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
  }
}

function mergeDocIntoState(persisted: unknown, current: GameState): GameState {
  const doc = validateSave(persisted) ?? emptySave()
  return {
    ...current,
    boards: doc.boards,
    wordubadoInfoSeen: doc.wordubadoInfoSeen,
    mode: doc.last.mode,
    length: doc.last.length,
    status: 'loading',
  }
}

export function createGameStore(deps: GameDeps) {
  let toastSeq = 0

  return create<GameState>()(
    persist(
      (set, get) => {
        function finishGame(key: BoardKey, outcome: FinishedOutcome) {
          deps.onGameFinished?.(key, outcome)
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
            status: 'loading',
            rows: [],
            current: '',
            keyStates: {},
            shakeRow: -1,
            finishedInSession: false,
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
          infoOpen: false,
          dialog: null,
          boards: {},
          wordubadoInfoSeen: false,
          finishedInSession: false,
          storageOk: deps.storage.isOk(),
          settingsFocus: 'close',

          async resume() {
            await loadBoard()
          },

          openInfo() {
            set({ infoOpen: true })
          },

          closeInfo() {
            set({ infoOpen: false })
          },

          openDialog(name) {
            const { dialog, infoOpen, status, rows, length } = get()
            if (dialog !== null || infoOpen) return
            if (!canForfeit(status, rows.length, ATTEMPTS(length))) return
            set({ dialog: name })
          },

          closeDialog() {
            set({ dialog: null })
          },

          openSettings() {
            const { dialog, infoOpen } = get()
            if (dialog !== null || infoOpen) return
            set({ dialog: 'settings', settingsFocus: 'close' })
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
            deps.storage.removeItem(SAVE_KEY)
            set({
              boards: {},
              wordubadoInfoSeen: false,
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
            if (n === 'storage-failed') set({ storageOk: false })
            else if (n === 'storage-recovered') set({ storageOk: true })
          },

          giveUp() {
            set({ dialog: null })
            const { status, rows, length, mode } = get()
            if (!canForfeit(status, rows.length, ATTEMPTS(length))) return
            set({ status: 'gave-up', finishedInSession: true })
            finishGame(boardKey(mode, length), 'gave-up')
          },

          forfeitNewGame() {
            set({ dialog: null })
            const { status, rows, length, mode, boards } = get()
            if (!canForfeit(status, rows.length, ATTEMPTS(length))) return
            finishGame(boardKey(mode, length), 'forfeit')
            const rest = { ...boards }
            delete rest[boardKey(mode, length)]
            set({ boards: rest })
            void get().startGame(length, mode)
          },

          async startGame(length, mode = get().mode) {
            const token = get().loadToken + 1
            set({
              loadToken: token,
              mode,
              length,
              status: 'loading',
              rows: [],
              current: '',
              keyStates: {},
              toast: null,
              shakeRow: -1,
              finishedInSession: false,
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
              set({ pools, answer, status: 'playing' })
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
              })
            } else if (rows.length >= BOARD_CONFIG[length].attempts) {
              set({
                keyStates: merged,
                status: 'lost',
                finishedInSession: true,
              })
            } else {
              set({ keyStates: merged, status: 'playing' })
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
        migrate: (p, v) => migrateSave(p, v) as SaveDoc,
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
}

export const useGameStore = createGameStore(defaultDeps)
