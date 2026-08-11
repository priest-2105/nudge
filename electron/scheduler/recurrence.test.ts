import { describe, expect, it } from 'vitest'
import {
  getZonedParts,
  nextAlarmTrigger,
  nextLocalTimeTrigger,
  nextReminderTrigger,
  zonedTimeToUtc
} from './recurrence'

describe('zonedTimeToUtc / getZonedParts round-trip', () => {
  it('round-trips a local wall-clock time through a timezone conversion', () => {
    const parts = { year: 2026, month: 6, day: 15, hour: 7, minute: 30 }
    const utc = zonedTimeToUtc(parts, 'America/New_York')
    const observed = getZonedParts(utc, 'America/New_York')
    expect(observed.year).toBe(parts.year)
    expect(observed.month).toBe(parts.month)
    expect(observed.day).toBe(parts.day)
    expect(observed.hour).toBe(parts.hour)
    expect(observed.minute).toBe(parts.minute)
  })

  it('round-trips correctly for a non-UTC-offset timezone (Africa/Lagos, UTC+1)', () => {
    const parts = { year: 2026, month: 1, day: 10, hour: 22, minute: 15 }
    const utc = zonedTimeToUtc(parts, 'Africa/Lagos')
    const observed = getZonedParts(utc, 'Africa/Lagos')
    expect(observed).toMatchObject(parts)
  })
})

describe('nextLocalTimeTrigger — timezone change does not shift the local hour', () => {
  it('produces the same local wall-clock trigger time in two different timezones', () => {
    const fromUtc = new Date('2026-08-10T00:00:00Z')
    const nyTrigger = nextLocalTimeTrigger('07:30', 'America/New_York', [], fromUtc)
    const lagosTrigger = nextLocalTimeTrigger('07:30', 'Africa/Lagos', [], fromUtc)

    // Same wall-clock time, different UTC instants — proves the calculation
    // is anchored to local time + zone, not a cached UTC offset.
    expect(getZonedParts(nyTrigger, 'America/New_York').hour).toBe(7)
    expect(getZonedParts(lagosTrigger, 'Africa/Lagos').hour).toBe(7)
    expect(nyTrigger.getTime()).not.toBe(lagosTrigger.getTime())
  })
})

describe('nextLocalTimeTrigger — DST transitions', () => {
  it('keeps 07:30 local across the US spring-forward transition (2026-03-08)', () => {
    const beforeTransition = nextLocalTimeTrigger(
      '07:30',
      'America/New_York',
      [],
      new Date('2026-03-07T00:00:00Z')
    )
    const afterTransition = nextLocalTimeTrigger('07:30', 'America/New_York', [], beforeTransition)

    const beforeParts = getZonedParts(beforeTransition, 'America/New_York')
    const afterParts = getZonedParts(afterTransition, 'America/New_York')

    // Local wall-clock time is unchanged on both sides of the jump...
    expect(beforeParts.hour).toBe(7)
    expect(beforeParts.minute).toBe(30)
    expect(afterParts.hour).toBe(7)
    expect(afterParts.minute).toBe(30)
    expect(afterParts.day).toBe(beforeParts.day + 1)

    // ...even though clocks sprang forward, so the UTC gap between the two
    // occurrences is 23h, not 24h. A naive fixed-offset implementation would
    // get this wrong and silently fire an hour early or late.
    expect(afterTransition.getTime() - beforeTransition.getTime()).toBe(23 * 60 * 60 * 1000)
  })

  it('keeps 07:30 local across the US fall-back transition (2026-11-01)', () => {
    const beforeTransition = nextLocalTimeTrigger(
      '07:30',
      'America/New_York',
      [],
      new Date('2026-10-31T00:00:00Z')
    )
    const afterTransition = nextLocalTimeTrigger('07:30', 'America/New_York', [], beforeTransition)

    expect(getZonedParts(afterTransition, 'America/New_York').hour).toBe(7)
    expect(getZonedParts(afterTransition, 'America/New_York').minute).toBe(30)

    // Clocks fell back, so this gap is 25h, not 24h.
    expect(afterTransition.getTime() - beforeTransition.getTime()).toBe(25 * 60 * 60 * 1000)
  })
})

describe('nextLocalTimeTrigger — daysOfWeek filtering', () => {
  it('only returns instants that fall on one of the requested weekdays', () => {
    // 2026-08-10 is a Monday (weekday 1). Ask for Wed/Fri only (3, 5).
    const fromUtc = new Date('2026-08-10T00:00:00Z')
    const trigger = nextLocalTimeTrigger('09:00', 'UTC', [3, 5], fromUtc)
    expect([3, 5]).toContain(getZonedParts(trigger, 'UTC').weekday)
  })

  it('throws if no matching day exists (unsatisfiable daysOfWeek)', () => {
    expect(() =>
      nextLocalTimeTrigger('09:00', 'UTC', [99], new Date('2026-08-10T00:00:00Z'))
    ).toThrow()
  })
})

describe('nextAlarmTrigger', () => {
  it('fires on the correct recurring weekday, including across a DST boundary', () => {
    // 2026-03-08 is a Sunday and the US spring-forward date. Ask for a
    // weekly Sunday 07:00 alarm and confirm two consecutive occurrences
    // both land on Sunday at the correct local wall-clock time.
    const first = nextAlarmTrigger('07:00', 'America/New_York', [0], undefined, new Date('2026-03-01T00:00:00Z'))
    const second = nextAlarmTrigger('07:00', 'America/New_York', [0], undefined, first)

    expect(getZonedParts(first, 'America/New_York').weekday).toBe(0)
    expect(getZonedParts(first, 'America/New_York').hour).toBe(7)
    expect(getZonedParts(second, 'America/New_York').weekday).toBe(0)
    expect(getZonedParts(second, 'America/New_York').hour).toBe(7)
    // Exactly 7 days apart in wall-clock terms, even though the DST jump
    // happened in between.
    expect(getZonedParts(second, 'America/New_York').day - getZonedParts(first, 'America/New_York').day).toBe(7)
  })

  it('computes the exact instant for a one-off alarm from its specificDate', () => {
    const trigger = nextAlarmTrigger('09:15', 'UTC', [], '2026-12-25', new Date('2026-01-01T00:00:00Z'))
    expect(getZonedParts(trigger, 'UTC')).toMatchObject({ year: 2026, month: 12, day: 25, hour: 9, minute: 15 })
  })

  it('throws for a one-off alarm missing specificDate', () => {
    expect(() => nextAlarmTrigger('09:15', 'UTC', [], undefined, new Date())).toThrow()
  })
})

describe('nextReminderTrigger', () => {
  const firedAt = new Date('2026-08-10T12:00:00Z')

  it('returns null for one-off reminders', () => {
    expect(nextReminderTrigger('none', undefined, firedAt)).toBeNull()
  })

  it('adds 24h for daily recurrence', () => {
    const next = nextReminderTrigger('daily', undefined, firedAt)
    expect(next?.getTime()).toBe(firedAt.getTime() + 24 * 60 * 60 * 1000)
  })

  it('adds 7 days for weekly recurrence', () => {
    const next = nextReminderTrigger('weekly', undefined, firedAt)
    expect(next?.getTime()).toBe(firedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  })

  it('adds the configured interval for custom recurrence', () => {
    const next = nextReminderTrigger('custom', 90, firedAt)
    expect(next?.getTime()).toBe(firedAt.getTime() + 90 * 60 * 1000)
  })

  it('throws for custom recurrence without a positive interval', () => {
    expect(() => nextReminderTrigger('custom', undefined, firedAt)).toThrow()
    expect(() => nextReminderTrigger('custom', 0, firedAt)).toThrow()
  })
})
