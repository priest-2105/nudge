import { useEffect, useState } from 'react'
import type { AlarmTriggerPayload } from '../shared/types'
import { startRingtone, stopRingtone } from './ringtone'

export default function App(): JSX.Element {
  const [visible, setVisible] = useState(false)
  const [payload, setPayload] = useState<AlarmTriggerPayload | null>(null)

  useEffect(() => {
    const offTrigger = window.api.onTriggerAlarm((p) => {
      setPayload(p)
      setVisible(true)
      startRingtone()
    })
    return () => {
      offTrigger()
      stopRingtone()
    }
  }, [])

  function handleStop(): void {
    if (!payload) return
    stopRingtone()
    setVisible(false)
    window.api.stopAlarm(payload.alarmId)
  }

  function handleSnooze(): void {
    if (!payload) return
    stopRingtone()
    setVisible(false)
    window.api.snoozeAlarm(payload.alarmId, payload.snoozeMinutes)
  }

  return (
    <div className="alarm-root">
      <div className={`alarm-bubble${visible ? '' : ' is-hidden'}`}>
        <div className="alarm-face" />
        <p className="alarm-eyebrow">Alarm</p>
        <h1 className="alarm-label">{payload?.label ?? 'Alarm'}</h1>
        <div className="alarm-actions">
          {payload?.snoozeEnabled && (
            <button className="btn btn-secondary" onClick={handleSnooze}>
              Snooze {payload.snoozeMinutes}m
            </button>
          )}
          <button className="btn btn-primary" onClick={handleStop}>
            Stop
          </button>
        </div>
      </div>
    </div>
  )
}
