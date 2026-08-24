import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../db/migrations'
import { createReminder } from '../db/queries'
import { DEFAULT_SETTINGS } from '../../src/shared/defaultSettings'
import type { AppSettings } from '../../src/shared/types'
import { checkPeekPreviews } from './peekPreview'

let db: Database
const settings: AppSettings = { ...DEFAULT_SETTINGS, peekPreview: { ...DEFAULT_SETTINGS.peekPreview, leadMinutes: 5 } }

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
})

describe('checkPeekPreviews', () => {
  it('fires once for a reminder inside the lead window, and does not re-fire on a later call for the same due time', () => {
    const reminder = createReminder(db, {
      title: 'Drink water',
      message: '',
      recurrence: 'none',
      nextTriggerAt: new Date('2026-08-10T12:03:00Z').toISOString(),
      enabled: true
    })

    const emitted: string[] = []
    const emit = (kind: string, title: string): void => {
      emitted.push(`${kind}:${title}`)
    }

    checkPeekPreviews(db, settings, new Date('2026-08-10T12:00:00Z'), emit)
    expect(emitted).toEqual(['reminder:Drink water'])

    // A later tick, still before the reminder is due — must not re-fire.
    checkPeekPreviews(db, settings, new Date('2026-08-10T12:01:00Z'), emit)
    expect(emitted).toEqual(['reminder:Drink water'])

    void reminder
  })

  it('does not fire for a reminder outside the lead window', () => {
    createReminder(db, {
      title: 'Far off',
      message: '',
      recurrence: 'none',
      nextTriggerAt: new Date('2026-08-10T13:00:00Z').toISOString(),
      enabled: true
    })

    const emitted: string[] = []
    checkPeekPreviews(db, settings, new Date('2026-08-10T12:00:00Z'), (kind, title) =>
      emitted.push(`${kind}:${title}`)
    )
    expect(emitted).toEqual([])
  })

  it('does not fire for a disabled reminder', () => {
    createReminder(db, {
      title: 'Paused',
      message: '',
      recurrence: 'none',
      nextTriggerAt: new Date('2026-08-10T12:02:00Z').toISOString(),
      enabled: false
    })

    const emitted: string[] = []
    checkPeekPreviews(db, settings, new Date('2026-08-10T12:00:00Z'), (kind, title) =>
      emitted.push(`${kind}:${title}`)
    )
    expect(emitted).toEqual([])
  })

  it('does not fire when reminders are disabled in settings', () => {
    createReminder(db, {
      title: 'Should be skipped',
      message: '',
      recurrence: 'none',
      nextTriggerAt: new Date('2026-08-10T12:02:00Z').toISOString(),
      enabled: true
    })

    const emitted: string[] = []
    const offSettings: AppSettings = {
      ...settings,
      peekPreview: { ...settings.peekPreview, remindersEnabled: false }
    }
    checkPeekPreviews(db, offSettings, new Date('2026-08-10T12:00:00Z'), (kind, title) =>
      emitted.push(`${kind}:${title}`)
    )
    expect(emitted).toEqual([])
  })
})
