import { useEffect, useRef, useState } from 'react'
import type { OverlayTriggerPayload } from '../shared/types'
import { AvatarStage } from './AvatarStage'

const AUTO_EXIT_MS = 15000

export default function App(): JSX.Element {
  const [visible, setVisible] = useState(false)
  const [payload, setPayload] = useState<OverlayTriggerPayload | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const offShow = window.api.onOverlayShow((p) => {
      setPayload(p)
      setVisible(true)
      resetAutoExitTimer()
    })
    const offHide = window.api.onOverlayHide(() => {
      setVisible(false)
    })
    return () => {
      offShow()
      offHide()
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  function resetAutoExitTimer(): void {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setVisible(false), AUTO_EXIT_MS)
  }

  function handleDismiss(): void {
    setVisible(false)
    window.api.dismissOverlay()
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
        payload={payload}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDismiss={handleDismiss}
      />
    </div>
  )
}
