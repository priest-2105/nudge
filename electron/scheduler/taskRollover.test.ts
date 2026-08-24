import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../db/migrations'
import {
  completeOccurrence,
  createTask,
  getOccurrencesForDate,
  getTaskStreak
} from '../db/queries'
import { ensureTodayOccurrences } from './taskRollover'

let db: Database

beforeAll(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database()
  runMigrations(db)
})

afterAll(() => {
  db.close()
})

beforeEach(() => {
  db.run('DELETE FROM tasks')
  db.run('DELETE FROM task_occurrence_log')
  db.run('DELETE FROM task_streaks')
})

describe('ensureTodayOccurrences', () => {
  it('generates occurrence rows for today on first call, and is a no-op on a second call the same day', () => {
    const task = createTask(db, {
      title: 'Drink water',
      timesPerDay: 3,
      scheduleMode: 'manual',
      windowStart: '08:00',
      windowEnd: '20:00',
      occurrenceTimes: ['09:00', '13:00', '17:00'],
      timezone: 'UTC',
      enabled: true,
      pinned: true
    })

    const now = new Date('2026-08-10T10:00:00Z')
    ensureTodayOccurrences(db, task, now)
    expect(getOccurrencesForDate(db, task.id, '2026-08-10')).toHaveLength(3)

    ensureTodayOccurrences(db, task, new Date('2026-08-10T15:00:00Z'))
    expect(getOccurrencesForDate(db, task.id, '2026-08-10')).toHaveLength(3)
  })

  it('rolls a fully-completed day into an incremented streak when the day boundary is crossed', () => {
    const task = createTask(db, {
      title: 'Drink water',
      timesPerDay: 2,
      scheduleMode: 'manual',
      windowStart: '08:00',
      windowEnd: '20:00',
      occurrenceTimes: ['09:00', '17:00'],
      timezone: 'UTC',
      enabled: true,
      pinned: true
    })

    ensureTodayOccurrences(db, task, new Date('2026-08-10T09:00:00Z'))
    for (const occ of getOccurrencesForDate(db, task.id, '2026-08-10')) {
      completeOccurrence(db, occ.id, new Date('2026-08-10T18:00:00Z').toISOString())
    }

    // Next tick lands on 2026-08-11 — the day boundary has been crossed.
    ensureTodayOccurrences(db, task, new Date('2026-08-11T09:00:00Z'))

    const streak = getTaskStreak(db, task.id)
    expect(streak.currentStreak).toBe(1)
    expect(streak.lastCompletedDate).toBe('2026-08-10')
    expect(getOccurrencesForDate(db, task.id, '2026-08-11')).toHaveLength(2)
  })

  it('breaks the streak to 0 when yesterday was only partially completed', () => {
    const task = createTask(db, {
      title: 'Drink water',
      timesPerDay: 2,
      scheduleMode: 'manual',
      windowStart: '08:00',
      windowEnd: '20:00',
      occurrenceTimes: ['09:00', '17:00'],
      timezone: 'UTC',
      enabled: true,
      pinned: true
    })

    ensureTodayOccurrences(db, task, new Date('2026-08-10T09:00:00Z'))
    const [first] = getOccurrencesForDate(db, task.id, '2026-08-10')
    completeOccurrence(db, first.id, new Date('2026-08-10T09:05:00Z').toISOString())
    // Second occurrence left uncompleted.

    ensureTodayOccurrences(db, task, new Date('2026-08-11T09:00:00Z'))

    expect(getTaskStreak(db, task.id).currentStreak).toBe(0)
  })

  it('generates the first day for an unpinned task but does not roll it into a second day', () => {
    const task = createTask(db, {
      title: 'One-off errand',
      timesPerDay: 1,
      scheduleMode: 'manual',
      windowStart: '08:00',
      windowEnd: '20:00',
      occurrenceTimes: ['09:00'],
      timezone: 'UTC',
      enabled: true,
      pinned: false
    })

    ensureTodayOccurrences(db, task, new Date('2026-08-10T09:00:00Z'))
    expect(getOccurrencesForDate(db, task.id, '2026-08-10')).toHaveLength(1)

    // Day boundary crossed — an unpinned task should not regenerate.
    ensureTodayOccurrences(db, task, new Date('2026-08-11T09:00:00Z'))
    expect(getOccurrencesForDate(db, task.id, '2026-08-11')).toHaveLength(0)
  })

  it('keeps rolling a pinned task forward across multiple day boundaries', () => {
    const task = createTask(db, {
      title: 'Drink water',
      timesPerDay: 1,
      scheduleMode: 'manual',
      windowStart: '08:00',
      windowEnd: '20:00',
      occurrenceTimes: ['09:00'],
      timezone: 'UTC',
      enabled: true,
      pinned: true
    })

    ensureTodayOccurrences(db, task, new Date('2026-08-10T09:00:00Z'))
    ensureTodayOccurrences(db, task, new Date('2026-08-11T09:00:00Z'))
    expect(getOccurrencesForDate(db, task.id, '2026-08-11')).toHaveLength(1)
  })
})
