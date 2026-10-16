import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/gameStore'

// Always-mounted polite region. A manual popover is re-raised above every newly
// opened dialog so showModal()'s inert page never silences it (07-05, D-12).
export default function LiveRegion({ raiseKey }: { raiseKey: string | null }) {
  const text = useGameStore((s) => s.announcement?.text ?? '')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    try {
      if (el.matches(':popover-open')) el.hidePopover()
    } catch {
      /* popover API missing (jsdom, old browsers) */
    }
    try {
      el.showPopover?.()
    } catch {
      /* ignore */
    }
  }, [raiseKey])

  return (
    <div
      id="live-region"
      ref={ref}
      className="visually-hidden live-region"
      popover="manual"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ border: 0, padding: 0, inset: 'auto' }}
    >
      {text}
    </div>
  )
}
