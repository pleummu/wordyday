import { useEffect, useRef } from 'react'
import {
  LOSS_BODY,
  PLAY_AGAIN,
  WIN_BODY,
  lossHeading,
  winHeading,
} from '../state/copy'

type BannerProps = {
  status: 'won' | 'lost'
  answer: string
  attemptsUsed: number
  maxAttempts: number
  onPlayAgain: () => void
}

export default function Banner({
  status,
  answer,
  attemptsUsed,
  maxAttempts,
  onPlayAgain,
}: BannerProps) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
  }, [])
  const won = status === 'won'
  return (
    <section className="banner" data-result={status} aria-live="polite">
      <h2 className="banner-heading">
        {won ? winHeading(attemptsUsed, maxAttempts) : lossHeading(answer)}
      </h2>
      <p className="banner-body">{won ? WIN_BODY : LOSS_BODY}</p>
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
