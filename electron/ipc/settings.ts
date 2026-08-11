import { app, ipcMain } from 'electron'
import { IpcChannels } from '../../src/shared/ipc'
import type { AppSettings } from '../../src/shared/types'
import { getDb, persist } from '../db'
import { getAppSettings, updateAppSettings } from '../db/queries'
import { applyClockWidgetSettings } from '../windows/clockWidgetWindow'
import { repositionOverlayWindow } from '../windows/overlayWindow'
import { notifyDataChanged } from '../windows/settingsWindow'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IpcChannels.SettingsGet, () => getAppSettings(getDb()))

  ipcMain.handle(IpcChannels.SettingsUpdate, (_event, patch: Partial<AppSettings>) => {
    const db = getDb()
    const settings = updateAppSettings(db, patch)
    persist()

    if (patch.screenEdge || patch.displayId !== undefined) {
      repositionOverlayWindow(settings)
    }
    if (patch.clockWidget) {
      applyClockWidgetSettings(settings)
    }
    if (patch.launchOnStartup !== undefined) {
      app.setLoginItemSettings({ openAtLogin: patch.launchOnStartup })
    }

    notifyDataChanged('settings')
    return settings
  })
}
