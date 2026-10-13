import { useEffect, useRef, type CSSProperties } from 'react'
import { TOAST_LIFE_MS } from '../state/copy'

export type ToastData = {
  id: number
  text: string
  kind: 'error' | 'info'
  lifeMs?: number
}

type ToastProps = {
  toast: ToastData | null
  onDismiss: (id: number) => void
  // Changing this re-raises the layer above any dialog opened since.
  raiseKey?: string | null
  // False drops role and aria-live (the text is announced elsewhere).
  announce?: boolean
}

export default function Toast({
  toast,
  onDismiss,
  raiseKey = null,
  announce = true,
}: ToastProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const id = toast?.id
  const life = toast?.lifeMs ?? TOAST_LIFE_MS
  useEffect(() => {
    if (id === undefined) return
    const timer = setTimeout(() => onDismiss(id), life)
    return () => clearTimeout(timer)
  }, [id, life, onDismiss])

  const present = id !== undefined
  useEffect(() => {
    const el = layerRef.current
    if (!el) return
    // The popover API may be missing (jsdom, old browsers): fall back to the fixed layer.
    const guard = (fn: () => void) => {
      try {
        fn()
      } catch {
        /* ignore */
      }
    }
    // hidePopover is harmless when already hidden in the stubbed/absent cases.
    guard(() => {
      if (typeof el.hidePopover === 'function') {
        let open: boolean
        try {
          open = el.matches(':popover-open')
        } catch {
          open = true
        }
        if (open) el.hidePopover()
      }
    })
    if (present) guard(() => el.showPopover?.())
  }, [present, id, raiseKey])

  return (
    <div className="toast-layer" ref={layerRef} popover="manual">
      {toast && (
        <div
          key={toast.id}
          className="toast"
          data-kind={toast.kind}
          style={{ '--toast-life': life } as CSSProperties}
          role={
            announce ? (toast.kind === 'error' ? 'alert' : 'status') : undefined
          }
          aria-live={
            announce
              ? toast.kind === 'error'
                ? 'assertive'
                : 'polite'
              : undefined
          }
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
