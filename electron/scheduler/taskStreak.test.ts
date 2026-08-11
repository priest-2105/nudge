import { describe, expect, it } from 'vitest'
import type { TaskOccurrenceLog, TaskStreak } from '../../src/shared/types'
import { computeStreakAfterDay, isDayComplete } from './taskStreak'

function occurrence(completedAt: string | undefined): TaskOccurrenceLog {
  return { id: 'o', taskId: 't', scheduledFor: '08:00', date: '2026-08-10', completedAt }
}

describe('isDayComplete', () => {
  it('is complete only when every occurrence is completed', () => {
    const all = [occurrence('t1'), occurrence('t2'), occurrence('t3')]
    expect(isDayComplete(all, 3)).toBe(true)
  })

  it('is incomplete when even one occurrence is missing (5/8 case)', () => {
    const occurrences = [
      ...Array.from({ length: 5 }, () => occurrence('done')),
      ...Array.from({ length: 3 }, () => occurrence(undefined))
    ]
    expect(isDayComplete(occurrences, 8)).toBe(false)
  })

  it('is incomplete if fewer occurrence rows exist than timesPerDay', () => {
    expect(isDayComplete([occurrence('done')], 3)).toBe(false)
  })
})

describe('computeStreakAfterDay', () => {
  const base: TaskStreak = { taskId: 't', currentStreak: 3, longestStreak: 5 }

  it('increments currentStreak and raises longestStreak on a complete day', () => {
    const next = computeStreakAfterDay(base, '2026-08-10', true)
    expect(next.currentStreak).toBe(4)
    expect(next.longestStreak).toBe(5)
    expect(next.lastCompletedDate).toBe('2026-08-10')
  })

  it('raises longestStreak when the new streak exceeds the prior record', () => {
    const next = computeStreakAfterDay({ ...base, currentStreak: 5, longestStreak: 5 }, '2026-08-10', true)
    expect(next.currentStreak).toBe(6)
    expect(next.longestStreak).toBe(6)
  })

  it('resets currentStreak to 0 on an incomplete day — a break, not a pause', () => {
    const next = computeStreakAfterDay(base, '2026-08-10', false)
    expect(next.currentStreak).toBe(0)
    expect(next.longestStreak).toBe(5)
    expect(next.lastCompletedDate).toBe(base.lastCompletedDate)
  })
})
