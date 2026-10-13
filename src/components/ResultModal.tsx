import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { BOARD_CONFIG } from '../logic/boards'
import { buildShareText, isTouchFirst, runShare } from '../logic/share'
import { deriveStats } from '../logic/stats'
import {
  BEST,
  BEST_FULL,
  COPIED_LABEL,
  COPIED_MS,
  COPIED_TOAST,
  COPY_FAILED_NOTE,
  EM_DASH,
  GUESS_DISTRIBUTION,
  NO_WINS_YET,
  OUT_OF_GUESSES,
  PLAYED,
  PLAY_AGAIN,
  SHARE,
  SHOW_DEFINITION,
  SHARE_TEXT_LABEL,
  STREAK,
  WIN_PCT,
  WIN_PCT_FULL,
  WORD_WAS_PREFIX,
  YOU_GAVE_UP,
  resultWinHeading,
  streakFull,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import DefinitionPanel from './DefinitionPanel'
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
  const colourBlind = useGameStore((s) => s.colourBlind)
  const notify = useGameStore((s) => s.notify)
  const toast = useGameStore((s) => s.toast)
  const pools = useGameStore((s) => s.pools)
  const definitionShown = useGameStore((s) => s.definitionShown)
  const showDefinition = useGameStore((s) => s.showDefinition)

  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)
  const [justRevealed, setJustRevealed] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const boxRef = useRef<HTMLTextAreaElement>(null)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) {
      setCopied(false)
      setFallback(null)
      setJustRevealed(false)
    }
  }

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(t)
  }, [copied])

  useEffect(() => {
    const box = boxRef.current
    if (fallback === null || !box) return
    box.focus()
    box.select()
    box.scrollIntoView?.({ block: 'nearest' })
  }, [fallback])

  const attempts = BOARD_CONFIG[length].attempts
  const v = deriveStats(stats, mode, length)
  const heading =
    status === 'won'
      ? resultWinHeading(rows.length, attempts)
      : status === 'lost'
        ? OUT_OF_GUESSES
        : YOU_GAVE_UP

  // Built during render so nothing is awaited inside the click (iOS activation).
  const shareText = useMemo(
    () =>
      buildShareText({
        mode,
        length,
        rows: rows.map((r) => r.states),
        maxAttempts: attempts,
        outcome: status as 'won' | 'lost' | 'gave-up',
        colourBlind,
        origin: window.location.origin,
      }),
    [mode, length, rows, attempts, status, colourBlind],
  )

  function onShare() {
    const nav = navigator
    runShare(
      shareText,
      {
        touchFirst: isTouchFirst({
          share: nav.share,
          coarse: globalThis.matchMedia?.('(pointer: coarse)').matches ?? false,
          maxTouchPoints: nav.maxTouchPoints ?? 0,
        }),
        share: nav.share ? (d) => nav.share(d) : undefined,
        writeText: nav.clipboard
          ? (t) => nav.clipboard.writeText(t)
          : undefined,
      },
      {
        copied: () => {
          notify(COPIED_TOAST)
          setCopied(true)
        },
        failed: () => setFallback(shareText),
      },
    )
  }

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
        <p className="visually-hidden" role="status" aria-live="polite">
          {open && toast?.kind === 'info' ? toast.text : ''}
        </p>
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
        {!definitionShown && (
          <button
            type="button"
            className="modal-button result-define"
            data-variant="secondary"
            data-own-enter
            onClick={() => {
              setJustRevealed(true)
              showDefinition()
            }}
          >
            {SHOW_DEFINITION}
          </button>
        )}
        {definitionShown && open && (
          <DefinitionPanel
            word={answer}
            focusOnMount={justRevealed}
            curated={mode === 'wordubado' ? pools?.defs?.[answer] : undefined}
          />
        )}
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
            data-variant="secondary"
            data-own-enter
            aria-label={SHARE}
            onClick={onShare}
          >
            {copied ? (
              <span aria-hidden="true">
                {COPIED_LABEL} <span aria-hidden="true">✓</span>
              </span>
            ) : (
              SHARE
            )}
          </button>
          <button
            type="button"
            className="modal-button"
            data-variant="primary"
            data-initial-focus=""
            data-own-enter
            onClick={() => {
              setCopied(false)
              setFallback(null)
              playAgain()
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
              }
            }}
          >
            {PLAY_AGAIN}
          </button>
        </div>
        {fallback !== null && (
          <>
            <p id="share-note" className="result-note">
              {COPY_FAILED_NOTE}
            </p>
            <textarea
              ref={boxRef}
              className="share-fallback"
              readOnly
              rows={3}
              aria-label={SHARE_TEXT_LABEL}
              aria-describedby="share-note"
              value={fallback}
            />
          </>
        )}
      </div>
    </Modal>
  )
}
