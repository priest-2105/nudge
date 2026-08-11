import { useEffect, useState } from 'react'
import type { Alarm, NewAlarm } from '../shared/types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

interface FormState {
  label: string
  localTime: string
  daysOfWeek: number[]
  snoozeEnabled: boolean
  snoozeMinutes: string
}

const EMPTY_FORM: FormState = {
  label: '',
  localTime: '07:30',
  daysOfWeek: [1, 2, 3, 4, 5],
  snoozeEnabled: true,
  snoozeMinutes: '9'
}

function formatDays(daysOfWeek: number[]): string {
  if (daysOfWeek.length === 0) return 'One-off'
  if (daysOfWeek.length === 7) return 'Every day'
  return daysOfWeek
    .slice()
    .sort()
    .map((d) => WEEKDAY_LABELS[d])
    .join(' ')
}

export function AlarmsPanel(): JSX.Element {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  async function refresh(): Promise<void> {
    setAlarms(await window.api.listAlarms())
  }

  useEffect(() => {
    refresh()
    const off = window.api.onDataChanged((entity) => {
      if (entity === 'alarms') refresh()
    })
    return off
  }, [])

  function openCreateForm(): void {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEditForm(alarm: Alarm): void {
    setEditingId(alarm.id)
    setForm({
      label: alarm.label,
      localTime: alarm.localTime,
      daysOfWeek: alarm.daysOfWeek,
      snoozeEnabled: alarm.snoozeEnabled,
      snoozeMinutes: String(alarm.snoozeMinutes)
    })
    setFormOpen(true)
  }

  function toggleDay(day: number): void {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort()
    }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.label.trim()) return

    const payload: NewAlarm = {
      label: form.label.trim(),
      localTime: form.localTime,
      timezone: LOCAL_TIMEZONE,
      daysOfWeek: form.daysOfWeek,
      soundId: 'default',
      snoozeEnabled: form.snoozeEnabled,
      snoozeMinutes: Number(form.snoozeMinutes) || 9,
      enabled: true,
      // The main process recomputes this via the DST-aware recurrence logic
      // before insert — this placeholder is never persisted as-is.
      nextTriggerAt: new Date().toISOString()
    }

    if (editingId) {
      await window.api.updateAlarm(editingId, payload)
    } else {
      await window.api.createAlarm(payload)
    }

    setFormOpen(false)
    await refresh()
  }

  async function handleDelete(id: string): Promise<void> {
    await window.api.deleteAlarm(id)
    await refresh()
  }

  async function handleToggleEnabled(alarm: Alarm): Promise<void> {
    await window.api.updateAlarm(alarm.id, { enabled: !alarm.enabled })
    await refresh()
  }

  return (
    <div>
      <div className="panel-header">
        <p className="section-label">Alarms</p>
        <button className="btn btn-primary btn-sm" onClick={openCreateForm}>
          + New alarm
        </button>
      </div>

      {alarms.length === 0 && !formOpen && <p className="reminder-body">No alarms yet.</p>}

      <div className="card-grid">
        {alarms.map((alarm) => (
          <div className="reminder-card" key={alarm.id} style={{ opacity: alarm.enabled ? 1 : 0.55 }}>
            <div className="peek" />
            <p className="reminder-eyebrow">{formatDays(alarm.daysOfWeek)}</p>
            <h3 className="reminder-title">{alarm.label}</h3>
            <div className="reminder-time">⏰ {alarm.localTime}</div>
            <div className="reminder-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => openEditForm(alarm)}>
                Edit
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleToggleEnabled(alarm)}>
                {alarm.enabled ? 'Pause' : 'Resume'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(alarm.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {formOpen && (
        <form className="reminder-form" onSubmit={handleSubmit}>
          <p className="section-label">{editingId ? 'Edit alarm' : 'New alarm'}</p>

          <label>
            Label
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Wake up"
              required
            />
          </label>

          <label>
            Time
            <input
              type="time"
              value={form.localTime}
              onChange={(e) => setForm({ ...form, localTime: e.target.value })}
              required
            />
          </label>

          <label>
            Repeats on
            <div className="weekday-picker">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  type="button"
                  key={label}
                  className={`weekday-toggle${form.daysOfWeek.includes(day) ? ' is-active' : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.snoozeEnabled}
              onChange={(e) => setForm({ ...form, snoozeEnabled: e.target.checked })}
            />
            Allow snooze
          </label>

          {form.snoozeEnabled && (
            <label>
              Snooze minutes
              <input
                type="number"
                min={1}
                value={form.snoozeMinutes}
                onChange={(e) => setForm({ ...form, snoozeMinutes: e.target.value })}
              />
            </label>
          )}

          <div className="reminder-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              {editingId ? 'Save' : 'Create'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
