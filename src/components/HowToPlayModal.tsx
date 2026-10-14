import {
  HELP,
  HELP_EXAMPLES,
  HELP_GOT_IT,
  HELP_MODES,
  HELP_RULES,
  HELP_STREAKS,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function HowToPlayModal() {
  const open = useGameStore((s) => s.dialog === 'help')
  const closeDialog = useGameStore((s) => s.closeDialog)

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      titleId="help-title"
      bodyId="help-body"
      fallbackFocus={() =>
        document.querySelector<HTMLElement>('.help-button') ?? document.body
      }
    >
      <h2 id="help-title" className="modal-heading">
        {HELP}
      </h2>
      <p id="help-body" className="modal-body">
        {HELP_RULES}
      </p>
      {HELP_EXAMPLES.map((ex) => (
        <div
          key={ex.word}
          className="help-example"
          role="img"
          aria-label={`Example: ${ex.word[ex.index]} is ${ex.state}. ${ex.caption}`}
        >
          <div className="help-row">
            {[...ex.word].map((letter, i) => (
              <span
                key={i}
                className="tile help-tile"
                data-filled="true"
                data-state={i === ex.index ? ex.state : undefined}
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="help-caption">
            <strong>{ex.state}</strong>: {ex.caption}
          </p>
        </div>
      ))}
      <p className="modal-body">{HELP_MODES}</p>
      <p className="modal-body">{HELP_STREAKS}</p>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-initial-focus
          data-own-enter
          onClick={closeDialog}
        >
          {HELP_GOT_IT}
        </button>
      </div>
    </Modal>
  )
}
