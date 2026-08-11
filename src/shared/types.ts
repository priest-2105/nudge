// ---------- Reminders ----------

export interface Reminder {
  id: string
  title: string
  message: string
  nextTriggerAt: string // ISO UTC
  recurrence: 'none' | 'daily' | 'weekly' | 'custom'
  recurrenceIntervalMinutes?: number
  fired: boolean // for one-off; recurring resets each cycle
  enabled: boolean
  createdAt: string
  lastTriggeredAt?: string
}

export type NewReminder = Omit<
  Reminder,
  'id' | 'fired' | 'createdAt' | 'lastTriggeredAt' | 'nextTriggerAt'
> & {
  nextTriggerAt: string
}

// ---------- Alarms ----------

export interface Alarm {
  id: string
  label: string
  localTime: string // "07:30"
  timezone: string // IANA, e.g. "Africa/Lagos"
  daysOfWeek: number[] // [] = one-off (uses specificDate instead)
  specificDate?: string // for one-off alarms
  soundId: string
  snoozeEnabled: boolean
  snoozeMinutes: number // default 9
  enabled: boolean
  nextTriggerAt: string // derived, recomputed each cycle
}

export type NewAlarm = Omit<Alarm, 'id' | 'nextTriggerAt'> & { nextTriggerAt: string }

// ---------- Tasks ----------

export interface Task {
  id: string
  title: string // "Drink water"
  timesPerDay: number // 8
  scheduleMode: 'auto' | 'manual'
  windowStart: string // "08:00" — for auto mode
  windowEnd: string // "22:00" — for auto mode
  occurrenceTimes: string[] // resolved list, length === timesPerDay
  timezone: string
  enabled: boolean
  createdAt: string
}

export type NewTask = Omit<Task, 'id' | 'createdAt'>

export interface TaskOccurrenceLog {
  id: string
  taskId: string
  scheduledFor: string // which of today's occurrenceTimes this corresponds to
  completedAt?: string // undefined if missed/skipped
  date: string // "2026-08-10" — local date, for streak/day grouping
}

export interface TaskStreak {
  taskId: string
  currentStreak: number
  longestStreak: number
  lastCompletedDate?: string
}

// ---------- Settings ----------

export interface AppSettings {
  avatarId: string
  screenEdge: 'left' | 'right' | 'bottom'
  soundEnabled: boolean
  defaultSnoozeMinutes: number
  launchOnStartup: boolean
  displayId?: number
  clockWidget: {
    enabled: boolean
    style: 'digital' | 'analog'
    position: { x: number; y: number }
    alwaysOnTop: boolean
  }
}

// ---------- Trigger payloads (main -> renderer) ----------

export interface TriggerPayload {
  triggerId: string
  reminderId: string
  title: string
  message: string
}

export interface AlarmTriggerPayload {
  triggerId: string
  alarmId: string
  label: string
  soundId: string
  snoozeEnabled: boolean
  snoozeMinutes: number
}

export interface TaskTriggerPayload {
  triggerId: string
  taskId: string
  occurrenceId: string
  title: string
  scheduledFor: string
}

// Used by the Milestone-2 manual "Trigger Test Overlay" button until the
// overlay is wired to real TriggerPayload events in Milestone 3.
export interface OverlayTriggerPayload {
  title: string
  message: string
}
