import Banner from './components/Banner'
import Grid from './components/Grid'
import Header from './components/Header'
import Keyboard from './components/Keyboard'
import Toast from './components/Toast'
import { usePhysicalKeyboard } from './components/usePhysicalKeyboard'
import { BOARD_CONFIG } from './logic/boards'
import { useGameStore } from './state/gameStore'

export default function App() {
  usePhysicalKeyboard()
  const length = useGameStore((s) => s.length)
  const rows = useGameStore((s) => s.rows)
  const current = useGameStore((s) => s.current)
  const status = useGameStore((s) => s.status)
  const answer = useGameStore((s) => s.answer)
  const keyStates = useGameStore((s) => s.keyStates)
  const toast = useGameStore((s) => s.toast)
  const shakeId = useGameStore((s) => s.shakeId)
  const shakeRow = useGameStore((s) => s.shakeRow)
  const dismissToast = useGameStore((s) => s.dismissToast)
  const playAgain = useGameStore((s) => s.playAgain)

  function onKey(key: string) {
    const store = useGameStore.getState()
    if (key === 'enter') store.submit()
    else if (key === 'backspace') store.backspace()
    else store.typeLetter(key)
  }

  return (
    <div className="app">
      <Toast toast={toast} onDismiss={dismissToast} />
      <Header />
      <main className="board-area">
        <Grid
          length={length}
          rows={rows}
          current={current}
          status={status}
          shakeId={shakeId}
          shakeRow={shakeRow}
        />
      </main>
      <div className="controls">
        {status === 'won' || status === 'lost' ? (
          <Banner
            status={status}
            answer={answer}
            attemptsUsed={rows.length}
            maxAttempts={BOARD_CONFIG[length].attempts}
            onPlayAgain={playAgain}
          />
        ) : (
          <Keyboard
            keyStates={keyStates}
            disabled={status === 'loading'}
            onKey={onKey}
          />
        )}
      </div>
    </div>
  )
}
