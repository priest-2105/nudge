import type { OverlayCorner, PeekPreviewPayload } from '../shared/types'

interface Props {
  peek: PeekPreviewPayload | null
  corner: OverlayCorner
}

/** The small blinking-face heads-up that peeks in shortly before a real trigger. */
export function PeekFace({ peek, corner }: Props): JSX.Element {
  const fromLeft = corner.endsWith('left')
  return (
    <div
      className={`peek-face${peek ? ' is-visible' : ''}${fromLeft ? ' from-left' : ' from-right'}`}
      aria-hidden="true"
    />
  )
}
