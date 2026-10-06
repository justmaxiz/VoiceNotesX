import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { normalizeTaskDates, localDeadline, localTime } from '../lib/taskDates'
import { Item } from '../types/item'

const originalZone = process.env.TZ
beforeEach(() => { process.env.TZ = 'UTC' })
afterEach(() => { process.env.TZ = originalZone })
const existing: Item = { id: 'task', type: 'task', title: 'Task', categoryTag: '#Work', status: 'todo', priority: 'medium', isFocus: false, createdAt: '2026-10-10T08:00:00Z', updatedAt: '2026-10-10T08:00:00Z', startDate: '2026-10-10T10:00:00.000Z', deadline: '2026-10-10T11:00:00.000Z', dueDate: '2026-10-10', dueTime: '11:00', estimatedMinutes: 60 }

describe('Temporal regressions against canonical local-date rules', () => {
  it('preserves deadline when start moves within interval', () => {
    expect(normalizeTaskDates({ startDate: '2026-10-10T10:30:00Z' }, existing).deadline).toBe(existing.deadline)
  })
  it('moves deadline when explicit start exceeds old deadline', () => {
    expect(normalizeTaskDates({ startDate: '2026-10-10T14:00:00Z' }, existing).deadline).toBe('2026-10-10T15:00:00.000Z')
  })
  it('creates an interval from a start and duration', () => {
    expect(normalizeTaskDates({ startDate: '2026-10-10T14:00:00Z', estimatedMinutes: 90 }).deadline).toBe('2026-10-10T15:30:00.000Z')
  })
  it('allows clearing the optional start while preserving deadline', () => {
    const result = normalizeTaskDates({ startDate: null }, existing)
    expect(result.startDate).toBeNull()
    expect(result.deadline).toBe(existing.deadline)
  })
  it('derives duration without inventing a schedule for backlog', () => {
    expect(normalizeTaskDates({ estimatedMinutes: 120 }).deadline).toBeNull()
  })
  it('keeps explicitly extended start time', () => {
    expect(normalizeTaskDates({ deadline: '2026-10-10T12:00:00Z' }, existing).startDate).toBe(existing.startDate)
  })
  it('moves derived start when deadline precedes it', () => {
    expect(normalizeTaskDates({ deadline: '2026-10-10T09:00:00Z' }, existing).startDate).toBe('2026-10-10T08:00:00.000Z')
  })
  it.each(['deadline', 'dueDate'] as const)('clearing %s clears all schedule fields', (field) => {
    expect(normalizeTaskDates({ [field]: null }, existing)).toMatchObject({ startDate: null, deadline: null, dueDate: null, dueTime: null })
  })
  it('clearing clock produces a date-only deadline, not the old time', () => {
    const result = normalizeTaskDates({ dueTime: null }, existing)
    expect(result.dueTime).toBeNull()
    expect(result.deadline).toBe(localDeadline('2026-10-10')!.toISOString())
  })
  it('reschedules date while keeping local clock and duration', () => {
    expect(normalizeTaskDates({ dueDate: '2026-11-05' }, existing)).toMatchObject({ dueDate: '2026-11-05', dueTime: '11:00', startDate: '2026-11-05T10:00:00.000Z', deadline: '2026-11-05T11:00:00.000Z' })
  })
  it('keeps the start fixed when only the deadline clock changes on the same date', () => {
    expect(normalizeTaskDates({ dueTime: '12:00' }, existing)).toMatchObject({ dueDate: '2026-10-10', dueTime: '12:00', startDate: existing.startDate, deadline: '2026-10-10T12:00:00.000Z', estimatedMinutes: 120 })
  })
  it('keeps date-only deadlines clockless through normalization and duration edits', () => {
    const dateOnly = normalizeTaskDates({ dueDate: '2026-10-10' })
    expect(dateOnly.dueTime).toBeNull()
    expect(normalizeTaskDates(dateOnly).dueTime).toBeNull()
    expect(normalizeTaskDates({ estimatedMinutes: 30 }, dateOnly).dueTime).toBeNull()
  })
  it('changing duration updates the interval around its fixed deadline', () => {
    expect(normalizeTaskDates({ estimatedMinutes: 120 }, existing).startDate).toBe('2026-10-10T09:00:00.000Z')
  })
  it('unrelated patches contain no schedule changes', () => {
    expect(normalizeTaskDates({ title: 'Edited' }, existing)).toEqual({ title: 'Edited' })
  })
  it('normalizes positive timezone offsets and round trips through local fields', () => {
    const result = normalizeTaskDates({ deadline: '2026-10-15T18:00:00+03:00' })
    expect(result.deadline).toBe('2026-10-15T15:00:00.000Z')
    expect(result.dueTime).toBe(localTime(new Date(result.deadline!)))
    expect(normalizeTaskDates({ dueDate: result.dueDate, dueTime: result.dueTime }).deadline).toBe(result.deadline)
  })
  it('normalizes negative offsets crossing midnight', () => {
    expect(normalizeTaskDates({ deadline: '2026-10-15T23:00:00-04:00' }).dueDate).toBe('2026-10-16')
  })
  it('canonical deadline wins a contradictory legacy clock', () => {
    expect(normalizeTaskDates({ deadline: existing.deadline, dueDate: '2026-12-01', dueTime: '22:00' })).toMatchObject({ dueDate: '2026-10-10', dueTime: '11:00' })
  })
  it.each(['9:30', '09:30'])('accepts valid clock %s', (clock) => {
    expect(normalizeTaskDates({ dueDate: '2026-10-15', dueTime: clock }).deadline).toBe('2026-10-15T09:30:00.000Z')
  })
  it.each(['not-a-date', '2026-02-31'])('rejects invalid user date %s', (date) => {
    expect(() => normalizeTaskDates({ dueDate: date })).toThrow()
  })
})
