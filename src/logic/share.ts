import type { Mode, WordLength } from './boards'
import type { TileState } from './score'

export type ShareInput = {
  mode: Mode
  length: WordLength
  rows: readonly (readonly TileState[])[]
  maxAttempts: number
  outcome: 'won' | 'lost' | 'gave-up'
  colourBlind: boolean
  origin: string
}

const NORMAL: Record<TileState, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
}
const COLOUR_BLIND: Record<TileState, string> = {
  correct: '🟧',
  present: '🟦',
  absent: '⬜',
}

export function buildShareText(input: ShareInput): string {
  const n = input.outcome === 'won' ? String(input.rows.length) : 'X'
  const base = `${input.length} - ${n}/${input.maxAttempts}`
  const header =
    input.mode === 'wordubado'
      ? `Unlimited Wordle - Wordubado ${base}`
      : `Wordle ${base}`
  const squares = input.colourBlind ? COLOUR_BLIND : NORMAL
  const grid = input.rows.map((r) => r.map((s) => squares[s]).join(''))
  return `${header}\n\n${grid.join('\n')}\n\n${input.origin}`
}

export type TouchEnv = {
  share: unknown
  coarse: boolean
  maxTouchPoints: number
}

export function isTouchFirst(env: TouchEnv): boolean {
  return typeof env.share === 'function' && env.coarse && env.maxTouchPoints > 0
}

export type ShareEnv = {
  touchFirst: boolean
  share?: (data: { text: string }) => Promise<void>
  writeText?: (text: string) => Promise<void>
}

function errorName(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'name' in e
    ? String((e as { name: unknown }).name)
    : undefined
}

export function runShare(
  text: string,
  env: ShareEnv,
  on: { copied: () => void; failed: () => void },
): void {
  const copy = () => {
    if (!env.writeText) {
      on.failed()
      return
    }
    try {
      env.writeText(text).then(on.copied, on.failed)
    } catch {
      on.failed()
    }
  }
  if (env.touchFirst && env.share) {
    env.share({ text }).catch((e: unknown) => {
      if (errorName(e) === 'AbortError') return
      copy()
    })
    return
  }
  copy()
}
