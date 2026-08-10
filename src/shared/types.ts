export interface Reminder {
  id: string
  title: string
  message: string
  triggerAt: string // ISO datetime for next trigger
  recurrence: 'none' | 'daily' | 'weekly' | 'custom'
  recurrenceInterval?: number // for 'custom', in minutes
  enabled: boolean
  createdAt: string
  lastTriggeredAt?: string
}

export interface AppSettings {
  avatarId: string
  screenEdge: 'left' | 'right' | 'bottom'
  soundEnabled: boolean
  defaultSnoozeMinutes: number
  launchOnStartup: boolean
  displayId?: number
}

export interface OverlayTriggerPayload {
  title: string
  message: string
}
