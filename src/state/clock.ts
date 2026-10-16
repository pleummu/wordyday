// The only clock-reading helpers (with the store's defaultDeps). R-DATE-3.

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

// Local calendar day as YYYY-MM-DD (R-DATE-1).
export function localDateKey(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Milliseconds until the next local midnight, built from local fields so a DST
// day is 23 or 25 hours. Never below 1000; a small buffer avoids firing early.
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  )
  return Math.max(1000, next.getTime() - now.getTime() + 50)
}
