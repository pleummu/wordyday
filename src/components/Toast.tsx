import { useEffect } from 'react'

export type ToastData = { id: number; text: string; kind: 'error' | 'info' }

type ToastProps = {
  toast: ToastData | null
  onDismiss: (id: number) => void
}

const TOAST_LIFE_MS = 1860

export default function Toast({ toast, onDismiss }: ToastProps) {
  const id = toast?.id
  useEffect(() => {
    if (id === undefined) return
    const timer = setTimeout(() => onDismiss(id), TOAST_LIFE_MS)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div className="toast-layer">
      {toast && (
        <div
          key={toast.id}
          className="toast"
          data-kind={toast.kind}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
