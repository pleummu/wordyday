import { distRowLabel } from '../state/copy'

export function Stat({
  value,
  label,
  full,
  valueHidden = false,
}: {
  value: string
  label: string
  full?: string
  valueHidden?: boolean
}) {
  return (
    <div className="stat">
      <span className="stat-value" aria-hidden={valueHidden ? 'true' : undefined}>
        {value}
      </span>
      {full ? (
        <>
          <span className="stat-label" aria-hidden="true">
            {label}
          </span>
          <span className="visually-hidden">{full}</span>
        </>
      ) : (
        <span className="stat-label">{label}</span>
      )}
    </div>
  )
}

export function DistChart({
  dist,
  highlightRow,
}: {
  dist: readonly number[]
  highlightRow: number | null
}) {
  const maxCount = Math.max(...dist, 0)
  return (
    <ol className="dist">
      {dist.map((count, i) => {
        const row = i + 1
        const latest = highlightRow === row
        const width =
          maxCount > 0 ? `max(24px, ${(count / maxCount) * 100}%)` : '24px'
        return (
          <li
            key={row}
            className="dist-row"
            aria-label={distRowLabel(row, count, latest)}
          >
            <span className="dist-num" aria-hidden="true">
              {row}
            </span>
            <span className="dist-track" aria-hidden="true">
              <span
                className="dist-bar"
                data-highlight={latest ? '' : undefined}
                style={{ width }}
              >
                {count}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
