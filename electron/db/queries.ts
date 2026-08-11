import { randomUUID } from 'crypto'
import type { Database } from 'sql.js'
import type {
  Alarm,
  AppSettings,
  NewAlarm,
  NewReminder,
  NewTask,
  Reminder,
  Task,
  TaskOccurrenceLog,
  TaskStreak
} from '../../src/shared/types'

function queryReminders(db: Database, sql: string, params: (string | number)[] = []): Reminder[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: Reminder[] = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: r.id as string,
      title: r.title as string,
      message: r.message as string,
      nextTriggerAt: r.nextTriggerAt as string,
      recurrence: r.recurrence as Reminder['recurrence'],
      recurrenceIntervalMinutes: (r.recurrenceIntervalMinutes as number | null) ?? undefined,
      fired: Boolean(r.fired),
      enabled: Boolean(r.enabled),
      createdAt: r.createdAt as string,
      lastTriggeredAt: (r.lastTriggeredAt as string | null) ?? undefined
    })
  }
  stmt.free()
  return rows
}

function queryAlarms(db: Database, sql: string, params: (string | number)[] = []): Alarm[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: Alarm[] = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: r.id as string,
      label: r.label as string,
      localTime: r.localTime as string,
      timezone: r.timezone as string,
      daysOfWeek: JSON.parse(r.daysOfWeek as string) as number[],
      specificDate: (r.specificDate as string | null) ?? undefined,
      soundId: r.soundId as string,
      snoozeEnabled: Boolean(r.snoozeEnabled),
      snoozeMinutes: r.snoozeMinutes as number,
      enabled: Boolean(r.enabled),
      nextTriggerAt: r.nextTriggerAt as string
    })
  }
  stmt.free()
  return rows
}

/** Reminders due to fire: enabled, not already fired, and past their nextTriggerAt. */
export function getDueReminders(db: Database, now: Date): Reminder[] {
  return queryReminders(
    db,
    'SELECT * FROM reminders WHERE enabled = 1 AND fired = 0 AND nextTriggerAt <= ? ORDER BY nextTriggerAt ASC',
    [now.toISOString()]
  )
}

/** Alarms due to ring: enabled and past their nextTriggerAt. */
export function getDueAlarms(db: Database, now: Date): Alarm[] {
  return queryAlarms(
    db,
    'SELECT * FROM alarms WHERE enabled = 1 AND nextTriggerAt <= ? ORDER BY nextTriggerAt ASC',
    [now.toISOString()]
  )
}

/**
 * Marks a reminder as fired and records the next occurrence's trigger time.
 * Passing `nextTriggerAt: null` (one-off reminders) disables the reminder
 * instead of leaving it permanently "fired" and due.
 */
export function applyReminderFired(
  db: Database,
  reminderId: string,
  firedAtIso: string,
  nextTriggerAtIso: string | null
): void {
  if (nextTriggerAtIso) {
    db.run(
      'UPDATE reminders SET fired = 0, lastTriggeredAt = ?, nextTriggerAt = ? WHERE id = ?',
      [firedAtIso, nextTriggerAtIso, reminderId]
    )
  } else {
    db.run(
      'UPDATE reminders SET fired = 1, enabled = 0, lastTriggeredAt = ? WHERE id = ?',
      [firedAtIso, reminderId]
    )
  }
}

export function listReminders(db: Database): Reminder[] {
  return queryReminders(db, 'SELECT * FROM reminders ORDER BY nextTriggerAt ASC')
}

export function createReminder(db: Database, input: NewReminder): Reminder {
  const reminder: Reminder = {
    id: randomUUID(),
    title: input.title,
    message: input.message,
    nextTriggerAt: input.nextTriggerAt,
    recurrence: input.recurrence,
    recurrenceIntervalMinutes: input.recurrenceIntervalMinutes,
    fired: false,
    enabled: input.enabled,
    createdAt: new Date().toISOString(),
    lastTriggeredAt: undefined
  }
  db.run(
    `INSERT INTO reminders
      (id, title, message, nextTriggerAt, recurrence, recurrenceIntervalMinutes, fired, enabled, createdAt, lastTriggeredAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
    [
      reminder.id,
      reminder.title,
      reminder.message,
      reminder.nextTriggerAt,
      reminder.recurrence,
      reminder.recurrenceIntervalMinutes ?? null,
      reminder.enabled ? 1 : 0,
      reminder.createdAt
    ]
  )
  return reminder
}

export function updateReminder(db: Database, id: string, patch: Partial<Reminder>): Reminder {
  const existing = queryReminders(db, 'SELECT * FROM reminders WHERE id = ?', [id])[0]
  if (!existing) throw new Error(`Reminder not found: ${id}`)
  const merged: Reminder = { ...existing, ...patch, id }

  db.run(
    `UPDATE reminders
     SET title = ?, message = ?, nextTriggerAt = ?, recurrence = ?, recurrenceIntervalMinutes = ?,
         fired = ?, enabled = ?, lastTriggeredAt = ?
     WHERE id = ?`,
    [
      merged.title,
      merged.message,
      merged.nextTriggerAt,
      merged.recurrence,
      merged.recurrenceIntervalMinutes ?? null,
      merged.fired ? 1 : 0,
      merged.enabled ? 1 : 0,
      merged.lastTriggeredAt ?? null,
      id
    ]
  )
  return merged
}

export function deleteReminder(db: Database, id: string): void {
  db.run('DELETE FROM reminders WHERE id = ?', [id])
}

export function listAlarms(db: Database): Alarm[] {
  return queryAlarms(db, 'SELECT * FROM alarms ORDER BY nextTriggerAt ASC')
}

export function createAlarm(db: Database, input: NewAlarm): Alarm {
  const alarm: Alarm = { id: randomUUID(), ...input }
  db.run(
    `INSERT INTO alarms
      (id, label, localTime, timezone, daysOfWeek, specificDate, soundId, snoozeEnabled, snoozeMinutes, enabled, nextTriggerAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      alarm.id,
      alarm.label,
      alarm.localTime,
      alarm.timezone,
      JSON.stringify(alarm.daysOfWeek),
      alarm.specificDate ?? null,
      alarm.soundId,
      alarm.snoozeEnabled ? 1 : 0,
      alarm.snoozeMinutes,
      alarm.enabled ? 1 : 0,
      alarm.nextTriggerAt
    ]
  )
  return alarm
}

export function updateAlarm(db: Database, id: string, patch: Partial<Alarm>): Alarm {
  const existing = queryAlarms(db, 'SELECT * FROM alarms WHERE id = ?', [id])[0]
  if (!existing) throw new Error(`Alarm not found: ${id}`)
  const merged: Alarm = { ...existing, ...patch, id }

  db.run(
    `UPDATE alarms
     SET label = ?, localTime = ?, timezone = ?, daysOfWeek = ?, specificDate = ?, soundId = ?,
         snoozeEnabled = ?, snoozeMinutes = ?, enabled = ?, nextTriggerAt = ?
     WHERE id = ?`,
    [
      merged.label,
      merged.localTime,
      merged.timezone,
      JSON.stringify(merged.daysOfWeek),
      merged.specificDate ?? null,
      merged.soundId,
      merged.snoozeEnabled ? 1 : 0,
      merged.snoozeMinutes,
      merged.enabled ? 1 : 0,
      merged.nextTriggerAt,
      id
    ]
  )
  return merged
}

export function deleteAlarm(db: Database, id: string): void {
  db.run('DELETE FROM alarms WHERE id = ?', [id])
}

function rowToTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    timesPerDay: r.timesPerDay as number,
    scheduleMode: r.scheduleMode as Task['scheduleMode'],
    windowStart: r.windowStart as string,
    windowEnd: r.windowEnd as string,
    occurrenceTimes: JSON.parse(r.occurrenceTimes as string) as string[],
    timezone: r.timezone as string,
    enabled: Boolean(r.enabled),
    createdAt: r.createdAt as string
  }
}

function queryTasks(db: Database, sql: string, params: (string | number)[] = []): Task[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: Task[] = []
  while (stmt.step()) rows.push(rowToTask(stmt.getAsObject()))
  stmt.free()
  return rows
}

export function listTasks(db: Database): Task[] {
  return queryTasks(db, 'SELECT * FROM tasks ORDER BY createdAt ASC')
}

export function createTask(db: Database, input: NewTask): Task {
  const task: Task = { id: randomUUID(), ...input, createdAt: new Date().toISOString() }
  db.run(
    `INSERT INTO tasks
      (id, title, timesPerDay, scheduleMode, windowStart, windowEnd, occurrenceTimes, timezone, enabled, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.timesPerDay,
      task.scheduleMode,
      task.windowStart,
      task.windowEnd,
      JSON.stringify(task.occurrenceTimes),
      task.timezone,
      task.enabled ? 1 : 0,
      task.createdAt
    ]
  )
  return task
}

export function updateTask(db: Database, id: string, patch: Partial<Task>): Task {
  const existing = queryTasks(db, 'SELECT * FROM tasks WHERE id = ?', [id])[0]
  if (!existing) throw new Error(`Task not found: ${id}`)
  const merged: Task = { ...existing, ...patch, id }

  db.run(
    `UPDATE tasks
     SET title = ?, timesPerDay = ?, scheduleMode = ?, windowStart = ?, windowEnd = ?,
         occurrenceTimes = ?, timezone = ?, enabled = ?
     WHERE id = ?`,
    [
      merged.title,
      merged.timesPerDay,
      merged.scheduleMode,
      merged.windowStart,
      merged.windowEnd,
      JSON.stringify(merged.occurrenceTimes),
      merged.timezone,
      merged.enabled ? 1 : 0,
      id
    ]
  )
  return merged
}

export function deleteTask(db: Database, id: string): void {
  db.run('DELETE FROM tasks WHERE id = ?', [id])
  db.run('DELETE FROM task_occurrence_log WHERE taskId = ?', [id])
  db.run('DELETE FROM task_streaks WHERE taskId = ?', [id])
}

function rowToOccurrence(r: Record<string, unknown>): TaskOccurrenceLog {
  return {
    id: r.id as string,
    taskId: r.taskId as string,
    scheduledFor: r.scheduledFor as string,
    completedAt: (r.completedAt as string | null) ?? undefined,
    date: r.date as string
  }
}

function queryOccurrences(
  db: Database,
  sql: string,
  params: (string | number)[] = []
): TaskOccurrenceLog[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: TaskOccurrenceLog[] = []
  while (stmt.step()) rows.push(rowToOccurrence(stmt.getAsObject()))
  stmt.free()
  return rows
}

export function getOccurrencesForDate(db: Database, taskId: string, date: string): TaskOccurrenceLog[] {
  return queryOccurrences(
    db,
    'SELECT * FROM task_occurrence_log WHERE taskId = ? AND date = ? ORDER BY scheduledFor ASC',
    [taskId, date]
  )
}

/** True if any occurrence rows already exist for `taskId` on `date` (used to detect the day hasn't been generated yet). */
export function hasOccurrencesForDate(db: Database, taskId: string, date: string): boolean {
  return getOccurrencesForDate(db, taskId, date).length > 0
}

export function generateOccurrencesForDate(
  db: Database,
  taskId: string,
  date: string,
  occurrenceTimes: string[]
): void {
  for (const scheduledFor of occurrenceTimes) {
    db.run(
      'INSERT INTO task_occurrence_log (id, taskId, scheduledFor, completedAt, date) VALUES (?, ?, ?, NULL, ?)',
      [randomUUID(), taskId, scheduledFor, date]
    )
  }
}

export function completeOccurrence(db: Database, occurrenceId: string, completedAtIso: string): void {
  db.run('UPDATE task_occurrence_log SET completedAt = ? WHERE id = ?', [completedAtIso, occurrenceId])
}

export function getTaskStreak(db: Database, taskId: string): TaskStreak {
  const stmt = db.prepare('SELECT * FROM task_streaks WHERE taskId = ?')
  stmt.bind([taskId])
  const found = stmt.step()
  const row = found ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return { taskId, currentStreak: 0, longestStreak: 0, lastCompletedDate: undefined }
  return {
    taskId: row.taskId as string,
    currentStreak: row.currentStreak as number,
    longestStreak: row.longestStreak as number,
    lastCompletedDate: (row.lastCompletedDate as string | null) ?? undefined
  }
}

export function saveTaskStreak(db: Database, streak: TaskStreak): void {
  db.run(
    `INSERT INTO task_streaks (taskId, currentStreak, longestStreak, lastCompletedDate)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(taskId) DO UPDATE SET
       currentStreak = excluded.currentStreak,
       longestStreak = excluded.longestStreak,
       lastCompletedDate = excluded.lastCompletedDate`,
    [streak.taskId, streak.currentStreak, streak.longestStreak, streak.lastCompletedDate ?? null]
  )
}

/** The `settings` table always has exactly one row (id=1), seeded by migration 1. */
export function getAppSettings(db: Database): AppSettings {
  const stmt = db.prepare('SELECT json FROM settings WHERE id = 1')
  stmt.step()
  const row = stmt.getAsObject()
  stmt.free()
  return JSON.parse(row.json as string) as AppSettings
}

export function updateAppSettings(db: Database, patch: Partial<AppSettings>): AppSettings {
  const existing = getAppSettings(db)
  const merged: AppSettings = {
    ...existing,
    ...patch,
    clockWidget: { ...existing.clockWidget, ...patch.clockWidget }
  }
  db.run('UPDATE settings SET json = ? WHERE id = 1', [JSON.stringify(merged)])
  return merged
}
