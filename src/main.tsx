import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import './styles/game.css'
import App from './App.tsx'
import { defaultSaveStorage, useGameStore } from './state/gameStore'
import { startStreakWatch } from './state/streakWatch'
import { startTabSync } from './state/sync'

// Resume the last Board (or start a fresh one) outside React effects (StrictMode would run it twice).
void useGameStore.getState().resume()
// Missed-day check once at boot, outside React (StrictMode would run it twice).
useGameStore.getState().checkStreaks()
startStreakWatch(useGameStore)
defaultSaveStorage.onNotice((n) =>
  useGameStore.getState().applyStorageNotice(n),
)
startTabSync(useGameStore)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
