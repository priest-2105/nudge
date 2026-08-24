import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * The avatar canvas renders a third-party WASM runtime (Rive) that can throw
 * for reasons outside our control (asset quirks, version mismatches). A
 * crash there must never take down the whole overlay — reminders and tasks
 * still have to show up and be actionable even if the avatar can't render.
 */
export class AvatarErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    console.warn('[AvatarErrorBoundary] avatar canvas crashed, hiding it', error)
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
