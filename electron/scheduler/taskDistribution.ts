/**
 * Divides [windowStart, windowEnd) into `timesPerDay` equal segments and
 * places each occurrence at its segment midpoint (not the edges — avoids
 * clustering the first occurrence right at windowStart). Rounds to the
 * nearest 5 minutes. Deterministic: identical inputs always produce
 * identical output, so re-saving a task without changing count/window never
 * reshuffles its occurrence times.
 */
export function distributeOccurrences(
  timesPerDay: number,
  windowStart: string,
  windowEnd: string
): string[] {
  if (timesPerDay <= 0) {
    throw new Error('timesPerDay must be positive')
  }

  const startMinutes = toMinutes(windowStart)
  const endMinutes = toMinutes(windowEnd)
  if (endMinutes <= startMinutes) {
    throw new Error('windowEnd must be after windowStart')
  }

  const segment = (endMinutes - startMinutes) / timesPerDay

  const times: string[] = []
  for (let i = 0; i < timesPerDay; i++) {
    const midpoint = startMinutes + segment * (i + 0.5)
    times.push(toHHMM(roundToNearest5(midpoint)))
  }
  return times
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function roundToNearest5(minutes: number): number {
  return Math.round(minutes / 5) * 5
}
