import type { OverlayTriggerPayload } from '../shared/types'

interface Props {
  visible: boolean
  payload: OverlayTriggerPayload | null
  onMouseEnter: () => void
  onMouseLeave: () => void
  onDismiss: () => void
}

// Placeholder for Rive (Milestone 5): a plain card that slides in from the
// screen edge and back out, standing in for the animated avatar.
export function AvatarStage({
  visible,
  payload,
  onMouseEnter,
  onMouseLeave,
  onDismiss
}: Props): JSX.Element {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 16,
        width: 280,
        height: 340,
        borderRadius: 16,
        background: '#4f46e5',
        color: 'white',
        padding: 16,
        boxSizing: 'border-box',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        pointerEvents: 'auto',
        transform: visible ? 'translateX(0)' : 'translateX(340px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 300ms ease-out, opacity 300ms ease-out'
      }}
    >
      <strong>{payload?.title ?? 'Placeholder Avatar'}</strong>
      <p>{payload?.message}</p>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )
}
