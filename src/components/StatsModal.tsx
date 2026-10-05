import { useRef, useState, type KeyboardEvent } from 'react'
import type { Mode } from '../logic/boards'
import { deriveStats, type StatsTab } from '../logic/stats'
import { refill, restoresLeft } from '../logic/streaks'
import {
  ALL_LENGTHS,
  ALL_TAB,
  BEST,
  BEST_FULL,
  CLOSE,
  EM_DASH,
  GUESS_DISTRIBUTION,
  MODE_LABEL,
  NO_WINS_YET,
  PLAYED,
  STATISTICS,
  STREAK,
  STREAK_FULL,
  WIN_PCT,
  WIN_PCT_FULL,
  WORD_LENGTH,
  avgLine,
  dayStreakFooter,
  distRowLabel,
  gaveUpLine,
  restoresLeftLine,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

const MODES: { value: Mode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'wordubado', label: 'Wordubado' },
]
const TABS: StatsTab[] = [4, 5, 6, 'all']

function Stat({
  value,
  label,
  full,
}: {
  value: string
  label: string
  full?: string
}) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      {full ? (
        <>
          <span className="stat-label" aria-hidden="true">
            {label}
          </span>
          <span className="visually-hidden">{full}</span>
        </>
      ) : (
        <span className="stat-label">{label}</span>
      )}
    </div>
  )
}

export default function StatsModal() {
  const open = useGameStore((s) => s.dialog === 'stats')
  const stats = useGameStore((s) => s.stats)
  const currentMode = useGameStore((s) => s.mode)
  const currentLength = useGameStore((s) => s.length)
  const closeDialog = useGameStore((s) => s.closeDialog)
  const dayStreak = useGameStore((s) => s.dayStreak)
  const restores = useGameStore((s) => s.restores)
  const today = useGameStore((s) => s.today)

  const [view, setView] = useState<{ mode: Mode; tab: StatsTab }>({
    mode: currentMode,
    tab: currentLength,
  })
  const [wasOpen, setWasOpen] = useState(open)
  // Reset to the current Board each time the dialog opens, by adjusting state
  // while rendering when the prop changed (no effect).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setView({ mode: currentMode, tab: currentLength })
  }
  const { mode, tab } = view

  const modeRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const v = deriveStats(stats, mode, tab)
  const maxCount = Math.max(...v.dist, 0)

  function onModeKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next =
      (i + (e.key === 'ArrowRight' ? 1 : -1) + MODES.length) % MODES.length
    setView({ mode: MODES[next].value, tab })
    modeRefs.current[next]?.focus()
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next: number
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    else return
    e.preventDefault()
    setView({ mode, tab: TABS[next] })
    tabRefs.current[next]?.focus()
  }

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      titleId="stats-title"
      bodyId="stats-panel"
      fallbackFocus={() =>
        document.querySelector<HTMLElement>('.streak-chip') ??
        document.querySelector<HTMLElement>('.stats-button') ??
        document.body
      }
    >
      <h2 id="stats-title" className="modal-heading">
        {STATISTICS}
      </h2>
      <div role="radiogroup" aria-label={MODE_LABEL} className="stats-mode">
        {MODES.map((m, i) => (
          <button
            key={m.value}
            ref={(el) => {
              modeRefs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            tabIndex={mode === m.value ? 0 : -1}
            className="stats-mode-option"
            data-mode={m.value}
            onKeyDown={(e) => onModeKey(e, i)}
            onClick={() => setView({ mode: m.value, tab })}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div role="tablist" aria-label={WORD_LENGTH} className="stats-tabs">
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`stats-tab-${t}`}
            aria-selected={tab === t}
            aria-controls="stats-panel"
            aria-label={t === 'all' ? ALL_LENGTHS : undefined}
            tabIndex={tab === t ? 0 : -1}
            className="stats-tab"
            onKeyDown={(e) => onTabKey(e, i)}
            onClick={() => setView({ mode, tab: t })}
          >
            {t === 'all' ? (
              ALL_TAB
            ) : (
              <>
                {t} <span className="visually-hidden">letters</span>
              </>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="stats-panel"
        aria-labelledby={`stats-tab-${tab}`}
        className="stats-panel"
      >
        <div className="stat-row" data-cells={tab === 'all' ? 2 : 4}>
          <Stat value={String(v.played)} label={PLAYED} />
          <Stat
            value={v.winPct === null ? EM_DASH : `${v.winPct}%`}
            label={WIN_PCT}
            full={WIN_PCT_FULL}
          />
          {v.winStreak !== null && v.bestWinStreak !== null && (
            <>
              <Stat
                value={String(v.winStreak)}
                label={STREAK}
                full={STREAK_FULL}
              />
              <Stat
                value={String(v.bestWinStreak)}
                label={BEST}
                full={BEST_FULL}
              />
            </>
          )}
        </div>
        <p className="stats-line">{gaveUpLine(v.gaveUp)}</p>
        <h3 className="modal-subheading">{GUESS_DISTRIBUTION}</h3>
        {v.wins === 0 ? (
          <p className="stats-line stats-empty">{NO_WINS_YET}</p>
        ) : (
          <ol className="dist">
            {v.dist.map((count, i) => {
              const row = i + 1
              const latest = v.highlightRow === row
              const width =
                maxCount > 0
                  ? `max(24px, ${(count / maxCount) * 100}%)`
                  : '24px'
              return (
                <li
                  key={row}
                  className="dist-row"
                  aria-label={distRowLabel(row, count, latest)}
                >
                  <span className="dist-num" aria-hidden="true">
                    {row}
                  </span>
                  <span className="dist-track" aria-hidden="true">
                    <span
                      className="dist-bar"
                      data-highlight={latest ? '' : undefined}
                      style={{ width }}
                    >
                      {count}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
        <p className="stats-line">{avgLine(v.avgGuesses)}</p>
        <hr className="stats-divider" />
        <p className="stats-footer">
          {dayStreakFooter(dayStreak.current, dayStreak.longest)}
        </p>
        <p className="stats-footer">
          {restoresLeftLine(restoresLeft(refill(restores, today)))}
        </p>
      </div>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-initial-focus=""
          data-own-enter
          onClick={closeDialog}
        >
          {CLOSE}
        </button>
      </div>
    </Modal>
  )
}
