import { BrowserWindow } from 'electron'
import type { AppSettings } from '../../src/shared/types'
import { getDb, persist } from '../db'
import { updateAppSettings } from '../db/queries'
import { loadRenderer, preloadPath } from './windowUtils'

const CLOCK_WIDTH = 180
const CLOCK_HEIGHT = 180

let clockWindow: BrowserWindow | null = null
let saveMoveTimer: NodeJS.Timeout | null = null

export function getClockWidgetWindow(): BrowserWindow | null {
  return clockWindow
}

export function initClockWidgetWindow(settings: AppSettings): void {
  const { position, alwaysOnTop, enabled } = settings.clockWidget

  clockWindow = new BrowserWindow({
    width: CLOCK_WIDTH,
    height: CLOCK_HEIGHT,
    x: position.x,
    y: position.y,
    transparent: true,
    frame: false,
    alwaysOnTop,
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

  // Matches overlay/alarm: the constructor's `alwaysOnTop` option alone
  // doesn't reliably stay above other apps once they're focused — the
  // 'screen-saver' level is what actually keeps it pinned.
  if (alwaysOnTop) clockWindow.setAlwaysOnTop(true, 'screen-saver')

  loadRenderer(clockWindow, 'clock-widget')

  // Calling showInactive() before the page has actually painted a frame
  // leaves a transparent window compositing nothing (confirmed via
  // capturePage() returning a 0x0 image) — wait for 'ready-to-show', the
  // same fix the overlay/alarm windows get for free by only showing much
  // later, well after their page has finished loading.
  clockWindow.once('ready-to-show', () => {
    if (enabled) clockWindow?.showInactive()
  })

  // The renderer's drag handle uses CSS `-webkit-app-region: drag`, which
  // moves the OS window directly — we just persist the resulting position.
  clockWindow.on('moved', () => {
    if (saveMoveTimer) clearTimeout(saveMoveTimer)
    saveMoveTimer = setTimeout(() => {
      if (!clockWindow) return
      const [x, y] = clockWindow.getPosition()
      const db = getDb()
      updateAppSettings(db, { clockWidget: { ...settings.clockWidget, position: { x, y } } })
      persist()
    }, 400)
  })

  clockWindow.on('closed', () => {
    clockWindow = null
  })
}

/** Applies a settings change to the already-created clock window (show/hide/move/pin). */
export function applyClockWidgetSettings(settings: AppSettings): void {
  if (!clockWindow) return
  const { enabled, alwaysOnTop, position } = settings.clockWidget

  if (enabled) clockWindow.showInactive()
  else clockWindow.hide()

  clockWindow.setAlwaysOnTop(alwaysOnTop, alwaysOnTop ? 'screen-saver' : undefined)
  clockWindow.setPosition(position.x, position.y)
}
