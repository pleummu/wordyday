import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  titleId: string
  bodyId: string
  fallbackFocus?: () => HTMLElement | null
  children: ReactNode
}

const CLOSE_MS = 120

function prefersReducedMotion(): boolean {
  return (
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )
}

export default function Modal({
  open,
  onClose,
  titleId,
  bodyId,
  fallbackFocus,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)
  const wasOpen = useRef(false)
  const fallback = useRef(fallbackFocus)
  useEffect(() => {
    fallback.current = fallbackFocus
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      wasOpen.current = true
      dialog.removeAttribute('data-closing')
      opener.current = document.activeElement
      if (!dialog.open) dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false

    let timer: ReturnType<typeof setTimeout> | undefined
    function finish() {
      const d = ref.current
      if (!d) return
      d.close()
      d.removeAttribute('data-closing')
      const active = document.activeElement
      if (active !== document.body && !d.contains(active)) return
      const o = opener.current
      if (
        o instanceof HTMLElement &&
        o.isConnected &&
        o !== document.body &&
        !o.closest('dialog')
      ) {
        o.focus()
      } else {
        fallback.current?.()?.focus()
      }
    }
    if (prefersReducedMotion()) {
      finish()
    } else {
      dialog.setAttribute('data-closing', '')
      timer = setTimeout(finish, CLOSE_MS)
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [open])

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== 'Tab') return
    const buttons = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
    ).filter((b) => !b.disabled)
    if (buttons.length === 0) return
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={onKeyDown}
    >
      <div className="modal-card">{children}</div>
    </dialog>
  )
}
