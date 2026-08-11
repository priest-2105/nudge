import { useEffect, useRef, useState } from 'react'
import type { TaskTriggerPayload, TriggerPayload } from '../shared/types'
import { AvatarStage } from './AvatarStage'

const AUTO_EXIT_MS = 15000

type ActiveTrigger =
  | { kind: 'reminder'; payload: TriggerPayload }
  | { kind: 'task'; payload: TaskTriggerPayload }

export default function App(): JSX.Element {
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState<ActiveTrigger | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const offReminder = window.api.onTriggerReminder((p) => {
      setActive({ kind: 'reminder', payload: p })
      setVisible(true)
      resetAutoExitTimer(p.triggerId)
    })
    const offTask = window.api.onTriggerTaskOccurrence((p) => {
      setActive({ kind: 'task', payload: p })
      setVisible(true)
      resetAutoExitTimer(p.triggerId)
    })
    const offHide = window.api.onOverlayHide(() => {
      setVisible(false)
    })
    return () => {
      offReminder()
      offTask()
      offHide()
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  function resetAutoExitTimer(triggerId: string): void {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setVisible(false)
      window.api.dismissOverlayTrigger(triggerId)
    }, AUTO_EXIT_MS)
  }

  function handleDismiss(): void {
    if (!active) return
    setVisible(false)
    window.api.dismissOverlayTrigger(active.payload.triggerId)
  }

  function handleSnooze(minutes: number): void {
    if (!active) return
    setVisible(false)
    window.api.snoozeOverlayTrigger(active.payload.triggerId, minutes)
  }

  function handleDone(): void {
    if (!active || active.kind !== 'task') return
    setVisible(false)
    window.api.completeTaskOccurrence(active.payload.taskId, active.payload.occurrenceId)
  }

  function handleMouseEnter(): void {
    window.api.setOverlayInteractive(true)
  }

  function handleMouseLeave(): void {
    window.api.setOverlayInteractive(false)
  }

  return (
    <div className="overlay-root">
      <AvatarStage
        visible={visible}
        active={active}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDismiss={handleDismiss}
        onSnooze={handleSnooze}
        onDone={handleDone}
      />
    </div>
  )
}
