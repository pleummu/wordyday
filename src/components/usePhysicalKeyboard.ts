import { useEffect } from 'react'
import { isInputBlocked, useGameStore } from '../state/gameStore'

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
        isInputBlocked(store) ||
        document.querySelector('dialog[open]') !== null
      ) {
        return
      }
      // So the next Enter submits instead of re-activating a focused header button.
      const blurFocus = () => {
        const a = document.activeElement
        if (a instanceof HTMLElement && a !== document.body) a.blur()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!e.repeat) store.submit()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        blurFocus()
        store.backspace()
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        blurFocus()
        store.typeLetter(e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
