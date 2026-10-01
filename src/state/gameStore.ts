import { create } from 'zustand'
import { loadPools as defaultLoadPools, type Pools } from '../data/wordData'
import { BOARD_CONFIG, type WordLength } from '../logic/boards'
import { applyGuessToKeys, type KeyStates } from '../logic/keys'
import { pickAnswer } from '../logic/pickAnswer'
import { score, type TileState } from '../logic/score'
import { NOT_ENOUGH_LETTERS, NOT_IN_WORD_LIST, PRAISE } from './copy'
import { readTestAnswer } from './testHook'

export type GameStatus =
  'loading' | 'error' | 'playing' | 'revealing' | 'won' | 'lost'
export type Row = { letters: string; states: TileState[] }
export type Toast = { id: number; text: string; kind: 'error' | 'info' }
export type SubmitResult = 'ok' | 'short' | 'invalid' | 'blocked'

export type GameDeps = {
  loadPools: (length: WordLength) => Promise<Pools>
  rng: () => number
  prefersReducedMotion: () => boolean
  setTimer: (fn: () => void, ms: number) => unknown
}

export type GameState = {
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
  startGame(length: WordLength): Promise<void>
  selectLength(length: WordLength): void
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

export function createGameStore(deps: GameDeps) {
  let toastSeq = 0

  return create<GameState>()((set, get) => ({
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

    async startGame(length) {
      const token = get().loadToken + 1
      set({
        loadToken: token,
        length,
        status: 'loading',
        rows: [],
        current: '',
        keyStates: {},
        toast: null,
        shakeRow: -1,
      })
      try {
        const pools = await deps.loadPools(length)
        if (get().loadToken !== token) return
        const answer =
          readTestAnswer(length, pools.guesses) ??
          pickAnswer(pools.answers, deps.rng)
        set({ pools, answer, status: 'playing' })
      } catch {
        if (get().loadToken !== token) return
        set({ status: 'error' })
      }
    },

    selectLength(length) {
      const { status, length: active } = get()
      if (status === 'revealing') return
      if (length === active && status !== 'error') return
      void get().startGame(length)
    },

    playAgain() {
      void get().startGame(get().length)
    },

    retryLoad() {
      void get().startGame(get().length)
    },

    typeLetter(letter) {
      const { status, current, length } = get()
      if (status !== 'playing') return
      if (!/^[a-zA-Z]$/.test(letter)) return
      if (current.length >= length) return
      set({ current: current + letter.toLowerCase() })
    },

    backspace() {
      const { status, current } = get()
      if (status !== 'playing' || current.length === 0) return
      set({ current: current.slice(0, -1) })
    },

    submit() {
      const { status, current, length, pools, answer, rows, shakeId } = get()
      if (status !== 'playing' || pools === null) return 'blocked'

      const reject = (text: string): SubmitResult => {
        set({
          toast: { id: ++toastSeq, text, kind: 'error' },
          shakeId: shakeId + 1,
          shakeRow: rows.length,
        })
        return text === NOT_ENOUGH_LETTERS ? 'short' : 'invalid'
      }

      if (current.length < length) return reject(NOT_ENOUGH_LETTERS)
      if (!pools.guesses.has(current)) return reject(NOT_IN_WORD_LIST)

      set({
        rows: [...rows, { letters: current, states: score(answer, current) }],
        current: '',
        status: 'revealing',
      })
      deps.setTimer(
        () => get().finishReveal(),
        revealDurationMs(length, deps.prefersReducedMotion()) +
          REVEAL_BUFFER_MS,
      )
      return 'ok'
    },

    finishReveal() {
      const { status, rows, keyStates, length } = get()
      if (status !== 'revealing') return
      const last = rows[rows.length - 1]
      const merged = applyGuessToKeys(keyStates, last.letters, last.states)
      if (last.states.every((s) => s === 'correct')) {
        set({
          keyStates: merged,
          status: 'won',
          toast: {
            id: ++toastSeq,
            text: PRAISE[rows.length - 1] ?? PRAISE[PRAISE.length - 1],
            kind: 'info',
          },
        })
      } else if (rows.length >= BOARD_CONFIG[length].attempts) {
        set({ keyStates: merged, status: 'lost' })
      } else {
        set({ keyStates: merged, status: 'playing' })
      }
    },

    dismissToast(id) {
      if (get().toast?.id === id) set({ toast: null })
    },
  }))
}

const defaultDeps: GameDeps = {
  loadPools: defaultLoadPools,
  rng: Math.random,
  prefersReducedMotion: () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false,
  setTimer: (fn, ms) => globalThis.setTimeout(fn, ms),
}

export const useGameStore = createGameStore(defaultDeps)
