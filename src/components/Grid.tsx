import { Fragment, type CSSProperties } from 'react'
import { BOARD_CONFIG, type WordLength } from '../logic/boards'
import type { GameStatus, Row } from '../state/gameStore'
import Tile from './Tile'

type GridProps = {
  length: WordLength
  rows: Row[]
  current: string
  status: GameStatus
  shakeId: number
  shakeRow: number
  celebrate: boolean
}

export default function Grid({
  length,
  rows,
  current,
  status,
  shakeId,
  shakeRow,
  celebrate,
}: GridProps) {
  const attempts = BOARD_CONFIG[length].attempts
  const last = rows.length - 1
  const typing = status === 'playing' || status === 'loading'
  return (
    <div
      role="grid"
      aria-label="Guesses"
      className="grid"
      style={{ '--cols': length, '--rows': attempts } as CSSProperties}
    >
      {Array.from({ length: attempts }, (_, r) => {
        const submitted = r < rows.length ? rows[r] : undefined
        const letters = submitted
          ? submitted.letters
          : r === rows.length && typing
            ? current
            : ''
        const revealed = !(status === 'revealing' && r === rows.length - 1)
        const active = r === rows.length
        const revealingRow = status === 'revealing' && r === last
        const bounce = status === 'won' && celebrate && r === last
        const tiles = Array.from({ length }, (_, c) => (
          <Tile
            key={c}
            letter={letters[c] ?? ''}
            state={submitted?.states[c]}
            row={r + 1}
            col={c + 1}
            revealed={revealed}
            active={active}
            flip={!!submitted && (revealingRow || bounce)}
          />
        ))
        return (
          <div
            role="row"
            className="row"
            key={r}
            data-shake={
              active && shakeId > 0 && shakeRow === rows.length
                ? 'true'
                : undefined
            }
            data-bounce={bounce ? 'true' : undefined}
          >
            {active ? <Fragment key={shakeId}>{tiles}</Fragment> : tiles}
          </div>
        )
      })}
    </div>
  )
}
