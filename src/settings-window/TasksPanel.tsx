import { useEffect, useState } from 'react'
import type { NewTask, Task, TaskStreak } from '../shared/types'

const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

type CountMode = 'count' | 'interval'

interface FormState {
  title: string
  timesPerDay: string
  countMode: CountMode
  intervalHours: string
  scheduleMode: Task['scheduleMode']
  windowStart: string
  windowEnd: string
  pinned: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  timesPerDay: '8',
  countMode: 'count',
  intervalHours: '2',
  scheduleMode: 'auto',
  windowStart: '08:00',
  windowEnd: '22:00',
  pinned: true
}

/** How many times a check-in every `intervalHours` fits inside the window — at least 1. */
function timesPerDayFromInterval(windowStart: string, windowEnd: string, intervalHours: string): number {
  const [startH, startM] = windowStart.split(':').map(Number)
  const [endH, endM] = windowEnd.split(':').map(Number)
  const windowMinutes = endH * 60 + endM - (startH * 60 + startM)
  const intervalMinutes = Number(intervalHours) * 60
  if (windowMinutes <= 0 || intervalMinutes <= 0) return 1
  return Math.max(1, Math.round(windowMinutes / intervalMinutes))
}

type Progress = { completed: number; total: number; streak: TaskStreak }

export function TasksPanel(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([])
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  async function refresh(): Promise<void> {
    const list = await window.api.listTasks()
    setTasks(list)
    const entries = await Promise.all(
      list.map(async (t) => [t.id, await window.api.getTaskProgress(t.id)] as const)
    )
    setProgress(Object.fromEntries(entries))
  }

  useEffect(() => {
    refresh()
    const off = window.api.onDataChanged((entity) => {
      if (entity === 'tasks') refresh()
    })
    return off
  }, [])

  function openCreateForm(): void {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEditForm(task: Task): void {
    setEditingId(task.id)
    setForm({
      title: task.title,
      timesPerDay: String(task.timesPerDay),
      countMode: 'count',
      intervalHours: EMPTY_FORM.intervalHours,
      scheduleMode: task.scheduleMode,
      windowStart: task.windowStart,
      windowEnd: task.windowEnd,
      pinned: task.pinned
    })
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.title.trim()) return

    const timesPerDay =
      form.scheduleMode === 'auto' && form.countMode === 'interval'
        ? timesPerDayFromInterval(form.windowStart, form.windowEnd, form.intervalHours)
        : Number(form.timesPerDay) || 1

    const payload: NewTask = {
      title: form.title.trim(),
      timesPerDay,
      scheduleMode: form.scheduleMode,
      windowStart: form.windowStart,
      windowEnd: form.windowEnd,
      occurrenceTimes: [], // resolved server-side for 'auto'; manual editing of exact times is a fast-follow
      timezone: LOCAL_TIMEZONE,
      enabled: true,
      pinned: form.pinned
    }

    if (editingId) {
      await window.api.updateTask(editingId, payload)
    } else {
      await window.api.createTask(payload)
    }

    setFormOpen(false)
    await refresh()
  }

  async function handleDelete(id: string): Promise<void> {
    await window.api.deleteTask(id)
    await refresh()
  }

  async function handleToggleEnabled(task: Task): Promise<void> {
    await window.api.updateTask(task.id, { enabled: !task.enabled })
    await refresh()
  }

  async function handleTogglePinned(task: Task): Promise<void> {
    await window.api.updateTask(task.id, { pinned: !task.pinned })
    await refresh()
  }

  return (
    <div>
      <div className="panel-toolbar">
        <button className="btn btn-primary btn-sm" onClick={openCreateForm}>
          + New task
        </button>
      </div>

      {tasks.length === 0 && !formOpen && (
        <p className="reminder-body">No tasks yet — e.g. "Drink water, 8x/day".</p>
      )}

      <div className="card-grid">
        {tasks.map((task) => {
          const p = progress[task.id]
          return (
            <div className="reminder-card" key={task.id} style={{ opacity: task.enabled ? 1 : 0.55 }}>
              <div className="peek" />
              <p className="reminder-eyebrow">
                {task.timesPerDay}x/day · {task.scheduleMode}
                {task.pinned && <span className="tag" style={{ marginLeft: 8 }}>📌 Pinned</span>}
              </p>
              <h3 className="reminder-title">{task.title}</h3>
              {p && (
                <div className="reminder-time">
                  ✓ {p.completed}/{p.total} today · {p.streak.currentStreak} day streak
                </div>
              )}
              <div className="reminder-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => openEditForm(task)}>
                  Edit
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleTogglePinned(task)}>
                  {task.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleToggleEnabled(task)}>
                  {task.enabled ? 'Pause' : 'Resume'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(task.id)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {formOpen && (
        <form className="reminder-form" onSubmit={handleSubmit}>
          <p className="section-label">{editingId ? 'Edit task' : 'New task'}</p>

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
            Scheduling
            <select
              value={form.scheduleMode}
              onChange={(e) => setForm({ ...form, scheduleMode: e.target.value as Task['scheduleMode'] })}
            >
              <option value="auto">Auto-distribute across a window</option>
              <option value="manual">Manual (edit exact times later)</option>
            </select>
          </label>

          {form.scheduleMode === 'auto' && (
            <>
              <label>
                Window start
                <input
                  type="time"
                  value={form.windowStart}
                  onChange={(e) => setForm({ ...form, windowStart: e.target.value })}
                />
              </label>
              <label>
                Window end
                <input
                  type="time"
                  value={form.windowEnd}
                  onChange={(e) => setForm({ ...form, windowEnd: e.target.value })}
                />
              </label>

              <div className="weekday-picker">
                <button
                  type="button"
                  className={`weekday-toggle${form.countMode === 'count' ? ' is-active' : ''}`}
                  onClick={() => setForm({ ...form, countMode: 'count' })}
                >
                  By count
                </button>
                <button
                  type="button"
                  className={`weekday-toggle${form.countMode === 'interval' ? ' is-active' : ''}`}
                  onClick={() => setForm({ ...form, countMode: 'interval' })}
                >
                  By interval
                </button>
              </div>

              {form.countMode === 'count' ? (
                <label>
                  Check-ins per day
                  <input
                    type="number"
                    min={1}
                    value={form.timesPerDay}
                    onChange={(e) => setForm({ ...form, timesPerDay: e.target.value })}
                    required
                  />
                </label>
              ) : (
                <label>
                  Check-in every N hours
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={form.intervalHours}
                    onChange={(e) => setForm({ ...form, intervalHours: e.target.value })}
                    required
                  />
                </label>
              )}
            </>
          )}

          {form.scheduleMode === 'manual' && (
            <label>
              Check-ins per day
              <input
                type="number"
                min={1}
                value={form.timesPerDay}
                onChange={(e) => setForm({ ...form, timesPerDay: e.target.value })}
                required
              />
            </label>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
            />
            Pinned — keep this task every day until unpinned
          </label>

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
