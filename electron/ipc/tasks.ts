import { ipcMain } from 'electron'
import { IpcChannels } from '../../src/shared/ipc'
import type { NewTask, Task } from '../../src/shared/types'
import { getDb, persist } from '../db'
import {
  createTask,
  deleteTask,
  getOccurrencesForDate,
  getTaskStreak,
  listTasks,
  updateTask
} from '../db/queries'
import { distributeOccurrences } from '../scheduler/taskDistribution'
import { localDateString } from '../scheduler/taskRollover'
import { notifyDataChanged } from '../windows/settingsWindow'

function resolveOccurrenceTimes(input: {
  scheduleMode: Task['scheduleMode']
  timesPerDay: number
  windowStart: string
  windowEnd: string
  occurrenceTimes: string[]
}): string[] {
  if (input.scheduleMode === 'auto') {
    return distributeOccurrences(input.timesPerDay, input.windowStart, input.windowEnd)
  }
  // 'manual' mode: use explicitly provided times if given, otherwise seed
  // with an auto-distributed default so the task isn't silently inert —
  // a dedicated per-time editor UI is a fast-follow, not required for the
  // occurrences to actually fire.
  if (input.occurrenceTimes.length === input.timesPerDay) {
    return input.occurrenceTimes
  }
  return distributeOccurrences(input.timesPerDay, input.windowStart, input.windowEnd)
}

export function registerTaskHandlers(): void {
  ipcMain.handle(IpcChannels.TasksList, () => listTasks(getDb()))

  ipcMain.handle(IpcChannels.TasksCreate, (_event, payload: NewTask) => {
    const db = getDb()
    const occurrenceTimes = resolveOccurrenceTimes(payload)
    const task = createTask(db, { ...payload, occurrenceTimes })
    persist()
    notifyDataChanged('tasks')
    return task
  })

  ipcMain.handle(IpcChannels.TasksUpdate, (_event, id: string, patch: Partial<Task>) => {
    const db = getDb()
    let finalPatch = patch

    // Editing timesPerDay/window/mode regenerates the occurrence template,
    // but per requirement.md §6 this must not retroactively touch today's
    // already-generated/possibly-completed rows — only future days pick up
    // the new template (task_occurrence_log rows are generated separately
    // by the scheduler's daily rollover, not rewritten here).
    if (patch.timesPerDay || patch.windowStart || patch.windowEnd || patch.scheduleMode || patch.occurrenceTimes) {
      const existing = listTasks(db).find((t) => t.id === id)
      if (existing) {
        const merged = { ...existing, ...patch }
        finalPatch = { ...patch, occurrenceTimes: resolveOccurrenceTimes(merged) }
      }
    }

    const task = updateTask(db, id, finalPatch)
    persist()
    notifyDataChanged('tasks')
    return task
  })

  ipcMain.handle(IpcChannels.TasksDelete, (_event, id: string) => {
    deleteTask(getDb(), id)
    persist()
    notifyDataChanged('tasks')
  })

  ipcMain.handle(IpcChannels.TasksGetTodayProgress, (_event, taskId: string) => {
    const db = getDb()
    const task = listTasks(db).find((t) => t.id === taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)

    const today = localDateString(new Date(), task.timezone)
    const occurrences = getOccurrencesForDate(db, taskId, today)
    return {
      completed: occurrences.filter((o) => o.completedAt).length,
      total: task.timesPerDay,
      streak: getTaskStreak(db, taskId)
    }
  })
}
