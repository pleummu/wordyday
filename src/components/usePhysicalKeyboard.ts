import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'

export function usePhysicalKeyboard(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target
        if (target instanceof Element && target.closest('[data-own-enter]')) {
          return
        }
      }
      const store = useGameStore.getState()
      if (
        store.pendingSwitch !== null ||
        document.querySelector('dialog[open]') !== null
      ) {
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!e.repeat) store.submit()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        store.backspace()
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        store.typeLetter(e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
