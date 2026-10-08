import { describe, expect, it } from 'vitest'
import { normalizeTaskDates } from '../taskDates'

describe('timed events without an explicit end', () => {
  const startDate = '2026-10-08T18:00:00+04:00'

  it.each(['2026-10-08', null, undefined])('uses a one-hour slot when AI returns dueDate=%s', (dueDate) => {
    const result = normalizeTaskDates({ startDate, dueDate })
    expect(result.startDate).toBe('2026-10-08T14:00:00.000Z')
    expect(result.deadline).toBe('2026-10-08T15:00:00.000Z')
  })

  it('uses the specified duration and handles crossing midnight', () => {
    const result = normalizeTaskDates({ startDate: '2026-10-08T23:30:00+04:00', dueDate: '2026-10-08', estimatedMinutes: 90 })
    expect(result.deadline).toBe('2026-10-08T21:00:00.000Z')
  })

  it('preserves an explicitly specified end instead of shortening it', () => {
    const result = normalizeTaskDates({ startDate, dueDate: '2026-10-08', deadline: '2026-10-08T21:00:00+04:00' })
    expect(result.startDate).toBe('2026-10-08T14:00:00.000Z')
    expect(result.deadline).toBe('2026-10-08T17:00:00.000Z')
  })
})
