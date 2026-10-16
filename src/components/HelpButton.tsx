import { HELP } from '../state/copy'
import { isBusy, useGameStore } from '../state/gameStore'

export default function HelpButton() {
  const openHelp = useGameStore((s) => s.openHelp)
  const busy = useGameStore(isBusy)
  const pending = useGameStore((s) => s.pendingRestore !== null)
  return (
    <button
      type="button"
      className="help-button"
      aria-label={HELP}
      aria-haspopup="dialog"
      disabled={busy || pending}
      data-own-enter
      onClick={openHelp}
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
        <circle cx="12" cy="12" r="10" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    </button>
  )
}
