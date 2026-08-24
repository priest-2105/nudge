import { useEffect, useRef, useState } from 'react'
import type { AppSettings, TaskTriggerPayload, TriggerPayload } from '../shared/types'
import { AvatarCanvas, type AvatarPhase } from './AvatarCanvas'
import { AvatarErrorBoundary } from './AvatarErrorBoundary'
import { Confetti } from './Confetti'

/** One entry per CelebrationType — the only place a new celebration type needs registering. */
function renderCelebration(type: AppSettings['celebrationType'], active: boolean): JSX.Element | null {
  switch (type) {
    case 'confetti':
      return <Confetti active={active} />
    default:
      return null
  }
}

// Matches the CSS transition duration on .avatar-bubble in index.css.
const ENTER_EXIT_MS = 300

type ActiveTrigger =
  | { kind: 'reminder'; payload: TriggerPayload }
  | { kind: 'task'; payload: TaskTriggerPayload }

interface Props {
  visible: boolean
  avatarId: string
  active: ActiveTrigger | null
  celebrating: boolean
  celebrationType: AppSettings['celebrationType']
  onMouseEnter: () => void
  onMouseLeave: () => void
  onDismiss: () => void
  onSnooze: (minutes: number) => void
  onDone: () => void
}

export function AvatarStage({
  visible,
  avatarId,
  active,
  celebrating,
  celebrationType,
  onMouseEnter,
  onMouseLeave,
  onDismiss,
  onSnooze,
  onDone
}: Props): JSX.Element {
  const isTask = active?.kind === 'task'
  const title = active?.payload.title ?? 'Placeholder Avatar'
  const message = active?.kind === 'reminder' ? active.payload.message : undefined

  const [phase, setPhase] = useState<AvatarPhase>('idle')
  const wasVisible = useRef(visible)

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setPhase('enter')
      const t = window.setTimeout(() => setPhase('talk'), ENTER_EXIT_MS)
      wasVisible.current = visible
      return () => window.clearTimeout(t)
    }
    if (!visible && wasVisible.current) {
      setPhase('exit')
      const t = window.setTimeout(() => setPhase('idle'), ENTER_EXIT_MS)
      wasVisible.current = visible
      return () => window.clearTimeout(t)
    }
    wasVisible.current = visible
    return undefined
  }, [visible])

  useEffect(() => {
    if (celebrating) setPhase('celebrate')
  }, [celebrating])

  return (
    <div
      className={`avatar-bubble${visible ? '' : ' is-hidden'}${celebrating ? ' is-celebrating' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {renderCelebration(celebrationType, celebrating)}
      <AvatarErrorBoundary>
        <AvatarCanvas avatarId={avatarId} phase={phase} />
      </AvatarErrorBoundary>
      <div>
        <p className="msg-eyebrow">{celebrating ? 'Nice work' : isTask ? 'Time to' : 'Nudge says'}</p>
        <p className="msg-title">{celebrating ? `${title} ✓` : title}</p>
        {message && !celebrating && <p className="msg-body">{message}</p>}
        {!celebrating && (
          <div className="msg-actions">
            {isTask ? (
              <>
                <button className="msg-snooze" onClick={() => onSnooze(10)}>
                  Snooze 10m
                </button>
                <button className="msg-dismiss" onClick={onDismiss}>
                  Skip
                </button>
                <button className="msg-done" onClick={onDone}>
                  Done
                </button>
              </>
            ) : (
              <>
                <button className="msg-snooze" onClick={() => onSnooze(10)}>
                  Snooze 10m
                </button>
                <button className="msg-dismiss" onClick={onDismiss}>
                  Dismiss
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
