import type { DayStreak, PendingRestore, Restores } from './save'

// Pure date maths: today is always an input, never read here (R-DATE-3).

export type StreakSlice = {
  dayStreak: DayStreak
  restores: Restores
  pendingRestore: PendingRestore | null
}

const DAY_MS = 86_400_000
const MAX_RESTORES = 3

function parts(d: string): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number)
  return [y, m, day]
}

export function dayNumber(d: string): number {
  const [y, m, day] = parts(d)
  return Date.UTC(y, m - 1, day) / DAY_MS
}

export function monthOf(d: string): string {
  return d.slice(0, 7)
}

export function prevDay(d: string): string {
  const [y, m, day] = parts(d)
  return new Date(Date.UTC(y, m - 1, day - 1)).toISOString().slice(0, 10)
}

export function missedDays(lad: string | null, today: string): number {
  if (lad === null) return 0
  return Math.max(0, dayNumber(today) - dayNumber(lad) - 1)
}

// Forward only: a clock moved backwards never lowers the month.
export function refill(r: Restores, today: string): Restores {
  const month = monthOf(today)
  return month > r.month ? { month, used: 0 } : r
}

export function restoresLeft(r: Restores): number {
  return Math.min(MAX_RESTORES, Math.max(0, MAX_RESTORES - r.used))
}

// R-RESTORE-8: credit only when today is later than lastActiveDate.
export function creditDay(
  s: StreakSlice,
  today: string,
): { slice: StreakSlice; credited: boolean } {
  const lad = s.dayStreak.lastActiveDate
  if (lad !== null && dayNumber(today) <= dayNumber(lad)) {
    return { slice: s, credited: false }
  }
  const current = s.dayStreak.current + 1
  return {
    slice: {
      ...s,
      dayStreak: {
        current,
        longest: Math.max(s.dayStreak.longest, current),
        lastActiveDate: today,
      },
    },
    credited: true,
  }
}
