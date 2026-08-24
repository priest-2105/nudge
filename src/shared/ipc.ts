import type {
  Alarm,
  AlarmTriggerPayload,
  AppSettings,
  NewAlarm,
  NewReminder,
  NewTask,
  OverlayTriggerPayload,
  PeekPreviewPayload,
  Reminder,
  Task,
  TaskStreak,
  TaskTriggerPayload,
  TriggerPayload
} from './types'

/**
 * Channel name constants — single source of truth, avoids typos.
 *
 * Full contract per requirement.md §4. Alarms/Tasks channels are defined
 * here ahead of the windows/handlers that will use them (Milestones 4-5);
 * Reminders + Overlay + Settings are wired end-to-end as of Milestone 3.
 */
export const IpcChannels = {
  // ----- renderer -> main (request/response) -----
  RemindersCreate: 'reminders:create',
  RemindersUpdate: 'reminders:update',
  RemindersDelete: 'reminders:delete',
  RemindersList: 'reminders:list',

  AlarmsCreate: 'alarms:create',
  AlarmsUpdate: 'alarms:update',
  AlarmsDelete: 'alarms:delete',
  AlarmsList: 'alarms:list',

  TasksCreate: 'tasks:create',
  TasksUpdate: 'tasks:update',
  TasksDelete: 'tasks:delete',
  TasksList: 'tasks:list',
  TasksCompleteOccurrence: 'tasks:completeOccurrence',
  TasksGetTodayProgress: 'tasks:getTodayProgress',

  SettingsGet: 'settings:get',
  SettingsUpdate: 'settings:update',

  AlarmStop: 'alarm:stop',
  AlarmSnooze: 'alarm:snooze',

  // ----- main -> renderer (push events) -----
  TriggerReminder: 'trigger:reminder',
  TriggerAlarm: 'trigger:alarm',
  TriggerTaskOccurrence: 'trigger:task-occurrence',
  DataChanged: 'data:changed',

  // ----- Overlay mechanics -----
  // settings renderer -> main: manually trigger the overlay (dev/testing)
  OverlayTriggerTest: 'overlay:trigger-test',
  // main -> overlay renderer: play exit animation
  OverlayHide: 'overlay:hide',
  // overlay renderer -> main: mouse entered/left an interactive hit area
  OverlaySetInteractive: 'overlay:set-interactive',
  // overlay renderer -> main: user dismissed the current trigger
  OverlayDismissTrigger: 'overlay:dismiss-trigger',
  // overlay renderer -> main: user snoozed the current trigger
  OverlaySnoozeTrigger: 'overlay:snooze-trigger',
  // main -> overlay renderer: brief blinking-face heads-up before a real trigger
  OverlayPeekPreview: 'overlay:peek-preview'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

/** Shape exposed on window.api via contextBridge (implemented in electron/preload.ts). */
export interface NudgeApi {
  // Reminders
  listReminders: () => Promise<Reminder[]>
  createReminder: (payload: NewReminder) => Promise<Reminder>
  updateReminder: (id: string, patch: Partial<Reminder>) => Promise<Reminder>
  deleteReminder: (id: string) => Promise<void>
  onDataChanged: (cb: (entity: 'reminders' | 'alarms' | 'tasks' | 'settings') => void) => () => void

  // Settings
  getSettings: () => Promise<AppSettings>
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>

  // Overlay
  triggerTestOverlay: (payload: OverlayTriggerPayload) => void
  setOverlayInteractive: (isInteractive: boolean) => void
  dismissOverlayTrigger: (triggerId: string) => void
  snoozeOverlayTrigger: (triggerId: string, minutes: number) => void
  onTriggerReminder: (cb: (payload: TriggerPayload) => void) => () => void
  onOverlayHide: (cb: () => void) => () => void
  onPeekPreview: (cb: (payload: PeekPreviewPayload) => void) => () => void

  // Alarms
  listAlarms: () => Promise<Alarm[]>
  createAlarm: (payload: NewAlarm) => Promise<Alarm>
  updateAlarm: (id: string, patch: Partial<Alarm>) => Promise<Alarm>
  deleteAlarm: (id: string) => Promise<void>
  stopAlarm: (alarmId: string) => void
  snoozeAlarm: (alarmId: string, minutes: number) => void
  onTriggerAlarm: (cb: (payload: AlarmTriggerPayload) => void) => () => void

  // Tasks
  listTasks: () => Promise<Task[]>
  createTask: (payload: NewTask) => Promise<Task>
  updateTask: (id: string, patch: Partial<Task>) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  completeTaskOccurrence: (taskId: string, occurrenceId: string) => Promise<void>
  getTaskProgress: (
    taskId: string
  ) => Promise<{ completed: number; total: number; streak: TaskStreak }>
  onTriggerTaskOccurrence: (cb: (payload: TaskTriggerPayload) => void) => () => void
}

declare global {
  interface Window {
    api: NudgeApi
  }
}
