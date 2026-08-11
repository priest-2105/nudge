import { BrowserWindow } from 'electron'
import { IpcChannels } from '../../src/shared/ipc'
import { loadRenderer, preloadPath } from './windowUtils'

let settingsWindow: BrowserWindow | null = null

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

/** Tells the Settings window to re-fetch an entity list after a main-process mutation. */
export function notifyDataChanged(entity: 'reminders' | 'alarms' | 'tasks' | 'settings'): void {
  settingsWindow?.webContents.send(IpcChannels.DataChanged, entity)
}

export function initSettingsWindow(): void {
  settingsWindow = new BrowserWindow({
    width: 900,
    height: 640,
    title: 'Nudge — Settings',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  loadRenderer(settingsWindow, 'settings')

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}
