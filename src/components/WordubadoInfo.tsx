import { INFO_BODY, INFO_GOT_IT, INFO_HEADING } from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function WordubadoInfo() {
  const infoOpen = useGameStore((s) => s.infoOpen)
  const closeInfo = useGameStore((s) => s.closeInfo)

  return (
    <Modal
      open={infoOpen}
      onClose={closeInfo}
      titleId="wordubado-info-title"
      bodyId="wordubado-info-body"
      fallbackFocus={() => document.querySelector<HTMLElement>('.mode-switch')}
    >
      <h2 id="wordubado-info-title" className="modal-heading">
        {INFO_HEADING}
      </h2>
      <div id="wordubado-info-body" className="modal-body">
        {INFO_BODY.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-initial-focus
          data-own-enter
          onClick={closeInfo}
        >
          {INFO_GOT_IT}
        </button>
      </div>
    </Modal>
  )
}
