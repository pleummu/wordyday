import type { MouseEvent } from 'react'
import type { KeyStates } from '../logic/keys'

type KeyboardProps = {
  keyStates: KeyStates
  disabled: boolean
  onKey: (key: string) => void
}

const ROW1 = 'qwertyuiop'.split('')
const ROW2 = 'asdfghjkl'.split('')
const ROW3 = 'zxcvbnm'.split('')

export default function Keyboard({
  keyStates,
  disabled,
  onKey,
}: KeyboardProps) {
  function press(key: string, event: MouseEvent<HTMLButtonElement>) {
    onKey(key)
    // Pointer click: drop focus so a later physical Enter is not a re-click.
    if (event.detail > 0) event.currentTarget.blur()
  }

  function letterKey(letter: string) {
    const state = keyStates[letter]
    const upper = letter.toUpperCase()
    return (
      <button
        key={letter}
        type="button"
        className="key"
        data-key={letter}
        data-state={state}
        aria-label={state ? `${upper}, ${state}` : upper}
        disabled={disabled}
        onClick={(e) => press(letter, e)}
      >
        {upper}
      </button>
    )
  }

  return (
    <div className="keyboard">
      <div className="kb-row">{ROW1.map(letterKey)}</div>
      <div className="kb-row">
        <span className="key-spacer" />
        {ROW2.map(letterKey)}
        <span className="key-spacer" />
      </div>
      <div className="kb-row">
        <button
          type="button"
          className="key key-wide"
          data-key="enter"
          aria-label="Enter"
          disabled={disabled}
          onClick={(e) => press('enter', e)}
        >
          Enter
        </button>
        {ROW3.map(letterKey)}
        <button
          type="button"
          className="key key-wide"
          data-key="backspace"
          aria-label="Backspace"
          disabled={disabled}
          onClick={(e) => press('backspace', e)}
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 5H9l-6 7 6 7h12z" />
            <path d="m14 9 4 6m0-6-4 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
