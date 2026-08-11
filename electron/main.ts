import { app, BrowserWindow } from 'electron'
import log from 'electron-log'
import { initTray } from './tray'
import { getDb, initDb } from './db'
import { getAppSettings } from './db/queries'
import { initScheduler } from './scheduler/tick'
import { initSettingsWindow } from './windows/settingsWindow'
import { initOverlayWindow } from './windows/overlayWindow'
import { initAlarmWindow } from './windows/alarmWindow'
import { initClockWidgetWindow } from './windows/clockWidgetWindow'
import { registerReminderHandlers } from './ipc/reminders'
import { registerAlarmHandlers } from './ipc/alarms'
import { registerTaskHandlers } from './ipc/tasks'
import { registerSettingsHandlers } from './ipc/settings'

// Alarms must ring without any prior user interaction with the window —
// Chromium's default autoplay policy would otherwise silently block the
// Web Audio ringtone until the user clicks something.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

app.whenReady().then(async () => {
  await initDb()
  const settings = getAppSettings(getDb())

  initSettingsWindow()
  initOverlayWindow(settings)
  initAlarmWindow()
  initClockWidgetWindow(settings)
  initTray()
  initScheduler()
  registerReminderHandlers()
  registerAlarmHandlers()
  registerTaskHandlers()
  registerSettingsHandlers()

  log.info('[main] app ready — db, scheduler, and windows initialized')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) initSettingsWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
