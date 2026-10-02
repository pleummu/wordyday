type ModeSwitchProps = {
  checked: boolean
  disabled: boolean
  onToggle: () => void
}

export default function ModeSwitch({
  checked,
  disabled,
  onToggle,
}: ModeSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled ? 'true' : undefined}
      data-own-enter
      className="mode-switch"
      onClick={(e) => {
        if (disabled) return
        onToggle()
        // Pointer click: leave the switch so physical Enter plays.
        if (e.detail > 0) e.currentTarget.blur()
      }}
    >
      <span className="mode-switch-label">Wordubado</span>
      <span className="mode-switch-track" aria-hidden="true">
        <span className="mode-switch-knob" />
      </span>
    </button>
  )
}
