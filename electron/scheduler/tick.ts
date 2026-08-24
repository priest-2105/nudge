import { powerMonitor } from 'electron'
import log from 'electron-log'
import { getDb, persist } from '../db'
import {
  applyReminderFired,
  getAppSettings,
  getDueAlarms,
  getDueReminders,
  getOccurrencesForDate,
  listTasks
} from '../db/queries'
import { enqueueAlarmTrigger, isAlarmActive } from '../windows/alarmWindow'
import {
  enqueueReminderTrigger,
  enqueueTaskTrigger,
  isTaskOccurrencePending,
  triggerPeekPreview
} from '../windows/overlayWindow'
import { checkPeekPreviews } from './peekPreview'
import { nextReminderTrigger, zonedTimeToUtc } from './recurrence'
import { ensureTodayOccurrences, localDateString } from './taskRollover'

const TICK_INTERVAL_MS = 25_000

let tickHandle: NodeJS.Timeout | null = null

export function initScheduler(): void {
  runTick()
  tickHandle = setInterval(runTick, TICK_INTERVAL_MS)

  // A trigger due exactly during sleep would otherwise lag until the next
  // scheduled tick after wake — fire one immediately instead.
  powerMonitor.on('resume', () => {
    log.info('[scheduler] system resumed from sleep — running immediate tick')
    runTick()
  })
}

export function stopScheduler(): void {
  if (tickHandle) clearInterval(tickHandle)
  tickHandle = null
}

function runTick(): void {
  const db = getDb()
  const now = new Date()
  let dirty = false

  for (const reminder of getDueReminders(db, now)) {
    log.info(`[scheduler] reminder due: ${reminder.id} "${reminder.title}"`)
    const next = nextReminderTrigger(reminder.recurrence, reminder.recurrenceIntervalMinutes, now)
    applyReminderFired(db, reminder.id, now.toISOString(), next ? next.toISOString() : null)
    dirty = true
    enqueueReminderTrigger({
      reminderId: reminder.id,
      title: reminder.title,
      message: reminder.message
    })
  }

  // Alarms don't self-reschedule here: per requirement.md §7.2 an alarm
  // rings until the user hits Stop or Snooze, and only that action advances
  // nextTriggerAt. isAlarmActive() prevents re-queuing an alarm that's
  // already ringing/awaiting acknowledgement on every subsequent tick.
  for (const alarm of getDueAlarms(db, now)) {
    if (isAlarmActive(alarm.id)) continue
    log.info(`[scheduler] alarm due: ${alarm.id} "${alarm.label}"`)
    enqueueAlarmTrigger({
      alarmId: alarm.id,
      label: alarm.label,
      soundId: alarm.soundId,
      snoozeEnabled: alarm.snoozeEnabled,
      snoozeMinutes: alarm.snoozeMinutes
    })
  }

  for (const task of listTasks(db)) {
    if (!task.enabled) continue
    ensureTodayOccurrences(db, task, now)
    dirty = true

    const today = localDateString(now, task.timezone)
    for (const occurrence of getOccurrencesForDate(db, task.id, today)) {
      if (occurrence.completedAt || isTaskOccurrencePending(occurrence.id)) continue

      const [hour, minute] = occurrence.scheduledFor.split(':').map(Number)
      const [year, month, day] = today.split('-').map(Number)
      const dueAt = zonedTimeToUtc({ year, month, day, hour, minute }, task.timezone)
      if (dueAt.getTime() > now.getTime()) continue

      log.info(`[scheduler] task occurrence due: ${task.id} "${task.title}" @ ${occurrence.scheduledFor}`)
      enqueueTaskTrigger({
        taskId: task.id,
        occurrenceId: occurrence.id,
        title: task.title,
        scheduledFor: occurrence.scheduledFor
      })
    }
  }

  checkPeekPreviews(db, getAppSettings(db), now, (kind, title) => {
    log.info(`[scheduler] peek preview: ${kind} "${title}"`)
    triggerPeekPreview(kind, title)
  })

  if (dirty) persist()
}
