import { describe, expect, it } from 'vitest'
import {
  creditDay,
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
