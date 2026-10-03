import { useRef, type KeyboardEvent } from 'react'
import type { WordLength } from '../logic/boards'

type LengthPickerProps = {
  value: WordLength
  disabled: boolean
  inProgress: Partial<Record<WordLength, boolean>>
  onChange: (length: WordLength) => void
}

const OPTIONS: WordLength[] = [4, 5, 6]

export default function LengthPicker({
  value,
  disabled,
  inProgress,
  onChange,
}: LengthPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function change(n: WordLength) {
    if (disabled) return
    onChange(n)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step = e.key === 'ArrowRight' ? 1 : -1
    const next = (index + step + OPTIONS.length) % OPTIONS.length
    change(OPTIONS[next])
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Word length"
      aria-disabled={disabled ? 'true' : undefined}
      className="length-picker"
    >
      {OPTIONS.map((n, i) => {
        const dot = inProgress[n] === true && n !== value
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            tabIndex={value === n ? 0 : -1}
            className="length-option"
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={(e) => {
              change(n)
              // Pointer/touch click: leave the radio so physical Enter plays.
              if (e.detail > 0) e.currentTarget.blur()
            }}
          >
            {n}{' '}
            <span className="visually-hidden">
              {dot ? 'letters, game in progress' : 'letters'}
            </span>
            {dot ? <span className="length-dot" aria-hidden="true" /> : null}
          </button>
        )
      })}
    </div>
  )
}
