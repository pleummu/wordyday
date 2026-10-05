import { afterEach, describe, expect, it } from 'vitest'
import {
  check,
  creditDay,
  decline,
  restore,
  dayNumber,
  missedDays,
  monthOf,
  prevDay,
  refill,
  restoresLeft,
  type StreakSlice,
} from './streaks'

const slice = (
  current: number,
  longest: number,
  lastActiveDate: string | null,
): StreakSlice => ({
  dayStreak: { current, longest, lastActiveDate },
  restores: { month: '2026-06', used: 0 },
  pendingRestore: null,
})

describe('creditDay', () => {
  it('EC-08 creditDay from a null lastActiveDate gives current 1, longest 1', () => {
    const r = creditDay(slice(0, 0, null), '2026-06-03')
    expect(r.credited).toBe(true)
    expect(r.slice.dayStreak).toEqual({
      current: 1,
      longest: 1,
      lastActiveDate: '2026-06-03',
    })
  })

  it('EC-32 several games in one day credit once', () => {
    const a = creditDay(slice(4, 4, '2026-06-02'), '2026-06-03')
    expect(a.slice.dayStreak.current).toBe(5)
    expect(a.credited).toBe(true)
    const b = creditDay(a.slice, '2026-06-03')
    expect(b.slice.dayStreak.current).toBe(5)
    expect(b.credited).toBe(false)
  })

  it('EC-33/EC-34/EC-35 the credit does not depend on the outcome', () => {
    expect(creditDay.length).toBe(2)
  })

  it('EC-41 longest only goes up', () => {
    const r = creditDay(slice(3, 8, '2026-06-02'), '2026-06-03')
    expect(r.slice.dayStreak.current).toBe(4)
    expect(r.slice.dayStreak.longest).toBe(8)
  })

  it('EC-30 clock backwards gives no credit', () => {
    const s = slice(5, 5, '2026-06-10')
    const r = creditDay(s, '2026-06-05')
    expect(r.slice).toBe(s)
    expect(r.credited).toBe(false)
  })
})

describe('date maths', () => {
  it('EC-25 maths', () => {
    expect(missedDays('2028-02-28', '2028-03-01')).toBe(1)
    expect(missedDays('2027-02-28', '2027-03-01')).toBe(0)
  })

  it('EC-24 maths', () => {
    expect(missedDays('2026-12-30', '2027-01-02')).toBe(2)
    expect(monthOf('2027-01-02')).toBe('2027-01')
  })

  it('EC-29 maths', () => {
    expect(missedDays('2026-06-10', '2026-06-05')).toBe(0)
    expect(missedDays(null, '2026-06-05')).toBe(0)
  })

  it('prevDay crosses month, leap and year boundaries', () => {
    expect(prevDay('2026-03-01')).toBe('2026-02-28')
    expect(prevDay('2028-03-01')).toBe('2028-02-29')
    expect(prevDay('2027-01-01')).toBe('2026-12-31')
  })

  it('dayNumber differs by 1 for consecutive days', () => {
    expect(dayNumber('2026-06-04') - dayNumber('2026-06-03')).toBe(1)
  })
})

describe('restores', () => {
  it('EC-31 refill never moves back', () => {
    const r = { month: '2026-07', used: 2 }
    expect(refill(r, '2026-06-20')).toEqual(r)
    expect(refill({ month: '2026-06', used: 3 }, '2026-07-01')).toEqual({
      month: '2026-07',
      used: 0,
    })
    expect(refill({ month: '', used: 0 }, '2026-06-03')).toEqual({
      month: '2026-06',
      used: 0,
    })
  })

  it('EC-44 maths', () => {
    expect(restoresLeft({ month: '2026-06', used: 7 })).toBe(0)
    expect(restoresLeft({ month: '2026-06', used: -2 })).toBe(3)
    expect(restoresLeft({ month: '2026-06', used: 1 })).toBe(2)
  })
})

// Node's process is not in the browser tsconfig types.
const env = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> }
  }
).process.env

const mk = (
  s: number,
  longest: number,
  lad: string | null,
  r = { month: '2026-06', used: 0 },
  pending: StreakSlice['pendingRestore'] = null,
): StreakSlice => ({
  dayStreak: { current: s, longest, lastActiveDate: lad },
  restores: r,
  pendingRestore: pending,
})

const pend = (streak: number, missed: number, creditDeferred = false) => ({
  streak,
  missed,
  creditDeferred,
})

describe('check (CHECK on open)', () => {
  it('EC-01 same day is unchanged', () => {
    const s = mk(5, 5, '2026-06-03')
    const r = check(s, '2026-06-03')
    expect(r.slice).toEqual(s)
    expect(r.effect).toBe('none')
    expect(r.resetWinStreaks).toBe(false)
  })

  it('EC-02 yesterday is unchanged', () => {
    const r = check(mk(5, 5, '2026-06-02'), '2026-06-03')
    expect(r.slice).toEqual(mk(5, 5, '2026-06-02'))
    expect(r.effect).toBe('none')
    expect(r.resetWinStreaks).toBe(false)
  })

  it('EC-03 one missed day offers a Restore', () => {
    const r = check(mk(5, 5, '2026-06-01'), '2026-06-03')
    expect(r.effect).toBe('prompt')
    expect(r.resetWinStreaks).toBe(true)
    expect(r.slice.pendingRestore).toEqual(pend(5, 1))
    expect(restoresLeft(r.slice.restores)).toBe(3)
  })

  it('EC-04 four missed days still offers a Restore', () => {
    const r = check(mk(5, 5, '2026-06-01'), '2026-06-06')
    expect(r.effect).toBe('prompt')
    expect(r.slice.pendingRestore).toEqual(pend(5, 4))
  })

  it('EC-05 five missed days resets with no prompt', () => {
    const r = check(mk(5, 5, '2026-06-01'), '2026-06-07')
    expect(r.effect).toBe('broke')
    expect(r.slice.dayStreak.current).toBe(0)
    expect(r.slice.dayStreak.longest).toBe(5)
    expect(r.slice.pendingRestore).toBeNull()
    expect(r.resetWinStreaks).toBe(true)
  })

  it('EC-06 a zero streak after a gap resets Win Streaks with no prompt', () => {
    const r = check(mk(0, 5, '2026-06-01'), '2026-06-04')
    expect(r.effect).toBe('none')
    expect(r.resetWinStreaks).toBe(true)
    expect(r.slice.pendingRestore).toBeNull()
  })

  it('EC-07 no Restores left resets with no prompt', () => {
    const r = check(
      mk(5, 5, '2026-06-01', { month: '2026-06', used: 3 }),
      '2026-06-03',
    )
    expect(r.effect).toBe('broke')
    expect(r.slice.dayStreak.current).toBe(0)
  })

  it('EC-08 a null lastActiveDate changes nothing', () => {
    const r = check(mk(0, 0, null), '2026-06-03')
    expect(r.slice.dayStreak).toEqual({
      current: 0,
      longest: 0,
      lastActiveDate: null,
    })
    expect(r.effect).toBe('none')
    expect(r.resetWinStreaks).toBe(false)
  })

  it('EC-09 idempotent while pending', () => {
    const first = check(mk(5, 5, '2026-06-01'), '2026-06-03')
    const second = check(first.slice, '2026-06-03')
    expect(second.slice).toEqual(first.slice)
    expect(second.effect).toBe('none')
  })

  it('EC-10 idempotent after a reset', () => {
    const first = check(mk(5, 5, '2026-06-01'), '2026-06-08')
    const second = check(first.slice, '2026-06-08')
    expect(second.slice).toEqual(first.slice)
    expect(second.effect).toBe('none')
  })

  it('EC-11 pending stays after a reload and used stays 0', () => {
    const first = check(mk(5, 5, '2026-06-01'), '2026-06-03')
    const again = check(
      JSON.parse(JSON.stringify(first.slice)) as StreakSlice,
      '2026-06-03',
    )
    expect(again.slice.pendingRestore).toEqual(pend(5, 1))
    expect(again.slice.restores.used).toBe(0)
  })

  it('EC-12 an offer that is no longer eligible is auto-declined', () => {
    const r = check(mk(5, 5, '2026-06-01', undefined, pend(5, 1)), '2026-06-08')
    expect(r.slice.dayStreak.current).toBe(0)
    expect(r.slice.pendingRestore).toBeNull()
    expect(r.effect).toBe('broke')
  })
})

describe('restore and decline', () => {
  const pending = () => check(mk(5, 5, '2026-06-01'), '2026-06-03').slice

  it('EC-13 restore keeps the streak and sets lastActiveDate to yesterday', () => {
    const r = restore(pending(), '2026-06-03')
    expect(r.applied).toBe(true)
    expect(r.slice.dayStreak).toEqual({
      current: 5,
      longest: 5,
      lastActiveDate: '2026-06-02',
    })
    expect(r.slice.restores.used).toBe(1)
    expect(r.slice.pendingRestore).toBeNull()
  })

  it('EC-14 playing after a Restore credits today', () => {
    const r = restore(pending(), '2026-06-03')
    const c = creditDay(r.slice, '2026-06-03')
    expect(c.slice.dayStreak).toEqual({
      current: 6,
      longest: 6,
      lastActiveDate: '2026-06-03',
    })
  })

  it('EC-15 not playing after a Restore prompts again the next day', () => {
    const r = restore(pending(), '2026-06-03')
    const c = check(r.slice, '2026-06-04')
    expect(c.effect).toBe('prompt')
    expect(c.slice.pendingRestore?.missed).toBe(1)
  })

  it('EC-16 decline resets to 0 and keeps the Restores', () => {
    const s = decline(pending(), '2026-06-03')
    expect(s.dayStreak.current).toBe(0)
    expect(s.pendingRestore).toBeNull()
    expect(s.restores).toEqual({ month: '2026-06', used: 0 })
  })

  it('EC-17 a day credited after declining starts at 1', () => {
    const s = decline(pending(), '2026-06-03')
    expect(creditDay(s, '2026-06-03').slice.dayStreak.current).toBe(1)
  })

  it('EC-18 a second restore is a no-op', () => {
    const once = restore(pending(), '2026-06-03')
    const twice = restore(once.slice, '2026-06-03')
    expect(twice.applied).toBe(false)
    expect(twice.slice.restores.used).toBe(1)
  })

  it('EC-19 one Restore covers a multi-day gap', () => {
    const p = check(mk(9, 9, '2026-06-01'), '2026-06-05').slice
    expect(p.pendingRestore?.missed).toBe(3)
    const r = restore(p, '2026-06-05')
    expect(r.slice.restores.used).toBe(1)
    expect(r.slice.dayStreak.lastActiveDate).toBe('2026-06-04')
    expect(r.slice.dayStreak.current).toBe(9)
  })

  it('EC-20 the third Restore works and a later June gap does not', () => {
    const p = check(
      mk(5, 5, '2026-06-10', { month: '2026-06', used: 2 }),
      '2026-06-12',
    ).slice
    const r = restore(p, '2026-06-12')
    expect(r.slice.restores.used).toBe(3)
    const later = check(
      {
        ...r.slice,
        dayStreak: { current: 6, longest: 6, lastActiveDate: '2026-06-20' },
      },
      '2026-06-22',
    )
    expect(later.effect).toBe('broke')
    expect(later.slice.dayStreak.current).toBe(0)
  })

  it('EC-21 refill on the 1st then the prompt shows 3 left', () => {
    const r = check(
      mk(5, 5, '2026-06-28', { month: '2026-06', used: 3 }),
      '2026-07-01',
    )
    expect(r.effect).toBe('prompt')
    expect(r.slice.restores).toEqual({ month: '2026-07', used: 0 })
    expect(restoresLeft(r.slice.restores)).toBe(3)
  })

  it('EC-22 a Restore on the 1st counts in the new month', () => {
    const p = check(
      mk(5, 5, '2026-06-28', { month: '2026-06', used: 3 }),
      '2026-07-01',
    ).slice
    expect(restore(p, '2026-07-01').slice.restores).toEqual({
      month: '2026-07',
      used: 1,
    })
  })

  it('EC-23 pending since June 30, restored July 1, uses the July count', () => {
    const p = mk(5, 5, '2026-06-28', { month: '2026-06', used: 2 }, pend(5, 1))
    const r = restore(p, '2026-07-01')
    expect(r.slice.restores).toEqual({ month: '2026-07', used: 1 })
    expect(r.slice.dayStreak.lastActiveDate).toBe('2026-06-30')
  })

  it('creditDeferred: accept credits today after the Restore', () => {
    const p = mk(5, 5, '2026-06-01', undefined, pend(5, 1, true))
    expect(restore(p, '2026-06-03').slice.dayStreak).toEqual({
      current: 6,
      longest: 6,
      lastActiveDate: '2026-06-03',
    })
  })

  it('creditDeferred: decline credits today as day 1', () => {
    const p = mk(5, 5, '2026-06-01', undefined, pend(5, 1, true))
    expect(decline(p, '2026-06-03').dayStreak).toEqual({
      current: 1,
      longest: 5,
      lastActiveDate: '2026-06-03',
    })
  })
})

describe('calendar edges', () => {
  it('EC-24 year boundary', () => {
    const r = check(
      mk(5, 5, '2026-12-30', { month: '2026-12', used: 1 }),
      '2027-01-02',
    )
    expect(r.effect).toBe('prompt')
    expect(r.slice.restores).toEqual({ month: '2027-01', used: 0 })
  })

  it('EC-25 leap day', () => {
    const r = check(
      mk(5, 5, '2028-02-27', { month: '2028-02', used: 0 }),
      '2028-03-01',
    )
    expect(r.effect).toBe('prompt')
    expect(r.slice.pendingRestore?.missed).toBe(2)
    const none = check(
      mk(5, 5, '2027-02-28', { month: '2027-02', used: 0 }),
      '2027-03-01',
    )
    expect(none.effect).toBe('none')
  })

  describe.each([
    'UTC',
    'America/Los_Angeles',
    'Pacific/Auckland',
    'Asia/Kolkata',
  ])('time zone %s', (tz) => {
    const old = env.TZ
    afterEach(() => {
      if (old === undefined) delete env.TZ
      else env.TZ = old
    })

    it('EC-26 EC-27 EC-28 results do not depend on the zone', () => {
      env.TZ = tz
      expect(
        check(mk(5, 5, '2026-06-01'), '2026-06-03').slice.pendingRestore,
      ).toEqual(pend(5, 1))
      expect(check(mk(5, 5, '2026-06-01'), '2026-06-07').effect).toBe('broke')
      // EC-26: a spring-forward weekend
      expect(
        check(
          mk(5, 5, '2026-03-07', { month: '2026-03', used: 0 }),
          '2026-03-09',
        ).slice.pendingRestore,
      ).toEqual(pend(5, 1))
      // EC-27: a fall-back weekend
      expect(
        check(
          mk(5, 5, '2026-10-31', { month: '2026-10', used: 0 }),
          '2026-11-02',
        ).slice.pendingRestore,
      ).toEqual(pend(5, 1))
    })
  })

  it('EC-29 a clock moved backwards changes nothing', () => {
    const r = check(mk(5, 5, '2026-06-10'), '2026-06-05')
    expect(r.slice).toEqual(mk(5, 5, '2026-06-10'))
    expect(r.effect).toBe('none')
    expect(r.resetWinStreaks).toBe(false)
  })

  it('EC-31 an earlier month never lowers the Restore month', () => {
    const r = check(
      mk(5, 5, '2026-06-20', { month: '2026-07', used: 2 }),
      '2026-06-22',
    )
    expect(r.slice.restores).toEqual({ month: '2026-07', used: 2 })
  })
})

describe('win streaks, Best and counts', () => {
  it('EC-37 a missed day resets Win Streaks', () => {
    expect(check(mk(5, 5, '2026-06-01'), '2026-06-03').resetWinStreaks).toBe(
      true,
    )
    expect(check(mk(5, 5, '2026-06-01'), '2026-06-09').resetWinStreaks).toBe(
      true,
    )
  })

  it('EC-38 a restore result carries no Win Streak revival', () => {
    const r = restore(
      check(mk(5, 5, '2026-06-01'), '2026-06-03').slice,
      '2026-06-03',
    )
    expect(Object.keys(r.slice).sort()).toEqual([
      'dayStreak',
      'pendingRestore',
      'restores',
    ])
  })

  it('EC-42 decline keeps the longest streak', () => {
    const p = check(mk(9, 9, '2026-06-01'), '2026-06-03').slice
    expect(decline(p, '2026-06-03').dayStreak.longest).toBe(9)
  })

  it('EC-43 the count is taken before the Restore is used', () => {
    const r = check(
      mk(12, 12, '2026-06-01', { month: '2026-06', used: 1 }),
      '2026-06-03',
    )
    expect(r.slice.pendingRestore?.streak).toBe(12)
    expect(restoresLeft(refill(r.slice.restores, '2026-06-03'))).toBe(2)
  })

  it('EC-44 a tampered used count leaves none and gives no prompt', () => {
    const s = mk(5, 5, '2026-06-01', { month: '2026-06', used: 7 })
    expect(restoresLeft(s.restores)).toBe(0)
    expect(check(s, '2026-06-03').effect).toBe('broke')
  })
})
