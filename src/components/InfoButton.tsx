import { ABOUT_WORDUBADO } from '../state/copy'

export default function InfoButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="info-button"
      aria-label={ABOUT_WORDUBADO}
      aria-haspopup="dialog"
      onKeyDown={(e) => {
        // Focus returns here when the popup closes; Enter then submits the
        // guess (Space still opens the popup), same as the Wordubado switch.
        if (e.key === 'Enter') e.preventDefault()
      }}
      onClick={onOpen}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
    </button>
  )
}
