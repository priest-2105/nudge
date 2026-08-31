import { app, Menu, nativeImage, Tray } from 'electron'
import { trayIconPath } from './icons'
import { showSettingsWindow } from './windows/settingsWindow'

let tray: Tray | null = null

export function initTray(): void {
  const icon = nativeImage.createFromPath(trayIconPath())
  tray = new Tray(icon)
  tray.setToolTip('Nudge')

  const menu = Menu.buildFromTemplate([
    { label: 'Open Nudge', click: () => showSettingsWindow() },
    { type: 'separator' },
    {
      label: 'Quit Nudge',
      click: () => {
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => showSettingsWindow())
}
