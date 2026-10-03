import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import './styles/game.css'
import App from './App.tsx'
import { useGameStore } from './state/gameStore'

// Resume the last Board (or start a fresh one) outside React effects (StrictMode would run it twice).
void useGameStore.getState().resume()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
