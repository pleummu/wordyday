import { useEffect, type CSSProperties } from 'react'

export type ToastData = {
  id: number
  text: string
  kind: 'error' | 'info'
  lifeMs?: number
}

type ToastProps = {
  toast: ToastData | null
  onDismiss: (id: number) => void
}

const TOAST_LIFE_MS = 1860

export default function Toast({ toast, onDismiss }: ToastProps) {
  const id = toast?.id
  const life = toast?.lifeMs ?? TOAST_LIFE_MS
  useEffect(() => {
    if (id === undefined) return
    const timer = setTimeout(() => onDismiss(id), life)
    return () => clearTimeout(timer)
  }, [id, life, onDismiss])

  return (
    <div className="toast-layer">
      {toast && (
        <div
          key={toast.id}
          className="toast"
          data-kind={toast.kind}
          style={{ '--toast-life': life } as CSSProperties}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
