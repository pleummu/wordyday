import { useEffect, useRef } from 'react'
import { LOAD_ERROR, TRY_AGAIN } from '../state/copy'

export default function LoadError({ onRetry }: { onRetry: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
  }, [])
  return (
    <section className="banner banner-error" role="alert">
      <p className="banner-body">{LOAD_ERROR}</p>
      <button
        ref={button}
        type="button"
        className="play-again"
        data-own-enter
        onClick={onRetry}
      >
        {TRY_AGAIN}
      </button>
    </section>
  )
}
