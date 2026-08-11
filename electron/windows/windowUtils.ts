import { app, BrowserWindow } from 'electron'
import { join } from 'path'

export function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

export function loadRenderer(
  win: BrowserWindow,
  page: 'settings' | 'overlay' | 'alarm' | 'clock-widget'
): void {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    win.loadURL(`${devServerUrl}/src/${page}-window/index.html`)
  } else {
    win.loadFile(join(__dirname, `../renderer/src/${page}-window/index.html`))
  }
}
