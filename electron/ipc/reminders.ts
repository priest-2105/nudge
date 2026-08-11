import { ipcMain } from 'electron'
import { IpcChannels } from '../../src/shared/ipc'
import type { NewReminder, Reminder } from '../../src/shared/types'
import { getDb, persist } from '../db'
import { createReminder, deleteReminder, listReminders, updateReminder } from '../db/queries'
import { notifyDataChanged } from '../windows/settingsWindow'

export function registerReminderHandlers(): void {
  ipcMain.handle(IpcChannels.RemindersList, () => listReminders(getDb()))

  ipcMain.handle(IpcChannels.RemindersCreate, (_event, payload: NewReminder) => {
    const reminder = createReminder(getDb(), payload)
    persist()
    notifyDataChanged('reminders')
    return reminder
  })

  ipcMain.handle(
    IpcChannels.RemindersUpdate,
    (_event, id: string, patch: Partial<Reminder>) => {
      const reminder = updateReminder(getDb(), id, patch)
      persist()
      notifyDataChanged('reminders')
      return reminder
    }
  )

  ipcMain.handle(IpcChannels.RemindersDelete, (_event, id: string) => {
    deleteReminder(getDb(), id)
    persist()
    notifyDataChanged('reminders')
  })
}
