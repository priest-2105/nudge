import { useEffect, useState } from 'react'
import type { NewReminder, Reminder } from '../shared/types'

interface FormState {
  title: string
  message: string
  recurrence: Reminder['recurrence']
  startsAt: string // datetime-local value
  intervalMinutes: string
}

const EMPTY_FORM: FormState = {
  title: '',
  message: '',
  recurrence: 'none',
  startsAt: '',
  intervalMinutes: '30'
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatWhen(reminder: Reminder): string {
  const d = new Date(reminder.nextTriggerAt)
  const when = d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  if (reminder.recurrence === 'none') return when
  if (reminder.recurrence === 'daily') return `${when} · daily`
  if (reminder.recurrence === 'weekly') return `${when} · weekly`
  return `${when} · every ${reminder.recurrenceIntervalMinutes ?? '?'}m`
}

export function RemindersPanel(): JSX.Element {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  async function refresh(): Promise<void> {
    setReminders(await window.api.listReminders())
  }

  useEffect(() => {
    refresh()
    const off = window.api.onDataChanged((entity) => {
      if (entity === 'reminders') refresh()
    })
    return off
  }, [])

  function openCreateForm(): void {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, startsAt: toDatetimeLocalValue(new Date(Date.now() + 60_000).toISOString()) })
    setFormOpen(true)
  }

  function openEditForm(reminder: Reminder): void {
    setEditingId(reminder.id)
    setForm({
      title: reminder.title,
      message: reminder.message,
      recurrence: reminder.recurrence,
      startsAt: toDatetimeLocalValue(reminder.nextTriggerAt),
      intervalMinutes: String(reminder.recurrenceIntervalMinutes ?? 30)
    })
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.title.trim() || !form.startsAt) return

    const nextTriggerAt = new Date(form.startsAt).toISOString()
    const base: NewReminder = {
      title: form.title.trim(),
      message: form.message.trim(),
      nextTriggerAt,
      recurrence: form.recurrence,
      recurrenceIntervalMinutes:
        form.recurrence === 'custom' ? Number(form.intervalMinutes) || 30 : undefined,
      enabled: true
    }

    if (editingId) {
      await window.api.updateReminder(editingId, base)
    } else {
      await window.api.createReminder(base)
    }

    setFormOpen(false)
    await refresh()
  }

  async function handleDelete(id: string): Promise<void> {
    await window.api.deleteReminder(id)
    await refresh()
  }

  async function handleTogglePause(reminder: Reminder): Promise<void> {
    await window.api.updateReminder(reminder.id, { enabled: !reminder.enabled })
    await refresh()
  }

  return (
    <div>
      <div className="panel-header">
        <p className="section-label">Reminders</p>
        <button className="btn btn-primary btn-sm" onClick={openCreateForm}>
          + New reminder
        </button>
      </div>

      {reminders.length === 0 && !formOpen && (
        <p className="reminder-body">No reminders yet — create one to test the overlay for real.</p>
      )}

      <div className="card-grid">
        {reminders.map((reminder) => (
          <div className="reminder-card" key={reminder.id} style={{ opacity: reminder.enabled ? 1 : 0.55 }}>
            <div className="peek" />
            <p className="reminder-eyebrow">
              {reminder.recurrence === 'none' ? 'One-off' : `${reminder.recurrence[0].toUpperCase()}${reminder.recurrence.slice(1)} · Recurring`}
            </p>
            <h3 className="reminder-title">{reminder.title}</h3>
            {reminder.message && <p className="reminder-body">{reminder.message}</p>}
            <div className="reminder-time">⏰ {formatWhen(reminder)}</div>
            <div className="reminder-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => openEditForm(reminder)}>
                Edit
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleTogglePause(reminder)}>
                {reminder.enabled ? 'Pause' : 'Resume'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(reminder.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {formOpen && (
        <form className="reminder-form" onSubmit={handleSubmit}>
          <p className="section-label">{editingId ? 'Edit reminder' : 'New reminder'}</p>

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Drink water"
              required
            />
          </label>

          <label>
            Message
            <input
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Fill up your glass"
            />
          </label>

          <label>
            Starts at
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </label>

          <label>
            Repeats
            <select
              value={form.recurrence}
              onChange={(e) => setForm({ ...form, recurrence: e.target.value as Reminder['recurrence'] })}
            >
              <option value="none">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Every N minutes</option>
            </select>
          </label>

          {form.recurrence === 'custom' && (
            <label>
              Interval (minutes)
              <input
                type="number"
                min={1}
                value={form.intervalMinutes}
                onChange={(e) => setForm({ ...form, intervalMinutes: e.target.value })}
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
