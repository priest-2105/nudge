import type { TaskTriggerPayload, TriggerPayload } from '../shared/types'

type ActiveTrigger =
  | { kind: 'reminder'; payload: TriggerPayload }
  | { kind: 'task'; payload: TaskTriggerPayload }

interface Props {
  visible: boolean
  active: ActiveTrigger | null
  onMouseEnter: () => void
  onMouseLeave: () => void
  onDismiss: () => void
  onSnooze: (minutes: number) => void
  onDone: () => void
}

// Placeholder for Rive (Milestone 7): a plain card that slides in from the
// screen edge and back out, standing in for the animated avatar.
export function AvatarStage({
  visible,
  active,
  onMouseEnter,
  onMouseLeave,
  onDismiss,
  onSnooze,
  onDone
}: Props): JSX.Element {
  const isTask = active?.kind === 'task'
  const title = active?.payload.title ?? 'Placeholder Avatar'
  const message = active?.kind === 'reminder' ? active.payload.message : undefined

  return (
    <div
      className={`avatar-bubble${visible ? '' : ' is-hidden'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="avatar-face" />
      <div>
        <p className="msg-eyebrow">{isTask ? 'Time to' : 'Nudge says'}</p>
        <p className="msg-title">{title}</p>
        {message && <p className="msg-body">{message}</p>}
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
      </div>
    </div>
  )
}
