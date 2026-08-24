import type { AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  avatarId: 'default',
  overlayPosition: 'bottom-right',
  celebrationType: 'confetti',
  soundEnabled: true,
  defaultSnoozeMinutes: 10,
  launchOnStartup: false,
  clockWidget: {
    enabled: false,
    style: 'digital',
    position: { x: 20, y: 20 },
    alwaysOnTop: true
  },
  peekPreview: {
    leadMinutes: 5,
    remindersEnabled: true,
    tasksEnabled: true,
    alarmsEnabled: true
  }
}
