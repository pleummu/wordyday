import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import './styles/game.css'
import App from './App.tsx'
import { useGameStore } from './state/gameStore'

// Start the first game outside React effects (StrictMode would run it twice).
void useGameStore.getState().startGame(5)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
