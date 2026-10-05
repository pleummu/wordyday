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

export type CheckEffect = 'none' | 'prompt' | 'broke'

const MAX_MISSED_FOR_RESTORE = 4

function withCredit(s: StreakSlice, deferred: boolean, today: string) {
  return deferred ? creditDay(s, today).slice : s
}

// R-RESTORE-1..4: the missed-day check on open. Refills first, then resets the
// Win Streaks on any missed day and offers a Restore when one is allowed.
export function check(
  s: StreakSlice,
  today: string,
): { slice: StreakSlice; effect: CheckEffect; resetWinStreaks: boolean } {
  const restores = refill(s.restores, today)
  const base = restores === s.restores ? s : { ...s, restores }
  const missed = missedDays(s.dayStreak.lastActiveDate, today)
  if (missed === 0) {
    return { slice: base, effect: 'none', resetWinStreaks: false }
  }
  const current = s.dayStreak.current
  const eligible =
    current > 0 &&
    missed <= MAX_MISSED_FOR_RESTORE &&
    restoresLeft(restores) > 0
  if (s.pendingRestore !== null) {
    if (eligible) {
      return { slice: base, effect: 'none', resetWinStreaks: false }
    }
    // The offer lapsed: auto-decline.
    const declined = withCredit(
      {
        ...base,
        dayStreak: { ...base.dayStreak, current: 0 },
        pendingRestore: null,
      },
      s.pendingRestore.creditDeferred,
      today,
    )
    return { slice: declined, effect: 'broke', resetWinStreaks: true }
  }
  if (current === 0) {
    return { slice: base, effect: 'none', resetWinStreaks: true }
  }
  if (eligible) {
    return {
      slice: {
        ...base,
        pendingRestore: { streak: current, missed, creditDeferred: false },
      },
      effect: 'prompt',
      resetWinStreaks: true,
    }
  }
  return {
    slice: { ...base, dayStreak: { ...base.dayStreak, current: 0 } },
    effect: 'broke',
    resetWinStreaks: true,
  }
}

// R-RESTORE-5..6: one Restore covers the whole gap; lastActiveDate becomes
// yesterday so today can still be credited. Win Streaks are never revived.
export function restore(
  s: StreakSlice,
  today: string,
): { slice: StreakSlice; applied: boolean } {
  const pending = s.pendingRestore
  if (pending === null) return { slice: s, applied: false }
  const restores = refill(s.restores, today)
  if (restoresLeft(restores) === 0) {
    return { slice: decline({ ...s, restores }, today), applied: false }
  }
  const restored: StreakSlice = {
    dayStreak: { ...s.dayStreak, lastActiveDate: prevDay(today) },
    restores: { month: restores.month, used: restores.used + 1 },
    pendingRestore: null,
  }
  return {
    slice: withCredit(restored, pending.creditDeferred, today),
    applied: true,
  }
}

// R-RESTORE-7: No. The Day Streak goes to 0; Best and the Restores are kept.
export function decline(s: StreakSlice, today: string): StreakSlice {
  const pending = s.pendingRestore
  if (pending === null) return s
  return withCredit(
    {
      ...s,
      dayStreak: { ...s.dayStreak, current: 0 },
      pendingRestore: null,
    },
    pending.creditDeferred,
    today,
  )
}
