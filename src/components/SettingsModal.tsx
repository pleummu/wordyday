import { useRef, type KeyboardEvent } from 'react'
import {
  APPEARANCE,
  CLOSE,
  COLOUR_BLIND,
  COLOUR_BLIND_HINT,
  RESET_MY_DATA,
  SETTINGS,
  SETTINGS_NOTE,
  STORAGE_OFF_NOTE,
  THEME,
  THEME_OPTIONS,
} from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function SettingsModal() {
  const open = useGameStore((s) => s.dialog === 'settings')
  const storageOk = useGameStore((s) => s.storageOk)
  const focusReset = useGameStore((s) => s.settingsFocus === 'reset')
  const closeDialog = useGameStore((s) => s.closeDialog)
  const openReset = useGameStore((s) => s.openReset)
  const theme = useGameStore((s) => s.theme)
  const colourBlind = useGameStore((s) => s.colourBlind)
  const setTheme = useGameStore((s) => s.setTheme)
  const setColourBlind = useGameStore((s) => s.setColourBlind)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onThemeKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = THEME_OPTIONS.length - 1
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowDown: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[e.key]
    if (target === undefined) return
    e.preventDefault()
    setTheme(THEME_OPTIONS[target].value)
    refs.current[target]?.focus()
  }

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
      <section className="settings-appearance">
        <h3 className="modal-subheading">{APPEARANCE}</h3>
        <p id="theme-label" className="settings-label">
          {THEME}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="theme-label"
          className="length-picker theme-picker"
        >
          {THEME_OPTIONS.map((o, i) => (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={theme === o.value}
              tabIndex={theme === o.value ? 0 : -1}
              className="length-option"
              data-own-enter
              onKeyDown={(e) => onThemeKey(e, i)}
              onClick={() => setTheme(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={colourBlind}
          aria-describedby="colour-blind-hint"
          className="mode-switch settings-switch"
          data-own-enter
          onClick={() => setColourBlind(!colourBlind)}
        >
          <span className="mode-switch-label">{COLOUR_BLIND}</span>
          <span className="mode-switch-track" aria-hidden="true">
            <span className="mode-switch-knob" />
          </span>
        </button>
        <p id="colour-blind-hint" className="settings-hint">
          {COLOUR_BLIND_HINT}
        </p>
      </section>
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
