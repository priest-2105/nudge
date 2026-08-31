import { app } from 'electron'
import log from 'electron-log'
import { initTray } from './tray'
import { getDb, initDb } from './db'
import { getAppSettings } from './db/queries'
import { initScheduler } from './scheduler/tick'
import { allowSettingsWindowToClose, initSettingsWindow, showSettingsWindow } from './windows/settingsWindow'
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

// Without this, launching Nudge a second time (double-clicking the exe or
// shortcut again) starts a whole separate process with its own DB connection
// and its own copy of every window — including a second always-on-top clock
// widget stacked directly on the first, and a second invisible overlay/alarm
// window that can end up eating clicks meant for the (first instance's)
// settings window. Only one instance may ever run.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showSettingsWindow()
  })

  // Nudge lives in the tray — quitting only happens via the tray's "Quit"
  // item (or the OS), never by closing the settings window.
  app.on('before-quit', () => {
    allowSettingsWindowToClose()
  })

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
      showSettingsWindow()
    })
  })
}
