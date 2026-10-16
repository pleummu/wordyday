import {
  CLOSE,
  RESET_MY_DATA,
  SETTINGS,
  SETTINGS_NOTE,
  STORAGE_OFF_NOTE,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function SettingsModal() {
  const open = useGameStore((s) => s.dialog === 'settings')
  const storageOk = useGameStore((s) => s.storageOk)
  const focusReset = useGameStore((s) => s.settingsFocus === 'reset')
  const closeDialog = useGameStore((s) => s.closeDialog)
  const openReset = useGameStore((s) => s.openReset)

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      titleId="settings-title"
      bodyId="settings-body"
      fallbackFocus={() =>
        document.querySelector<HTMLElement>('.settings-button') ?? document.body
      }
    >
      <h2 id="settings-title" className="modal-heading">
        {SETTINGS}
      </h2>
      <p id="settings-body" className="modal-body">
        {SETTINGS_NOTE}
      </p>
      {!storageOk && <p className="modal-body">{STORAGE_OFF_NOTE}</p>}
      <div className="modal-actions">
        <button
          type="button"
          className="modal-button"
          data-variant="danger-outline"
          data-initial-focus={focusReset ? '' : undefined}
          data-own-enter
          onClick={openReset}
        >
          {RESET_MY_DATA}
        </button>
        <button
          type="button"
          className="modal-button"
          data-variant="primary"
          data-initial-focus={focusReset ? undefined : ''}
          data-own-enter
          onClick={closeDialog}
        >
          {CLOSE}
        </button>
      </div>
    </Modal>
  )
}
