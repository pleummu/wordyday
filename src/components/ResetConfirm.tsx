import { CANCEL, RESET, RESET_BODY, RESET_HEADING } from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function ResetConfirm() {
  const open = useGameStore((s) => s.dialog === 'reset')
  const cancelReset = useGameStore((s) => s.cancelReset)
  const resetAll = useGameStore((s) => s.resetAll)

  return (
    <Modal
      open={open}
      onClose={cancelReset}
      titleId="reset-title"
      bodyId="reset-body"
      fallbackFocus={() =>
        document.querySelector<HTMLElement>('.settings-button') ?? document.body
      }
    >
      <h2 id="reset-title" className="modal-heading">
        {RESET_HEADING}
      </h2>
      <p id="reset-body" className="modal-body">
        {RESET_BODY}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="secondary"
          data-initial-focus
          data-own-enter
          onClick={cancelReset}
        >
          {CANCEL}
        </button>
        <button
          type="button"
          className="modal-button"
          data-variant="danger"
          data-own-enter
          onClick={() => {
            resetAll()
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }
          }}
        >
          {RESET}
        </button>
      </div>
    </Modal>
  )
}
