import { randomUUID } from 'crypto'
import { BrowserWindow, ipcMain, screen } from 'electron'
import log from 'electron-log'
import { IpcChannels } from '../../src/shared/ipc'
import type { Alarm, AlarmTriggerPayload } from '../../src/shared/types'
import { getDb, persist } from '../db'
import { updateAlarm } from '../db/queries'
import { nextAlarmTrigger } from '../scheduler/recurrence'
import { loadRenderer, preloadPath } from './windowUtils'

const ALARM_WIDTH = 440
const ALARM_HEIGHT = 320

let alarmWindow: BrowserWindow | null = null
let queue: AlarmTriggerPayload[] = []
let currentAlarm: AlarmTriggerPayload | null = null

export function getAlarmWindow(): BrowserWindow | null {
  return alarmWindow
}

/** Whether `alarmId` is currently ringing or waiting in the ring queue — used by the
 * scheduler to avoid re-triggering an alarm that's already awaiting acknowledgement. */
export function isAlarmActive(alarmId: string): boolean {
  return currentAlarm?.alarmId === alarmId || queue.some((a) => a.alarmId === alarmId)
}

function centerPosition(): { x: number; y: number } {
  const { bounds } = screen.getPrimaryDisplay()
  return {
    x: bounds.x + Math.round((bounds.width - ALARM_WIDTH) / 2),
    y: bounds.y + 80
  }
}

export function initAlarmWindow(): void {
  const { x, y } = centerPosition()

  alarmWindow = new BrowserWindow({
    width: ALARM_WIDTH,
    height: ALARM_HEIGHT,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    // Insistent, but still must not steal keyboard focus the user didn't ask for.
    focusable: false,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  alarmWindow.setAlwaysOnTop(true, 'screen-saver')
  loadRenderer(alarmWindow, 'alarm')

  alarmWindow.on('closed', () => {
    alarmWindow = null
  })

  ipcMain.on(IpcChannels.AlarmStop, (_event, alarmId: string) => {
    if (currentAlarm?.alarmId !== alarmId) return
    stopOrRescheduleAlarm(alarmId)
    advanceQueue()
  })

  ipcMain.on(IpcChannels.AlarmSnooze, (_event, alarmId: string, minutes: number) => {
    if (currentAlarm?.alarmId !== alarmId) return
    snoozeAlarm(alarmId, minutes)
    advanceQueue()
  })
}

function stopOrRescheduleAlarm(alarmId: string): void {
  const db = getDb()
  const alarm = getAlarmById(db, alarmId)
  if (!alarm) return

  if (alarm.daysOfWeek.length > 0) {
    const next = nextAlarmTrigger(alarm.localTime, alarm.timezone, alarm.daysOfWeek, undefined, new Date())
    updateAlarm(db, alarmId, { nextTriggerAt: next.toISOString() })
  } else {
    updateAlarm(db, alarmId, { enabled: false })
  }
  persist()
}

function snoozeAlarm(alarmId: string, minutes: number): void {
  const db = getDb()
  const snoozeUntil = new Date(Date.now() + minutes * 60_000).toISOString()
  updateAlarm(db, alarmId, { nextTriggerAt: snoozeUntil, enabled: true })
  persist()
}

function getAlarmById(db: ReturnType<typeof getDb>, id: string): Alarm | undefined {
  // Small local lookup instead of a dedicated query export — only used here.
  const stmt = db.prepare('SELECT * FROM alarms WHERE id = ?')
  stmt.bind([id])
  const found = stmt.step()
  const row = found ? stmt.getAsObject() : null
  stmt.free()
  if (!row) return undefined
  return {
    id: row.id as string,
    label: row.label as string,
    localTime: row.localTime as string,
    timezone: row.timezone as string,
    daysOfWeek: JSON.parse(row.daysOfWeek as string) as number[],
    specificDate: (row.specificDate as string | null) ?? undefined,
    soundId: row.soundId as string,
    snoozeEnabled: Boolean(row.snoozeEnabled),
    snoozeMinutes: row.snoozeMinutes as number,
    enabled: Boolean(row.enabled),
    nextTriggerAt: row.nextTriggerAt as string
  }
}

/** Alarms take priority over any queued reminder — see requirement.md §7.2. */
export function enqueueAlarmTrigger(payload: Omit<AlarmTriggerPayload, 'triggerId'>): void {
  const trigger: AlarmTriggerPayload = { ...payload, triggerId: randomUUID() }
  if (currentAlarm) {
    queue.push(trigger)
    log.info(`[alarm] queued trigger for alarm ${trigger.alarmId} (queue depth ${queue.length})`)
  } else {
    presentAlarm(trigger)
  }
}

function presentAlarm(trigger: AlarmTriggerPayload): void {
  currentAlarm = trigger
  if (!alarmWindow) return
  alarmWindow.showInactive()
  alarmWindow.webContents.send(IpcChannels.TriggerAlarm, trigger)
}

function advanceQueue(): void {
  currentAlarm = null
  alarmWindow?.hide()

  const next = queue.shift()
  if (next) {
    presentAlarm(next)
  }
}
