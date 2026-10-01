import type { CSSProperties } from 'react'
import type { TileState } from '../logic/score'

type TileProps = {
  letter: string
  state?: TileState
  row: number
  col: number
  revealed: boolean
  active?: boolean
  flip?: boolean
}

export default function Tile({
  letter,
  state,
  row,
  col,
  revealed,
  active,
  flip,
}: TileProps) {
  const upper = letter.toUpperCase()
  let label = `Row ${row}, column ${col}, `
  if (!letter) label += 'empty'
  else {
    label += `letter ${upper}`
    if (state && revealed) label += `, ${state}`
  }
  return (
    <div
      key={`${row}-${col}-${letter}`}
      role="gridcell"
      className="tile"
      data-state={state}
      data-filled={letter ? 'true' : undefined}
      data-pop={active && letter ? 'true' : undefined}
      data-flip={flip ? 'true' : undefined}
      style={{ '--i': col - 1 } as CSSProperties}
      aria-label={label}
    >
      {letter}
    </div>
  )
}
