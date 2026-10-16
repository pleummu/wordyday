import {
  GIVE_UP_BODY,
  CONFIRM_KEEP,
  GIVE_UP_HEADING,
  GIVE_UP,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function GiveUpConfirm() {
  const open = useGameStore((s) => s.dialog === 'giveUp')
  const closeDialog = useGameStore((s) => s.closeDialog)
  const confirm = useGameStore((s) => s.giveUp)

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      titleId="give-up-title"
      bodyId="give-up-body"
      fallbackFocus={() =>
        document.querySelector<HTMLElement>('.forfeit-button') ?? document.body
      }
    >
      <h2 id="give-up-title" className="modal-heading">
        {GIVE_UP_HEADING}
      </h2>
      <p id="give-up-body" className="modal-body">
        {GIVE_UP_BODY}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="secondary"
          data-initial-focus
          data-own-enter
          onClick={closeDialog}
        >
          {CONFIRM_KEEP}
        </button>
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-own-enter
          onClick={() => {
            confirm()
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }
          }}
        >
          {GIVE_UP}
        </button>
      </div>
    </Modal>
  )
}
