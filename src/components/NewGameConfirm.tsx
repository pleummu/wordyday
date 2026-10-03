import {
  NEW_GAME_BODY,
  CONFIRM_KEEP,
  NEW_GAME_HEADING,
  NEW_GAME,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function NewGameConfirm() {
  const open = useGameStore((s) => s.dialog === 'newGame')
  const closeDialog = useGameStore((s) => s.closeDialog)
  const confirm = useGameStore((s) => s.forfeitNewGame)

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      titleId="new-game-title"
      bodyId="new-game-body"
      fallbackFocus={() =>
        document.querySelector<HTMLElement>('.forfeit-button') ?? document.body
      }
    >
      <h2 id="new-game-title" className="modal-heading">
        {NEW_GAME_HEADING}
      </h2>
      <p id="new-game-body" className="modal-body">
        {NEW_GAME_BODY}
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
          {NEW_GAME}
        </button>
      </div>
    </Modal>
  )
}
