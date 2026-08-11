import type { TaskOccurrenceLog, TaskStreak } from '../../src/shared/types'

/**
 * A day counts as complete only if every one of that day's occurrences was
 * marked completed — per requirement.md §6, 5/8 glasses is not a completed
 * day, it's a broken streak.
 */
export function isDayComplete(occurrences: TaskOccurrenceLog[], timesPerDay: number): boolean {
  return occurrences.length === timesPerDay && occurrences.every((o) => Boolean(o.completedAt))
}

/**
 * Applies one day's rollover result to a streak. A complete day extends the
 * streak (and raises the longest-streak high-water mark); an incomplete day
 * resets it to 0 outright — it does not merely pause it.
 */
export function computeStreakAfterDay(
  previous: TaskStreak,
  evaluatedDate: string,
  dayComplete: boolean
): TaskStreak {
  if (!dayComplete) {
    return { ...previous, currentStreak: 0 }
  }
  const currentStreak = previous.currentStreak + 1
  return {
    ...previous,
    currentStreak,
    longestStreak: Math.max(previous.longestStreak, currentStreak),
    lastCompletedDate: evaluatedDate
  }
}
