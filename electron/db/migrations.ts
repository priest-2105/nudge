import type { Database } from 'sql.js'
import log from 'electron-log'
import { DEFAULT_SETTINGS } from '../../src/shared/defaultSettings'

interface Migration {
  version: number
  up: (db: Database) => void
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.run(`
        CREATE TABLE reminders (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          nextTriggerAt TEXT NOT NULL,
          recurrence TEXT NOT NULL,
          recurrenceIntervalMinutes INTEGER,
          fired INTEGER NOT NULL DEFAULT 0,
          enabled INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL,
          lastTriggeredAt TEXT
        )
      `)
      db.run('CREATE INDEX idx_reminders_due ON reminders (nextTriggerAt, enabled)')

      db.run(`
        CREATE TABLE alarms (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          localTime TEXT NOT NULL,
          timezone TEXT NOT NULL,
          daysOfWeek TEXT NOT NULL,
          specificDate TEXT,
          soundId TEXT NOT NULL,
          snoozeEnabled INTEGER NOT NULL DEFAULT 1,
          snoozeMinutes INTEGER NOT NULL DEFAULT 9,
          enabled INTEGER NOT NULL DEFAULT 1,
          nextTriggerAt TEXT NOT NULL
        )
      `)
      db.run('CREATE INDEX idx_alarms_due ON alarms (nextTriggerAt, enabled)')

      db.run(`
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          timesPerDay INTEGER NOT NULL,
          scheduleMode TEXT NOT NULL,
          windowStart TEXT NOT NULL,
          windowEnd TEXT NOT NULL,
          occurrenceTimes TEXT NOT NULL,
          timezone TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL
        )
      `)

      db.run(`
        CREATE TABLE task_occurrence_log (
          id TEXT PRIMARY KEY,
          taskId TEXT NOT NULL REFERENCES tasks(id),
          scheduledFor TEXT NOT NULL,
          completedAt TEXT,
          date TEXT NOT NULL
        )
      `)
      db.run(
        'CREATE INDEX idx_task_occurrence_log_task_date ON task_occurrence_log (taskId, date)'
      )

      db.run(`
        CREATE TABLE task_streaks (
          taskId TEXT PRIMARY KEY REFERENCES tasks(id),
          currentStreak INTEGER NOT NULL DEFAULT 0,
          longestStreak INTEGER NOT NULL DEFAULT 0,
          lastCompletedDate TEXT
        )
      `)

      db.run(`
        CREATE TABLE settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          json TEXT NOT NULL
        )
      `)
      db.run('INSERT INTO settings (id, json) VALUES (1, ?)', [JSON.stringify(DEFAULT_SETTINGS)])
    }
  }
]

export function runMigrations(db: Database): void {
  db.run('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)')

  const versionResult = db.exec('SELECT MAX(version) AS v FROM schema_version')
  const currentVersion = (versionResult[0]?.values[0]?.[0] as number | null) ?? 0

  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version)

  for (const migration of pending) {
    db.run('BEGIN')
    try {
      migration.up(db)
      db.run('INSERT INTO schema_version (version) VALUES (?)', [migration.version])
      db.run('COMMIT')
      log.info(`[db] applied migration ${migration.version}`)
    } catch (err) {
      db.run('ROLLBACK')
      throw err
    }
  }
}
