import { BrowserWindow } from 'electron'
import { IpcChannels } from '../../src/shared/ipc'
import { appIconPath } from '../icons'
import { loadRenderer, preloadPath } from './windowUtils'

let settingsWindow: BrowserWindow | null = null
// Set right before app.quit() so the window's close handler lets it actually
// close instead of hiding to the tray — see registerQuitHandler().
let isQuitting = false

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

/** Tells the Settings window to re-fetch an entity list after a main-process mutation. */
export function notifyDataChanged(entity: 'reminders' | 'alarms' | 'tasks' | 'settings'): void {
  settingsWindow?.webContents.send(IpcChannels.DataChanged, entity)
}

/** Shows the Settings window, restoring/creating it as needed — used by the tray and second-instance handling. */
export function showSettingsWindow(): void {
  if (!settingsWindow) {
    initSettingsWindow()
    return
  }
  if (settingsWindow.isMinimized()) settingsWindow.restore()
  settingsWindow.show()
  settingsWindow.focus()
}

/** Lets the tray's "Quit" action (and any real app.quit()) close the window for real. */
export function allowSettingsWindowToClose(): void {
  isQuitting = true
}

export function initSettingsWindow(): void {
  settingsWindow = new BrowserWindow({
    width: 900,
    height: 640,
    title: 'Nudge — Settings',
    icon: appIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  loadRenderer(settingsWindow, 'settings')

  // Closing the window (the X button) should minimize Nudge to the tray, not
  // quit the app — reminders/alarms keep running in the background. Only the
  // tray's "Quit" (or the OS shutting the app down) actually closes it.
  settingsWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    settingsWindow?.hide()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}
