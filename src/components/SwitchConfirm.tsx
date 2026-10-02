import { useState } from 'react'
import {
  CONFIRM_HEADING,
  CONFIRM_KEEP,
  CONFIRM_START,
  switchConfirmBody,
} from '../state/copy'
import { useGameStore, type SwitchTarget } from '../state/gameStore'
import Modal from './Modal'

export default function SwitchConfirm() {
  const pendingSwitch = useGameStore((s) => s.pendingSwitch)
  const mode = useGameStore((s) => s.mode)
  const length = useGameStore((s) => s.length)
  const confirmSwitch = useGameStore((s) => s.confirmSwitch)
  const cancelSwitch = useGameStore((s) => s.cancelSwitch)
  // Snapshot of what was active and what was requested when the dialog opened,
  // so the copy stays put while it animates closed after the store switches.
  const [shown, setShown] = useState<{
    active: SwitchTarget
    target: SwitchTarget
  } | null>(null)
  if (pendingSwitch !== null && pendingSwitch !== shown?.target) {
    setShown({ active: { mode, length }, target: pendingSwitch })
  }

  return (
    <Modal
      open={pendingSwitch !== null}
      onClose={cancelSwitch}
      titleId="switch-confirm-title"
      bodyId="switch-confirm-body"
      fallbackFocus={() => document.querySelector<HTMLElement>('.mode-switch')}
    >
      <h2 id="switch-confirm-title" className="modal-heading">
        {CONFIRM_HEADING}
      </h2>
      <p id="switch-confirm-body" className="modal-body">
        {shown ? switchConfirmBody(shown.active, shown.target) : ''}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="secondary"
          data-initial-focus
          data-own-enter
          onClick={cancelSwitch}
        >
          {CONFIRM_KEEP}
        </button>
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-own-enter
          onClick={confirmSwitch}
        >
          {CONFIRM_START}
        </button>
      </div>
    </Modal>
  )
}
