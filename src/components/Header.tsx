import { boardKey, type SavedGame } from '../logic/save'
import type { WordLength } from '../logic/boards'
import { useGameStore } from '../state/gameStore'
import InfoButton from './InfoButton'
import LengthPicker from './LengthPicker'
import ModeSwitch from './ModeSwitch'

export default function Header() {
  const mode = useGameStore((s) => s.mode)
  const length = useGameStore((s) => s.length)
  const status = useGameStore((s) => s.status)
  const switchBoard = useGameStore((s) => s.switchBoard)
  const boards = useGameStore((s) => s.boards)
  const openInfo = useGameStore((s) => s.openInfo)
  const inProgress: Partial<Record<WordLength, boolean>> = {}
  for (const n of [4, 5, 6] as const) {
    const g: SavedGame | undefined = boards[boardKey(mode, n)]
    inProgress[n] = g?.outcome === 'playing' && g.guesses.length > 0
  }
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
              switchBoard({
                mode: mode === 'wordubado' ? 'normal' : 'wordubado',
              })
            }
          />
          <InfoButton onOpen={openInfo} />
        </div>
        <LengthPicker
          value={length}
          inProgress={inProgress}
          disabled={busy}
          onChange={(n) => switchBoard({ length: n })}
        />
      </div>
    </header>
  )
}
