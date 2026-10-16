import {
  PLAY_AGAIN,
  SEE_RESULT,
  YOU_GAVE_UP,
  solvedIn,
  wordWasLine,
} from '../state/copy'

type BannerProps = {
  status: 'won' | 'lost' | 'gave-up'
  answer: string
  attemptsUsed: number
  busy: boolean
  onSeeResult: () => void
  onPlayAgain: () => void
}

export default function Banner({
  status,
  answer,
  attemptsUsed,
  busy,
  onSeeResult,
  onPlayAgain,
}: BannerProps) {
  const heading =
    status === 'won'
      ? solvedIn(attemptsUsed)
      : status === 'lost'
        ? wordWasLine(answer)
        : YOU_GAVE_UP
  return (
    <section className="banner" data-result={status}>
      <h2 className="banner-heading">{heading}</h2>
      {status === 'gave-up' ? (
        <p className="banner-body">{wordWasLine(answer)}</p>
      ) : null}
      <div className="banner-actions">
        <button
          type="button"
          className="see-result"
          data-see-result
          data-own-enter
          disabled={busy}
          onClick={onSeeResult}
        >
          {SEE_RESULT}
        </button>
        <button
          type="button"
          className="play-again"
          data-own-enter
          disabled={busy}
          onClick={() => {
            onPlayAgain()
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }
          }}
        >
          {PLAY_AGAIN}
        </button>
      </div>
    </section>
  )
}
