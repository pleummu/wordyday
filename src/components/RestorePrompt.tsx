import { NO, RESTORE, RESTORE_HEADING, restorePromptBody } from '../state/copy'
import { useGameStore } from '../state/gameStore'
import { refill, restoresLeft } from '../logic/streaks'
import Modal from './Modal'

function blurActive() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

// D-13/D-14: blocking prompt, closable only by its own two buttons. Shown once
// the reveal has ended (D-21) so it never covers the tile flip.
export default function RestorePrompt() {
  const pending = useGameStore((s) => s.pendingRestore)
  const status = useGameStore((s) => s.status)
  const restores = useGameStore((s) => s.restores)
  const today = useGameStore((s) => s.today)
  const restore = useGameStore((s) => s.restore)
  const declineRestore = useGameStore((s) => s.declineRestore)
  const open = pending !== null && status !== 'revealing'

  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissible={false}
      titleId="restore-title"
      bodyId="restore-body"
    >
      <h2 id="restore-title" className="modal-heading">
        {RESTORE_HEADING}
      </h2>
      <p id="restore-body" className="modal-body">
        {pending !== null &&
          restorePromptBody(
            pending.streak,
            restoresLeft(refill(restores, today)),
          )}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="secondary"
          data-own-enter
          onClick={() => {
            declineRestore()
            blurActive()
          }}
        >
          {NO}
        </button>
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-initial-focus
          data-own-enter
          onClick={() => {
            restore()
            blurActive()
          }}
        >
          {RESTORE}
        </button>
      </div>
    </Modal>
  )
}
