import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from './migrations'
import {
  applyReminderFired,
  createAlarm,
  createReminder,
  deleteAlarm,
  deleteReminder,
  getAppSettings,
  getDueAlarms,
  getDueReminders,
  listAlarms,
  listReminders,
  updateAlarm,
  updateReminder
} from './queries'

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
  db.run('DELETE FROM reminders')
  db.run('DELETE FROM alarms')
})

describe('migrations', () => {
  it('seeds a default settings row', () => {
    const settings = getAppSettings(db)
    expect(settings.overlayPosition).toBe('bottom-right')
    expect(settings.clockWidget.enabled).toBe(false)
  })
})

describe('reminders CRUD + due-detection round trip', () => {
  it('creates, lists, updates, and deletes a reminder', () => {
    const created = createReminder(db, {
      title: 'Drink water',
      message: 'Fill up your glass',
      nextTriggerAt: new Date(Date.now() + 60_000).toISOString(),
      recurrence: 'none',
      enabled: true
    })

    expect(listReminders(db)).toHaveLength(1)
    expect(listReminders(db)[0].id).toBe(created.id)

    const updated = updateReminder(db, created.id, { title: 'Drink more water' })
    expect(updated.title).toBe('Drink more water')
    expect(listReminders(db)[0].title).toBe('Drink more water')

    deleteReminder(db, created.id)
    expect(listReminders(db)).toHaveLength(0)
  })

  it('only surfaces reminders whose nextTriggerAt has passed', () => {
    const past = createReminder(db, {
      title: 'Overdue',
      message: '',
      nextTriggerAt: new Date(Date.now() - 60_000).toISOString(),
      recurrence: 'none',
      enabled: true
    })
    createReminder(db, {
      title: 'Future',
      message: '',
      nextTriggerAt: new Date(Date.now() + 60_000).toISOString(),
      recurrence: 'none',
      enabled: true
    })

    const due = getDueReminders(db, new Date())
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe(past.id)
  })

  it('disables a one-off reminder once fired, so it never re-fires', () => {
    const reminder = createReminder(db, {
      title: 'Once',
      message: '',
      nextTriggerAt: new Date(Date.now() - 1000).toISOString(),
      recurrence: 'none',
      enabled: true
    })

    expect(getDueReminders(db, new Date())).toHaveLength(1)
    applyReminderFired(db, reminder.id, new Date().toISOString(), null)
    expect(getDueReminders(db, new Date())).toHaveLength(0)
    expect(listReminders(db)[0].enabled).toBe(false)
  })

  it('reschedules a recurring reminder instead of disabling it', () => {
    const reminder = createReminder(db, {
      title: 'Daily',
      message: '',
      nextTriggerAt: new Date(Date.now() - 1000).toISOString(),
      recurrence: 'daily',
      enabled: true
    })

    const next = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    applyReminderFired(db, reminder.id, new Date().toISOString(), next)

    const stored = listReminders(db)[0]
    expect(stored.enabled).toBe(true)
    expect(stored.fired).toBe(false)
    expect(stored.nextTriggerAt).toBe(next)
    expect(getDueReminders(db, new Date())).toHaveLength(0)
  })
})

describe('alarms CRUD + JSON daysOfWeek round trip', () => {
  it('creates, lists, updates, and deletes an alarm, preserving daysOfWeek', () => {
    const created = createAlarm(db, {
      label: 'Wake up',
      localTime: '07:30',
      timezone: 'America/New_York',
      daysOfWeek: [1, 2, 3, 4, 5],
      soundId: 'default',
      snoozeEnabled: true,
      snoozeMinutes: 9,
      enabled: true,
      nextTriggerAt: new Date(Date.now() + 60_000).toISOString()
    })

    expect(listAlarms(db)).toHaveLength(1)
    expect(listAlarms(db)[0].daysOfWeek).toEqual([1, 2, 3, 4, 5])

    const updated = updateAlarm(db, created.id, { label: 'Rise and shine' })
    expect(updated.label).toBe('Rise and shine')
    expect(updated.daysOfWeek).toEqual([1, 2, 3, 4, 5])

    deleteAlarm(db, created.id)
    expect(listAlarms(db)).toHaveLength(0)
  })

  it('only surfaces alarms whose nextTriggerAt has passed and are enabled', () => {
    createAlarm(db, {
      label: 'Overdue',
      localTime: '07:30',
      timezone: 'UTC',
      daysOfWeek: [],
      soundId: 'default',
      snoozeEnabled: true,
      snoozeMinutes: 9,
      enabled: true,
      nextTriggerAt: new Date(Date.now() - 60_000).toISOString()
    })
    createAlarm(db, {
      label: 'Disabled but overdue',
      localTime: '07:30',
      timezone: 'UTC',
      daysOfWeek: [],
      soundId: 'default',
      snoozeEnabled: true,
      snoozeMinutes: 9,
      enabled: false,
      nextTriggerAt: new Date(Date.now() - 60_000).toISOString()
    })

    const due = getDueAlarms(db, new Date())
    expect(due).toHaveLength(1)
    expect(due[0].label).toBe('Overdue')
  })
})
