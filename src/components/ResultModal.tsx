import type { KeyboardEvent } from 'react'
import { BOARD_CONFIG } from '../logic/boards'
import { deriveStats } from '../logic/stats'
import {
  BEST,
  BEST_FULL,
  EM_DASH,
  GUESS_DISTRIBUTION,
  NO_WINS_YET,
  OUT_OF_GUESSES,
  PLAYED,
  PLAY_AGAIN,
  STREAK,
  WIN_PCT,
  WIN_PCT_FULL,
  WORD_WAS_PREFIX,
  YOU_GAVE_UP,
  resultWinHeading,
  streakFull,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'
import { DistChart, Stat } from './StatsBlock'

export default function ResultModal() {
  const open = useGameStore((s) => s.dialog === 'result')
  const status = useGameStore((s) => s.status)
  const rows = useGameStore((s) => s.rows)
  const length = useGameStore((s) => s.length)
  const mode = useGameStore((s) => s.mode)
  const answer = useGameStore((s) => s.answer)
  const stats = useGameStore((s) => s.stats)
  const finishNote = useGameStore((s) => s.finishNote)
  const finishedInSession = useGameStore((s) => s.finishedInSession)
  const flourish = useGameStore((s) => s.resultFlourish)
  const closeDialog = useGameStore((s) => s.closeDialog)
  const playAgain = useGameStore((s) => s.playAgain)

  const attempts = BOARD_CONFIG[length].attempts
  const v = deriveStats(stats, mode, length)
  const heading =
    status === 'won'
      ? resultWinHeading(rows.length, attempts)
      : status === 'lost'
        ? OUT_OF_GUESSES
        : YOU_GAVE_UP

  const reset =
    finishedInSession &&
    finishNote !== null &&
    !finishNote.won &&
    finishNote.prev > 0

  // A held Enter or Space must not press Play again as the modal opens (D-30).
  function onKeyDownCapture(e: KeyboardEvent<HTMLDivElement>) {
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault()
  }

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      titleId="result-title"
      bodyId="result-answer"
      fallbackFocus={() =>
        document.querySelector<HTMLElement>('[data-see-result]')
      }
    >
      <div
        className="result-panel"
        data-flourish={flourish ? '' : undefined}
        onKeyDownCapture={onKeyDownCapture}
      >
        <h2
          id="result-title"
          className="modal-heading result-heading"
          data-result={status}
        >
          {heading}
        </h2>
        <p id="result-answer" className="result-answer">
          <span className="visually-hidden">{WORD_WAS_PREFIX}</span>
          {answer}
        </p>
        <div className="stat-row" data-cells={4}>
          <Stat value={String(v.played)} label={PLAYED} />
          <Stat
            value={v.winPct === null ? EM_DASH : `${v.winPct}%`}
            label={WIN_PCT}
            full={WIN_PCT_FULL}
          />
          <Stat
            value={String(v.winStreak ?? 0)}
            label={STREAK}
            full={streakFull(v.winStreak ?? 0, reset)}
            valueHidden
          />
          <Stat
            value={String(v.bestWinStreak ?? 0)}
            label={BEST}
            full={BEST_FULL}
          />
        </div>
        <h3 className="modal-subheading">{GUESS_DISTRIBUTION}</h3>
        {v.wins === 0 ? (
          <p className="stats-line stats-empty">{NO_WINS_YET}</p>
        ) : (
          <DistChart
            dist={v.dist.slice(0, attempts)}
            highlightRow={status === 'won' ? v.highlightRow : null}
          />
        )}
        <div className="modal-actions result-actions">
          <button
            type="button"
            className="modal-button"
            data-variant="primary"
            data-initial-focus=""
            data-own-enter
            onClick={() => {
              playAgain()
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
              }
            }}
          >
            {PLAY_AGAIN}
          </button>
        </div>
      </div>
    </Modal>
  )
}
