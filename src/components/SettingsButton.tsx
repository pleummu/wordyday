import { SETTINGS } from '../state/copy'
import { useGameStore } from '../state/gameStore'

export default function SettingsButton() {
  const openSettings = useGameStore((s) => s.openSettings)
  return (
    <button
      type="button"
      className="settings-button"
      aria-label={SETTINGS}
      aria-haspopup="dialog"
      data-own-enter
      onClick={openSettings}
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
        <path d="M3 8h18" />
        <path d="M3 16h18" />
        <circle cx="9" cy="8" r="2.5" fill="var(--color-bg)" />
        <circle cx="15" cy="16" r="2.5" fill="var(--color-bg)" />
      </svg>
    </button>
  )
}
