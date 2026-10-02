import { useGameStore } from '../state/gameStore'
import LengthPicker from './LengthPicker'
import ModeSwitch from './ModeSwitch'

export default function Header() {
  const mode = useGameStore((s) => s.mode)
  const length = useGameStore((s) => s.length)
  const status = useGameStore((s) => s.status)
  const requestSwitch = useGameStore((s) => s.requestSwitch)
  const busy = status === 'revealing'
  return (
    <header className="header">
      <div className="header-top">
        <h1 className="title">Unlimited Wordle</h1>
        <div className="header-actions" />
      </div>
      <div className="header-controls">
        <div className="mode-group">
          <ModeSwitch
            checked={mode === 'wordubado'}
            disabled={busy}
            onToggle={() =>
              requestSwitch({
                mode: mode === 'wordubado' ? 'normal' : 'wordubado',
              })
            }
          />
        </div>
        <LengthPicker
          value={length}
          disabled={busy}
          onChange={(n) => requestSwitch({ length: n })}
        />
      </div>
    </header>
  )
}
