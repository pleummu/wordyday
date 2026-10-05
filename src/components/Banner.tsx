import { useEffect, useRef } from 'react'
import {
  GAVE_UP_BODY,
  LOSS_BODY,
  PLAY_AGAIN,
  WIN_BODY,
  lossHeading,
  winHeading,
} from '../state/copy'

type BannerProps = {
  status: 'won' | 'lost' | 'gave-up'
  autoFocus: boolean
  answer: string
  attemptsUsed: number
  maxAttempts: number
  onPlayAgain: () => void
  streakLine?: string | null
}

export default function Banner({
  status,
  autoFocus,
  answer,
  attemptsUsed,
  maxAttempts,
  onPlayAgain,
  streakLine,
}: BannerProps) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (autoFocus) button.current?.focus()
    // Focus only on mount: a restored game must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const won = status === 'won'
  return (
    <section
      className="banner"
      data-result={status}
      data-streak={streakLine ? '' : undefined}
      aria-live="polite"
    >
      <h2 className="banner-heading">
        {won ? winHeading(attemptsUsed, maxAttempts) : lossHeading(answer)}
      </h2>
      <p className="banner-body">
        {won ? WIN_BODY : status === 'gave-up' ? GAVE_UP_BODY : LOSS_BODY}
      </p>
      {streakLine ? <p className="banner-streak">{streakLine}</p> : null}
      <button
        ref={button}
        type="button"
        className="play-again"
        data-own-enter
        onClick={() => {
          onPlayAgain()
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        }}
      >
        {PLAY_AGAIN}
      </button>
    </section>
  )
}
