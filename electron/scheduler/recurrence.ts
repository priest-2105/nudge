export interface ZonedParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
  weekday: number // 0=Sunday..6=Saturday, matches Date.getDay()
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
}

/** Reads the wall-clock date/time `instant` corresponds to in `timeZone`. */
export function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  }).formatToParts(instant)

  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24, 
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0
  }
}

/**
 * Converts a local wall-clock date/time in `timeZone` to the UTC instant it
 * represents. The timezone offset at that instant is exactly what we're
 * solving for, so this resolves it iteratively (guess → observe → correct)
 * rather than assuming a fixed offset — that's what makes it correct across
 * DST transitions instead of silently drifting by an hour twice a year.
 */
export function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
): Date {
  const desiredUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0)
  let guess = desiredUtc

  for (let i = 0; i < 3; i++) {
    const observed = getZonedParts(new Date(guess), timeZone)
    const observedUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      0
    )
    const diff = desiredUtc - observedUtc
    if (diff === 0) break
    guess += diff
  }

  return new Date(guess)
}

/**
 * Next UTC instant strictly after `fromUtc` at which `localTime` ("HH:MM")
 * occurs in `timeZone` on one of `daysOfWeek` (0=Sunday..6=Saturday). An
 * empty `daysOfWeek` matches any day (used for one-off alarms, where the
 * caller is expected to have already validated the target date separately).
 */
export function nextLocalTimeTrigger(
  localTime: string,
  timeZone: string,
  daysOfWeek: number[],
  fromUtc: Date
): Date {
  const [hour, minute] = localTime.split(':').map(Number)
  const fromParts = getZonedParts(fromUtc, timeZone)

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidate = zonedTimeToUtc(
      { year: fromParts.year, month: fromParts.month, day: fromParts.day + dayOffset, hour, minute },
      timeZone
    )
    const matchesDay = daysOfWeek.length === 0 || daysOfWeek.includes(getZonedParts(candidate, timeZone).weekday)
    if (matchesDay && candidate.getTime() > fromUtc.getTime()) {
      return candidate
    }
  }

  throw new Error(
    `nextLocalTimeTrigger: no matching day found within 7 days for daysOfWeek=${JSON.stringify(daysOfWeek)}`
  )
}

/**
 * Next `nextTriggerAt` for an Alarm — either the next matching weekday (for
 * recurring alarms, daysOfWeek non-empty) or the fixed instant of a one-off
 * alarm's `specificDate` (daysOfWeek empty). One-off alarms return the exact
 * instant regardless of `fromUtc`, since there's only ever one occurrence to
 * compute — callers are responsible for the "missed by more than the grace
 * window" check from requirement.md §5.2, not this function.
 */
export function nextAlarmTrigger(
  localTime: string,
  timeZone: string,
  daysOfWeek: number[],
  specificDate: string | undefined,
  fromUtc: Date
): Date {
  if (daysOfWeek.length > 0) {
    return nextLocalTimeTrigger(localTime, timeZone, daysOfWeek, fromUtc)
  }
  if (!specificDate) {
    throw new Error('one-off alarms require specificDate when daysOfWeek is empty')
  }
  const [year, month, day] = specificDate.split('-').map(Number)
  const [hour, minute] = localTime.split(':').map(Number)
  return zonedTimeToUtc({ year, month, day, hour, minute }, timeZone)
}

/**
 * Next `nextTriggerAt` for a Reminder after it fires. Returns null for
 * one-off reminders ('none') — the caller should disable it rather than
 * reschedule.
 */
export function nextReminderTrigger(
  recurrence: 'none' | 'daily' | 'weekly' | 'custom',
  recurrenceIntervalMinutes: number | undefined,
  firedAt: Date
): Date | null {
  switch (recurrence) {
    case 'none':
      return null
    case 'daily':
      return new Date(firedAt.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(firedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'custom':
      if (!recurrenceIntervalMinutes || recurrenceIntervalMinutes <= 0) {
        throw new Error('custom recurrence requires a positive recurrenceIntervalMinutes')
      }
      return new Date(firedAt.getTime() + recurrenceIntervalMinutes * 60 * 1000)
  }
}
