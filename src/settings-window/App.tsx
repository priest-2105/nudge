import { useState } from 'react'
import '../shared/styles/tokens.css'
import './App.css'
import { RemindersPanel } from './RemindersPanel'
import { AlarmsPanel } from './AlarmsPanel'
import { TasksPanel } from './TasksPanel'
import { PreferencesPanel } from './PreferencesPanel'
import { TabBar, TabPanel, type TabDef } from './Tabs'

const TABS: TabDef[] = [
  { id: 'reminders', label: 'Reminders' },
  { id: 'alarms', label: 'Alarms' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'preferences', label: 'Preferences' }
]

export default function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState(TABS[0].id)

  return (
    <div className="app">
      <div className="masthead">
        <span className="logo-dot" />
        <h1>Nudge</h1>
      </div>
      <p className="subhead">Settings — reminders that actually get your attention</p>

      <TabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      <TabPanel id="reminders" activeId={activeTab}>
        <RemindersPanel />
      </TabPanel>
      <TabPanel id="alarms" activeId={activeTab}>
        <AlarmsPanel />
      </TabPanel>
      <TabPanel id="tasks" activeId={activeTab}>
        <TasksPanel />
      </TabPanel>
      <TabPanel id="preferences" activeId={activeTab}>
        <PreferencesPanel />
      </TabPanel>
    </div>
  )
}
