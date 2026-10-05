import { chipName } from '../state/copy'
import { useGameStore } from '../state/gameStore'

export default function StreakChip() {
  const current = useGameStore((s) => s.dayStreak.current)
  const lastActiveDate = useGameStore((s) => s.dayStreak.lastActiveDate)
  const today = useGameStore((s) => s.today)
  const busy = useGameStore((s) => s.status === 'revealing')
  const openStats = useGameStore((s) => s.openStats)
  if (current === 0) return null
  const credited = lastActiveDate === today
  return (
    <button
      type="button"
      className="streak-chip"
      aria-label={chipName(current, credited)}
      aria-haspopup="dialog"
      data-own-enter
      data-dimmed={credited ? undefined : ''}
      disabled={busy}
      onClick={openStats}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <span className="streak-chip-count">{current}</span>
    </button>
  )
}
