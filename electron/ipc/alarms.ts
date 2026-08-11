import { ipcMain } from 'electron'
import { IpcChannels } from '../../src/shared/ipc'
import type { Alarm, NewAlarm } from '../../src/shared/types'
import { getDb, persist } from '../db'
import { createAlarm, deleteAlarm, listAlarms, updateAlarm } from '../db/queries'
import { nextAlarmTrigger } from '../scheduler/recurrence'
import { notifyDataChanged } from '../windows/settingsWindow'

export function registerAlarmHandlers(): void {
  ipcMain.handle(IpcChannels.AlarmsList, () => listAlarms(getDb()))

  ipcMain.handle(IpcChannels.AlarmsCreate, (_event, payload: NewAlarm) => {
    const db = getDb()
    const nextTriggerAt = nextAlarmTrigger(
      payload.localTime,
      payload.timezone,
      payload.daysOfWeek,
      payload.specificDate,
      new Date()
    ).toISOString()

    const alarm = createAlarm(db, { ...payload, nextTriggerAt })
    persist()
    notifyDataChanged('alarms')
    return alarm
  })

  ipcMain.handle(IpcChannels.AlarmsUpdate, (_event, id: string, patch: Partial<Alarm>) => {
    const db = getDb()
    let finalPatch = patch

    // Only recompute nextTriggerAt when the schedule-defining fields changed
    // — an unrelated patch (e.g. toggling `enabled`) shouldn't reschedule it.
    if (patch.localTime || patch.timezone || patch.daysOfWeek || patch.specificDate) {
      const existing = listAlarms(db).find((a) => a.id === id)
      if (existing) {
        const merged = { ...existing, ...patch }
        finalPatch = {
          ...patch,
          nextTriggerAt: nextAlarmTrigger(
            merged.localTime,
            merged.timezone,
            merged.daysOfWeek,
            merged.specificDate,
            new Date()
          ).toISOString()
        }
      }
    }

    const alarm = updateAlarm(db, id, finalPatch)
    persist()
    notifyDataChanged('alarms')
    return alarm
  })

  ipcMain.handle(IpcChannels.AlarmsDelete, (_event, id: string) => {
    deleteAlarm(getDb(), id)
    persist()
    notifyDataChanged('alarms')
  })
}
