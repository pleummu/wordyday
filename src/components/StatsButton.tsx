import { STATISTICS } from '../state/copy'
import { useGameStore } from '../state/gameStore'

export default function StatsButton() {
  const openStats = useGameStore((s) => s.openStats)
  const busy = useGameStore((s) => s.status === 'revealing')
  return (
    <button
      type="button"
      className="stats-button"
      aria-label={STATISTICS}
      aria-haspopup="dialog"
      disabled={busy}
      data-own-enter
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
        <path d="M6 20v-5" />
        <path d="M12 20V10" />
        <path d="M18 20V4" />
      </svg>
    </button>
  )
}
