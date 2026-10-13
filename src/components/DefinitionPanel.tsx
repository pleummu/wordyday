import { useEffect, useRef, useState } from 'react'
import {
  cachedDefinition,
  lookupDefinition,
  type Sense,
} from '../logic/definition'
import {
  DEFINITION_CREDIT,
  DEFINITION_LOADING,
  DEFINITION_REGION,
  DEFINITION_UNAVAILABLE,
  TRY_AGAIN,
} from '../state/copy'

type View = 'loading' | 'unavailable' | Sense[]

// API text is rendered as React text nodes only, never as HTML.
export default function DefinitionPanel({
  word,
  focusOnMount,
}: {
  word: string
  focusOnMount: boolean
}) {
  const [view, setView] = useState<View>(
    () => cachedDefinition(word) ?? 'loading',
  )
  const [attempt, setAttempt] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
    // Focus once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cachedDefinition(word)) return
    const ctl = new AbortController()
    // Lookup start is an external-system sync; the view must read 'loading' during it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView('loading')
    lookupDefinition(word, { signal: ctl.signal }).then(
      (senses) => {
        if (!ctl.signal.aborted) setView(senses)
      },
      () => {
        if (!ctl.signal.aborted) setView('unavailable')
      },
    )
    return () => ctl.abort()
  }, [word, attempt])

  return (
    <div
      ref={ref}
      className="definition"
      role="region"
      aria-label={DEFINITION_REGION}
      aria-live="polite"
      aria-busy={view === 'loading' ? 'true' : undefined}
      tabIndex={-1}
    >
      {view === 'loading' && (
        <p className="definition-status">{DEFINITION_LOADING}</p>
      )}
      {view === 'unavailable' && (
        <>
          <p className="definition-status">{DEFINITION_UNAVAILABLE}</p>
          <button
            type="button"
            className="definition-retry"
            data-own-enter
            onClick={() => {
              setAttempt((n) => n + 1)
              ref.current?.focus()
            }}
          >
            {TRY_AGAIN}
          </button>
        </>
      )}
      {Array.isArray(view) && (
        <>
          <dl className="definition-senses">
            {view.map((s, i) => (
              <div className="definition-row" key={i}>
                <dt>{s.pos}</dt>
                <dd>{s.text}</dd>
              </div>
            ))}
          </dl>
          <p className="definition-credit">{DEFINITION_CREDIT}</p>
        </>
      )}
    </div>
  )
}
