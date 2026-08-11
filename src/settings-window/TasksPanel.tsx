import { useEffect, useState } from 'react'
import type { NewTask, Task, TaskStreak } from '../shared/types'

const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

interface FormState {
  title: string
  timesPerDay: string
  scheduleMode: Task['scheduleMode']
  windowStart: string
  windowEnd: string
}

const EMPTY_FORM: FormState = {
  title: '',
  timesPerDay: '8',
  scheduleMode: 'auto',
  windowStart: '08:00',
  windowEnd: '22:00'
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
      scheduleMode: task.scheduleMode,
      windowStart: task.windowStart,
      windowEnd: task.windowEnd
    })
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.title.trim()) return

    const payload: NewTask = {
      title: form.title.trim(),
      timesPerDay: Number(form.timesPerDay) || 1,
      scheduleMode: form.scheduleMode,
      windowStart: form.windowStart,
      windowEnd: form.windowEnd,
      occurrenceTimes: [], // resolved server-side for 'auto'; manual editing of exact times is a fast-follow
      timezone: LOCAL_TIMEZONE,
      enabled: true
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

  return (
    <div>
      <div className="panel-header">
        <p className="section-label">Tasks</p>
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
            Times per day
            <input
              type="number"
              min={1}
              value={form.timesPerDay}
              onChange={(e) => setForm({ ...form, timesPerDay: e.target.value })}
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
            </>
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
