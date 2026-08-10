import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { IpcChannels } from '../src/shared/ipc'
import type { OverlayTriggerPayload } from '../src/shared/types'
import { initTray } from './tray'
import { initDb } from './db'
import { initScheduler } from './scheduler'

const OVERLAY_WIDTH = 320
const OVERLAY_HEIGHT = 400

let settingsWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null

function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

function rendererUrl(page: 'settings' | 'overlay'): string {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    return `${devServerUrl}/src/${page}-window/index.html`
  }
  return join(__dirname, `../renderer/src/${page}-window/index.html`)
}

function loadRenderer(win: BrowserWindow, page: 'settings' | 'overlay'): void {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    win.loadURL(rendererUrl(page))
  } else {
    win.loadFile(rendererUrl(page))
  }
}

function createSettingsWindow(): void {
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

function createOverlayWindow(): void {
  const { bounds } = screen.getPrimaryDisplay()

  overlayWindow = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    x: bounds.x + bounds.width - OVERLAY_WIDTH,
    y: bounds.y + bounds.height - OVERLAY_HEIGHT,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')

  loadRenderer(overlayWindow, 'overlay')

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

function showOverlay(payload: OverlayTriggerPayload): void {
  if (!overlayWindow) return
  overlayWindow.showInactive()
  overlayWindow.webContents.send(IpcChannels.OverlayShow, payload)
}

function hideOverlay(): void {
  overlayWindow?.webContents.send(IpcChannels.OverlayHide)
}

app.whenReady().then(() => {
  createSettingsWindow()
  createOverlayWindow()
  initTray()
  initDb()
  initScheduler()

  ipcMain.on(IpcChannels.OverlayTriggerTest, (_event, payload: OverlayTriggerPayload) => {
    showOverlay(payload)
  })

  ipcMain.on(IpcChannels.OverlaySetInteractive, (_event, isInteractive: boolean) => {
    overlayWindow?.setIgnoreMouseEvents(!isInteractive, { forward: true })
  })

  ipcMain.on(IpcChannels.OverlayDismiss, () => {
    hideOverlay()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createSettingsWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
