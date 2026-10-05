import { BREAK_BODY, BREAK_HEADING, OK } from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

function blurActive() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

// D-16: a short note when the Day Streak ended without the player choosing it.
// Shown only when no Restore prompt is pending and never over a tile reveal (D-21).
export default function StreakBreakModal() {
  const breakNotice = useGameStore((s) => s.breakNotice)
  const pending = useGameStore((s) => s.pendingRestore)
  const status = useGameStore((s) => s.status)
  const dismissBreak = useGameStore((s) => s.dismissBreak)
  const open = breakNotice && pending === null && status !== 'revealing'

  return (
    <Modal
      open={open}
      onClose={dismissBreak}
      titleId="break-title"
      bodyId="break-body"
    >
      <h2 id="break-title" className="modal-heading">
        {BREAK_HEADING}
      </h2>
      <p id="break-body" className="modal-body">
        {BREAK_BODY}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-initial-focus
          data-own-enter
          onClick={() => {
            dismissBreak()
            blurActive()
          }}
        >
          {OK}
        </button>
      </div>
    </Modal>
  )
}
