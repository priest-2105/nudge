import type { Database } from 'sql.js'
import type { Task } from '../../src/shared/types'
import {
  generateOccurrencesForDate,
  getOccurrencesForDate,
  getTaskStreak,
  hasOccurrencesForDate,
  saveTaskStreak
} from '../db/queries'
import { getZonedParts } from './recurrence'
import { computeStreakAfterDay, isDayComplete } from './taskStreak'

export function localDateString(instant: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(instant, timeZone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function previousDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1, d - 1))
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`
}

/**
 * Ensures today's occurrence rows exist for `task`, running yesterday's
 * streak rollover first if the local-day boundary was just crossed. Safe to
 * call on every tick — a no-op once today's rows already exist, which is
 * also how this handles the "app was closed over midnight" case per
 * requirement.md §6: the next tick after launch just finds no rows for
 * today and runs rollover then, instead of needing a dedicated timer.
 */
export function ensureTodayOccurrences(db: Database, task: Task, now: Date): void {
  const today = localDateString(now, task.timezone)
  if (hasOccurrencesForDate(db, task.id, today)) return

  const yesterday = previousDateString(today)
  const yesterdaysOccurrences = getOccurrencesForDate(db, task.id, yesterday)
  if (yesterdaysOccurrences.length > 0) {
    const complete = isDayComplete(yesterdaysOccurrences, task.timesPerDay)
    const streak = getTaskStreak(db, task.id)
    saveTaskStreak(db, computeStreakAfterDay(streak, yesterday, complete))
  }

  generateOccurrencesForDate(db, task.id, today, task.occurrenceTimes)
}
