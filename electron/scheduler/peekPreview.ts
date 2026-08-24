import type { Database } from 'sql.js'
import type { AppSettings } from '../../src/shared/types'
import { getOccurrencesForDate, listAlarms, listReminders, listTasks } from '../db/queries'
import { zonedTimeToUtc } from './recurrence'
import { localDateString } from './taskRollover'

export type PeekKind = 'reminder' | 'task' | 'alarm'

// Tracks occurrences already peeked (key -> due timestamp) so the same
// upcoming trigger doesn't re-peek on every tick within the lead window.
// Pruned each call so it can't grow across app restarts/long sessions.
const peeked = new Map<string, number>()

function prune(now: number, leadMs: number): void {
  for (const [key, dueAt] of peeked) {
    if (dueAt < now - leadMs) peeked.delete(key)
  }
}

function maybePeek(key: string, dueAt: number, now: number, leadMs: number, emit: () => void): void {
  const diff = dueAt - now
  if (diff <= 0 || diff > leadMs) return
  if (peeked.has(key)) return
  peeked.set(key, dueAt)
  emit()
}

/**
 * Checks reminders/tasks/alarms due within `settings.peekPreview.leadMinutes`
 * and fires `emit` once per occurrence when they first enter that window.
 */
export function checkPeekPreviews(
  db: Database,
  settings: AppSettings,
  now: Date,
  emit: (kind: PeekKind, title: string) => void
): void {
  const { leadMinutes, remindersEnabled, tasksEnabled, alarmsEnabled } = settings.peekPreview
  const leadMs = leadMinutes * 60_000
  const nowMs = now.getTime()
  prune(nowMs, leadMs)

  if (remindersEnabled) {
    for (const r of listReminders(db)) {
      if (!r.enabled || r.fired) continue
      const dueAt = new Date(r.nextTriggerAt).getTime()
      maybePeek(`reminder:${r.id}:${r.nextTriggerAt}`, dueAt, nowMs, leadMs, () => emit('reminder', r.title))
    }
  }

  if (alarmsEnabled) {
    for (const a of listAlarms(db)) {
      if (!a.enabled) continue
      const dueAt = new Date(a.nextTriggerAt).getTime()
      maybePeek(`alarm:${a.id}:${a.nextTriggerAt}`, dueAt, nowMs, leadMs, () => emit('alarm', a.label))
    }
  }

  if (tasksEnabled) {
    for (const t of listTasks(db)) {
      if (!t.enabled) continue
      const today = localDateString(now, t.timezone)
      for (const occ of getOccurrencesForDate(db, t.id, today)) {
        if (occ.completedAt) continue
        const [hour, minute] = occ.scheduledFor.split(':').map(Number)
        const [year, month, day] = today.split('-').map(Number)
        const dueAt = zonedTimeToUtc({ year, month, day, hour, minute }, t.timezone).getTime()
        maybePeek(`task:${occ.id}`, dueAt, nowMs, leadMs, () => emit('task', t.title))
      }
    }
  }
}
