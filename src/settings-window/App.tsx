import '../shared/styles/tokens.css'
import './App.css'
import { RemindersPanel } from './RemindersPanel'
import { AlarmsPanel } from './AlarmsPanel'
import { TasksPanel } from './TasksPanel'
import { PreferencesPanel } from './PreferencesPanel'

export default function App(): JSX.Element {
  return (
    <div className="app">
      <div className="masthead">
        <span className="logo-dot" />
        <h1>Nudge</h1>
      </div>
      <p className="subhead">Settings — reminders that actually get your attention</p>

      <RemindersPanel />
      <div className="panel-divider" />
      <AlarmsPanel />
      <div className="panel-divider" />
      <TasksPanel />
      <div className="panel-divider" />
      <PreferencesPanel />
    </div>
  )
}
