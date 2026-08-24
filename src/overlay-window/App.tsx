import { useEffect, useRef, useState } from 'react'
import type { AppSettings, PeekPreviewPayload, TaskTriggerPayload, TriggerPayload } from '../shared/types'
import { AvatarStage } from './AvatarStage'
import { PeekFace } from './PeekFace'

const AUTO_EXIT_MS = 15000
const CELEBRATION_MS = 700
const PEEK_DURATION_MS = 2600

type ActiveTrigger =
  | { kind: 'reminder'; payload: TriggerPayload }
  | { kind: 'task'; payload: TaskTriggerPayload }

export default function App(): JSX.Element {
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState<ActiveTrigger | null>(null)
  const [avatarId, setAvatarId] = useState('default')
  const [celebrationType, setCelebrationType] = useState<AppSettings['celebrationType']>('confetti')
  const [overlayPosition, setOverlayPosition] = useState<AppSettings['overlayPosition']>('bottom-right')
  const [celebrating, setCelebrating] = useState(false)
  const [peek, setPeek] = useState<PeekPreviewPayload | null>(null)
  const timerRef = useRef<number | null>(null)
  const peekTimerRef = useRef<number | null>(null)
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setAvatarId(s.avatarId)
      setCelebrationType(s.celebrationType)
      setOverlayPosition(s.overlayPosition)
    })
  }, [])

  useEffect(() => {
    const offPeek = window.api.onPeekPreview((p) => {
      if (visibleRef.current) return
      setPeek(p)
      if (peekTimerRef.current) window.clearTimeout(peekTimerRef.current)
      peekTimerRef.current = window.setTimeout(() => setPeek(null), PEEK_DURATION_MS)
    })
    return () => {
      offPeek()
      if (peekTimerRef.current) window.clearTimeout(peekTimerRef.current)
    }
  }, [])

  // A real trigger always wins over a peek that happened to still be showing.
  function dismissPeek(): void {
    if (peekTimerRef.current) window.clearTimeout(peekTimerRef.current)
    setPeek(null)
  }

  useEffect(() => {
    const offReminder = window.api.onTriggerReminder((p) => {
      dismissPeek()
      setActive({ kind: 'reminder', payload: p })
      setVisible(true)
      resetAutoExitTimer(p.triggerId)
    })
    const offTask = window.api.onTriggerTaskOccurrence((p) => {
      dismissPeek()
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
    if (!active || active.kind !== 'task' || celebrating) return
    if (timerRef.current) window.clearTimeout(timerRef.current)
    const { taskId, occurrenceId } = active.payload
    setCelebrating(true)
    window.setTimeout(() => {
      setCelebrating(false)
      setVisible(false)
      window.api.completeTaskOccurrence(taskId, occurrenceId)
    }, CELEBRATION_MS)
  }

  function handleMouseEnter(): void {
    window.api.setOverlayInteractive(true)
  }

  function handleMouseLeave(): void {
    window.api.setOverlayInteractive(false)
  }

  return (
    <div className="overlay-root">
      <PeekFace peek={peek} corner={overlayPosition} />
      <AvatarStage
        visible={visible}
        avatarId={avatarId}
        active={active}
        celebrating={celebrating}
        celebrationType={celebrationType}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDismiss={handleDismiss}
        onSnooze={handleSnooze}
        onDone={handleDone}
      />
    </div>
  )
}
