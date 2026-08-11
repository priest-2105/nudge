import { randomUUID } from 'crypto'
import { BrowserWindow, ipcMain, screen } from 'electron'
import type { Display } from 'electron'
import log from 'electron-log'
import { IpcChannels } from '../../src/shared/ipc'
import type {
  AppSettings,
  OverlayTriggerPayload,
  TaskTriggerPayload,
  TriggerPayload
} from '../../src/shared/types'
import { getDb, persist } from '../db'
import { completeOccurrence, updateReminder } from '../db/queries'
import { loadRenderer, preloadPath } from './windowUtils'

const OVERLAY_WIDTH = 320
const OVERLAY_HEIGHT = 400
const MARGIN_X = 16
const MARGIN_Y = 24
// Gives the exit animation time to finish before the next queued trigger enters.
const QUEUE_ADVANCE_DELAY_MS = 350

type QueueItem =
  | { kind: 'reminder'; payload: TriggerPayload }
  | { kind: 'task'; payload: TaskTriggerPayload }

let overlayWindow: BrowserWindow | null = null
let queue: QueueItem[] = []
let currentItem: QueueItem | null = null

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

/** Whether `occurrenceId` is currently showing or waiting in the queue — the
 * scheduler uses this to avoid re-triggering an occurrence awaiting a response. */
export function isTaskOccurrencePending(occurrenceId: string): boolean {
  const matches = (item: QueueItem): boolean =>
    item.kind === 'task' && item.payload.occurrenceId === occurrenceId
  return (currentItem !== null && matches(currentItem)) || queue.some(matches)
}

function pickDisplay(displayId: number | undefined): Display {
  if (displayId !== undefined) {
    const match = screen.getAllDisplays().find((d) => d.id === displayId)
    if (match) return match
  }
  return screen.getPrimaryDisplay()
}

function computePosition(
  edge: AppSettings['screenEdge'],
  display: Display
): { x: number; y: number } {
  const { bounds } = display
  switch (edge) {
    case 'left':
      return { x: bounds.x + MARGIN_X, y: bounds.y + bounds.height - OVERLAY_HEIGHT - MARGIN_Y }
    case 'bottom':
      return {
        x: bounds.x + Math.round((bounds.width - OVERLAY_WIDTH) / 2),
        y: bounds.y + bounds.height - OVERLAY_HEIGHT - MARGIN_Y
      }
    case 'right':
    default:
      return {
        x: bounds.x + bounds.width - OVERLAY_WIDTH - MARGIN_X,
        y: bounds.y + bounds.height - OVERLAY_HEIGHT - MARGIN_Y
      }
  }
}

/** Re-applies position from current settings — call after screenEdge/displayId changes. */
export function repositionOverlayWindow(settings: AppSettings): void {
  if (!overlayWindow) return
  const display = pickDisplay(settings.displayId)
  const { x, y } = computePosition(settings.screenEdge, display)
  overlayWindow.setBounds({ x, y, width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT })
}

export function initOverlayWindow(settings: AppSettings): void {
  const display = pickDisplay(settings.displayId)
  const { x, y } = computePosition(settings.screenEdge, display)

  overlayWindow = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    // Overlay must never steal keyboard focus from whatever the user is
    // doing — focusable:false plus showInactive() enforce that at the OS
    // level, not just by convention.
    focusable: false,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Click-through by default; the renderer flips this off only while the
  // pointer is over the avatar's interactive hit area (see OverlaySetInteractive).
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')

  loadRenderer(overlayWindow, 'overlay')

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  ipcMain.on(IpcChannels.OverlayTriggerTest, (_event, payload: OverlayTriggerPayload) => {
    enqueueReminderTrigger({ reminderId: 'test', title: payload.title, message: payload.message })
  })

  ipcMain.on(IpcChannels.OverlaySetInteractive, (_event, isInteractive: boolean) => {
    overlayWindow?.setIgnoreMouseEvents(!isInteractive, { forward: true })
  })

  // Dismiss (reminders) and Skip (tasks) are the same resolution at the
  // data layer: the trigger is cleared without writing a completion.
  ipcMain.on(IpcChannels.OverlayDismissTrigger, (_event, triggerId: string) => {
    if (currentItem?.payload.triggerId !== triggerId) return
    advanceQueue()
  })

  ipcMain.on(IpcChannels.OverlaySnoozeTrigger, (_event, triggerId: string, minutes: number) => {
    if (currentItem?.payload.triggerId !== triggerId) return
    if (currentItem.kind === 'reminder' && currentItem.payload.reminderId !== 'test') {
      const db = getDb()
      const snoozeUntil = new Date(Date.now() + minutes * 60_000).toISOString()
      updateReminder(db, currentItem.payload.reminderId, {
        nextTriggerAt: snoozeUntil,
        enabled: true,
        fired: false
      })
      persist()
      advanceQueue()
    } else if (currentItem.kind === 'task') {
      // No DB write: the occurrence stays uncompleted/pending, so
      // isTaskOccurrencePending() keeps the scheduler from re-firing it
      // while we wait to re-present it after the snooze delay.
      const snoozed = currentItem
      currentItem = null
      overlayWindow?.webContents.send(IpcChannels.OverlayHide)
      setTimeout(() => enqueue(snoozed), minutes * 60_000)
      presentNextFromQueueIfIdle()
    }
  })

  ipcMain.handle(IpcChannels.TasksCompleteOccurrence, (_event, taskId: string, occurrenceId: string) => {
    if (currentItem?.kind !== 'task' || currentItem.payload.occurrenceId !== occurrenceId) return
    const db = getDb()
    completeOccurrence(db, occurrenceId, new Date().toISOString())
    persist()
    advanceQueue()
  })
}

/**
 * Queues a reminder trigger for display. Only one trigger is shown at a
 * time — per requirement.md §7.1, near-simultaneous triggers must queue,
 * not overlap or drop.
 */
export function enqueueReminderTrigger(payload: Omit<TriggerPayload, 'triggerId'>): void {
  enqueue({ kind: 'reminder', payload: { ...payload, triggerId: randomUUID() } })
}

export function enqueueTaskTrigger(payload: Omit<TaskTriggerPayload, 'triggerId'>): void {
  enqueue({ kind: 'task', payload: { ...payload, triggerId: randomUUID() } })
}

function enqueue(item: QueueItem): void {
  if (currentItem) {
    queue.push(item)
    log.info(`[overlay] queued ${item.kind} trigger (queue depth ${queue.length})`)
  } else {
    presentItem(item)
  }
}

function presentItem(item: QueueItem): void {
  currentItem = item
  if (!overlayWindow) return
  overlayWindow.showInactive()
  const channel = item.kind === 'reminder' ? IpcChannels.TriggerReminder : IpcChannels.TriggerTaskOccurrence
  overlayWindow.webContents.send(channel, item.payload)
}

function presentNextFromQueueIfIdle(): void {
  if (currentItem) return
  const next = queue.shift()
  if (next) {
    setTimeout(() => presentItem(next), QUEUE_ADVANCE_DELAY_MS)
  }
}

function advanceQueue(): void {
  currentItem = null
  overlayWindow?.webContents.send(IpcChannels.OverlayHide)
  presentNextFromQueueIfIdle()
}
