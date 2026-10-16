import { useGameStore } from '../state/gameStore'
import LengthPicker from './LengthPicker'

export default function Header() {
  const length = useGameStore((s) => s.length)
  const status = useGameStore((s) => s.status)
  const selectLength = useGameStore((s) => s.selectLength)
  return (
    <header className="header">
      <h1 className="title">Unlimited Wordle</h1>
      <LengthPicker
        value={length}
        disabled={status === 'revealing'}
        onChange={selectLength}
      />
      <div className="header-actions" />
    </header>
  )
}
