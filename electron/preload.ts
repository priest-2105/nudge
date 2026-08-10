import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../src/shared/ipc'
import type { NudgeApi } from '../src/shared/ipc'
import type { OverlayTriggerPayload } from '../src/shared/types'

const api: NudgeApi = {
  triggerTestOverlay: (payload) => ipcRenderer.send(IpcChannels.OverlayTriggerTest, payload),
  setOverlayInteractive: (isInteractive) =>
    ipcRenderer.send(IpcChannels.OverlaySetInteractive, isInteractive),
  dismissOverlay: () => ipcRenderer.send(IpcChannels.OverlayDismiss),
  onOverlayShow: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: OverlayTriggerPayload): void =>
      cb(payload)
    ipcRenderer.on(IpcChannels.OverlayShow, listener)
    return () => ipcRenderer.removeListener(IpcChannels.OverlayShow, listener)
  },
  onOverlayHide: (cb) => {
    const listener = (): void => cb()
    ipcRenderer.on(IpcChannels.OverlayHide, listener)
    return () => ipcRenderer.removeListener(IpcChannels.OverlayHide, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
