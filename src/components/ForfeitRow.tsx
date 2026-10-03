import { BOARD_CONFIG } from '../logic/boards'
import { canForfeit } from '../logic/save'
import { GIVE_UP, NEW_GAME } from '../state/copy'
import { useGameStore } from '../state/gameStore'

export default function ForfeitRow() {
  const status = useGameStore((s) => s.status)
  const attempts = useGameStore((s) => s.rows.length)
  const length = useGameStore((s) => s.length)
  const openDialog = useGameStore((s) => s.openDialog)

  if (!canForfeit(status, attempts, BOARD_CONFIG[length].attempts)) return null

  return (
    <div className="forfeit-row">
      <button
        type="button"
        className="forfeit-button"
        data-own-enter
        onClick={() => openDialog('giveUp')}
      >
        {GIVE_UP}
      </button>
      <button
        type="button"
        className="forfeit-button"
        data-own-enter
        onClick={() => openDialog('newGame')}
      >
        {NEW_GAME}
      </button>
    </div>
  )
}
