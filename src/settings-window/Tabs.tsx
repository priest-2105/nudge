import type { ReactNode } from 'react'

export interface TabDef {
  id: string
  label: string
}

interface Props {
  tabs: TabDef[]
  activeId: string
  onChange: (id: string) => void
}

export function TabBar({ tabs, activeId, onChange }: Props): JSX.Element {
  return (
    <div className="tab-bar" role="tablist" aria-label="Settings sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeId}
          className={`tab-button${tab.id === activeId ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

interface PanelProps {
  id: string
  activeId: string
  children: ReactNode
}

export function TabPanel({ id, activeId, children }: PanelProps): JSX.Element | null {
  if (id !== activeId) return null
  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  )
}
