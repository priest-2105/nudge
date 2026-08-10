import type { OverlayTriggerPayload } from './types'

/** Channel name constants — single source of truth, avoids typos. */
export const IpcChannels = {
  // settings renderer -> main: manually trigger the overlay (dev/testing, until scheduler exists)
  OverlayTriggerTest: 'overlay:trigger-test',
  // main -> overlay renderer: play enter animation with this payload
  OverlayShow: 'overlay:show',
  // main -> overlay renderer: play exit animation
  OverlayHide: 'overlay:hide',
  // overlay renderer -> main: mouse entered/left an interactive hit area
  OverlaySetInteractive: 'overlay:set-interactive',
  // overlay renderer -> main: user dismissed the overlay
  OverlayDismiss: 'overlay:dismiss'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

/** Shape exposed on window.api via contextBridge (implemented in electron/preload.ts). */
export interface NudgeApi {
  triggerTestOverlay: (payload: OverlayTriggerPayload) => void
  setOverlayInteractive: (isInteractive: boolean) => void
  dismissOverlay: () => void
  onOverlayShow: (cb: (payload: OverlayTriggerPayload) => void) => () => void
  onOverlayHide: (cb: () => void) => () => void
}

declare global {
  interface Window {
    api: NudgeApi
  }
}
