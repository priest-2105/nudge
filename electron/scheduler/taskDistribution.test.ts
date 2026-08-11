import { describe, expect, it } from 'vitest'
import { distributeOccurrences } from './taskDistribution'

describe('distributeOccurrences', () => {
  it('places occurrences at segment midpoints, not window edges', () => {
    const times = distributeOccurrences(2, '08:00', '22:00')
    // window is 14h = 840min, split into 2 segments of 420min each,
    // midpoints at 08:00+210min=11:30 and 08:00+630min=18:30
    expect(times).toEqual(['11:30', '18:30'])
  })

  it('is deterministic across repeated calls with the same inputs', () => {
    const first = distributeOccurrences(8, '08:00', '22:00')
    const second = distributeOccurrences(8, '08:00', '22:00')
    expect(first).toEqual(second)
  })

  it('returns exactly timesPerDay entries, in ascending order', () => {
    const times = distributeOccurrences(8, '08:00', '22:00')
    expect(times).toHaveLength(8)
    const minutes = times.map((t) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    })
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b))
  })

  it('rounds to the nearest 5 minutes', () => {
    const times = distributeOccurrences(3, '09:00', '17:00')
    for (const t of times) {
      const minute = Number(t.split(':')[1])
      expect(minute % 5).toBe(0)
    }
  })

  it('rejects a non-positive timesPerDay', () => {
    expect(() => distributeOccurrences(0, '08:00', '22:00')).toThrow()
  })

  it('rejects a window where end is not after start', () => {
    expect(() => distributeOccurrences(3, '22:00', '08:00')).toThrow()
  })
})
