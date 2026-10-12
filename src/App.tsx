import Banner from './components/Banner'
import Grid from './components/Grid'
import ForfeitRow from './components/ForfeitRow'
import GiveUpConfirm from './components/GiveUpConfirm'
import Header from './components/Header'
import Keyboard from './components/Keyboard'
import LoadError from './components/LoadError'
import LoadingNotice from './components/LoadingNotice'
import NewGameConfirm from './components/NewGameConfirm'
import ResetConfirm from './components/ResetConfirm'
import RestorePrompt from './components/RestorePrompt'
import StreakBreakModal from './components/StreakBreakModal'
import SettingsModal from './components/SettingsModal'
import ResultModal from './components/ResultModal'
import StatsModal from './components/StatsModal'
import Toast from './components/Toast'
import WordubadoInfo from './components/WordubadoInfo'
import { usePhysicalKeyboard } from './components/usePhysicalKeyboard'
import { BOARD_CONFIG } from './logic/boards'
import { canForfeit } from './logic/save'
import { isBusy, isFinished, useGameStore } from './state/gameStore'

export default function App() {
  usePhysicalKeyboard()
  const mode = useGameStore((s) => s.mode)
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
  const retryLoad = useGameStore((s) => s.retryLoad)
  const finishedInSession = useGameStore((s) => s.finishedInSession)
  const openResult = useGameStore((s) => s.openResult)
  const busy = useGameStore(isBusy)

  const showRow = canForfeit(status, rows.length, BOARD_CONFIG[length].attempts)

  function onKey(key: string) {
    const store = useGameStore.getState()
    if (key === 'enter') store.submit()
    else if (key === 'backspace') store.backspace()
    else store.typeLetter(key)
  }

  return (
    <div
      className="app"
      data-mode={mode}
      data-forfeit={showRow ? 'true' : undefined}
    >
      <Toast toast={toast} onDismiss={dismissToast} />
      <WordubadoInfo />
      <GiveUpConfirm />
      <NewGameConfirm />
      <SettingsModal />
      <StatsModal />
      <ResultModal />
      <ResetConfirm />
      <RestorePrompt />
      <StreakBreakModal />
      <LoadingNotice active={status === 'loading'} />
      <Header />
      <main className="board-area">
        <Grid
          length={length}
          rows={rows}
          current={current}
          status={status}
          shakeId={shakeId}
          shakeRow={shakeRow}
          celebrate={finishedInSession}
        />
      </main>
      <ForfeitRow />
      <div className="controls">
        {isFinished(status) ? (
          <Banner
            status={status as 'won' | 'lost' | 'gave-up'}
            answer={answer}
            attemptsUsed={rows.length}
            busy={busy}
            onSeeResult={openResult}
            onPlayAgain={playAgain}
          />
        ) : status === 'error' ? (
          <LoadError onRetry={retryLoad} />
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
