import { app } from 'electron'
import { join } from 'path'

/** Resolves a packaged icon file, accounting for the asarUnpack path Windows needs at runtime. */
function iconPath(name: string): string {
  const base = app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icons')
    : join(__dirname, '../../assets/icons')
  return join(base, name)
}

export function appIconPath(): string {
  return iconPath('icon.png')
}

export function trayIconPath(): string {
  return iconPath('tray.png')
}
