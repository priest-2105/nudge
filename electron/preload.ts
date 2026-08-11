import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../src/shared/ipc'
import type { NudgeApi } from '../src/shared/ipc'
import type {
  AlarmTriggerPayload,
  NewAlarm,
  NewReminder,
  NewTask,
  OverlayTriggerPayload,
  TaskTriggerPayload,
  TriggerPayload
} from '../src/shared/types'

const api: NudgeApi = {
  listReminders: () => ipcRenderer.invoke(IpcChannels.RemindersList),
  createReminder: (payload: NewReminder) => ipcRenderer.invoke(IpcChannels.RemindersCreate, payload),
  updateReminder: (id, patch) => ipcRenderer.invoke(IpcChannels.RemindersUpdate, id, patch),
  deleteReminder: (id) => ipcRenderer.invoke(IpcChannels.RemindersDelete, id),
  onDataChanged: (cb) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      entity: 'reminders' | 'alarms' | 'tasks'
    ): void => cb(entity)
    ipcRenderer.on(IpcChannels.DataChanged, listener)
    return () => ipcRenderer.removeListener(IpcChannels.DataChanged, listener)
  },

  getSettings: () => ipcRenderer.invoke(IpcChannels.SettingsGet),
  updateSettings: (patch) => ipcRenderer.invoke(IpcChannels.SettingsUpdate, patch),

  triggerTestOverlay: (payload: OverlayTriggerPayload) =>
    ipcRenderer.send(IpcChannels.OverlayTriggerTest, payload),
  setOverlayInteractive: (isInteractive) =>
    ipcRenderer.send(IpcChannels.OverlaySetInteractive, isInteractive),
  dismissOverlayTrigger: (triggerId) => ipcRenderer.send(IpcChannels.OverlayDismissTrigger, triggerId),
  snoozeOverlayTrigger: (triggerId, minutes) =>
    ipcRenderer.send(IpcChannels.OverlaySnoozeTrigger, triggerId, minutes),
  onTriggerReminder: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TriggerPayload): void => cb(payload)
    ipcRenderer.on(IpcChannels.TriggerReminder, listener)
    return () => ipcRenderer.removeListener(IpcChannels.TriggerReminder, listener)
  },
  onOverlayHide: (cb) => {
    const listener = (): void => cb()
    ipcRenderer.on(IpcChannels.OverlayHide, listener)
    return () => ipcRenderer.removeListener(IpcChannels.OverlayHide, listener)
  },

  listAlarms: () => ipcRenderer.invoke(IpcChannels.AlarmsList),
  createAlarm: (payload: NewAlarm) => ipcRenderer.invoke(IpcChannels.AlarmsCreate, payload),
  updateAlarm: (id, patch) => ipcRenderer.invoke(IpcChannels.AlarmsUpdate, id, patch),
  deleteAlarm: (id) => ipcRenderer.invoke(IpcChannels.AlarmsDelete, id),
  stopAlarm: (alarmId) => ipcRenderer.send(IpcChannels.AlarmStop, alarmId),
  snoozeAlarm: (alarmId, minutes) => ipcRenderer.send(IpcChannels.AlarmSnooze, alarmId, minutes),
  onTriggerAlarm: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AlarmTriggerPayload): void => cb(payload)
    ipcRenderer.on(IpcChannels.TriggerAlarm, listener)
    return () => ipcRenderer.removeListener(IpcChannels.TriggerAlarm, listener)
  },

  listTasks: () => ipcRenderer.invoke(IpcChannels.TasksList),
  createTask: (payload: NewTask) => ipcRenderer.invoke(IpcChannels.TasksCreate, payload),
  updateTask: (id, patch) => ipcRenderer.invoke(IpcChannels.TasksUpdate, id, patch),
  deleteTask: (id) => ipcRenderer.invoke(IpcChannels.TasksDelete, id),
  completeTaskOccurrence: (taskId, occurrenceId) =>
    ipcRenderer.invoke(IpcChannels.TasksCompleteOccurrence, taskId, occurrenceId),
  getTaskProgress: (taskId) => ipcRenderer.invoke(IpcChannels.TasksGetTodayProgress, taskId),
  onTriggerTaskOccurrence: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TaskTriggerPayload): void => cb(payload)
    ipcRenderer.on(IpcChannels.TriggerTaskOccurrence, listener)
    return () => ipcRenderer.removeListener(IpcChannels.TriggerTaskOccurrence, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
