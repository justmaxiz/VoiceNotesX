import { describe, it, expect } from 'vitest'
import { calculateFocusedTask, getTaskTemporalStatus } from '../../lib/focusLogic'
import { Item } from '../../types/item'

const now = new Date('2026-10-10T12:00:00Z')
const task = (id: string, patch: Partial<Item> = {}): Item => ({ id, type: 'task', title: id, categoryTag: '#Work', status: 'todo', priority: 'medium', isFocus: false, createdAt: now.toISOString(), updatedAt: now.toISOString(), ...patch })
const overdue = task('overdue', { deadline: '2026-10-09T12:00:00Z' })
const current = task('current', { startDate: '2026-10-10T11:00:00Z', deadline: '2026-10-10T13:00:00Z' })

describe('R2 actual focus function', () => {
  it.each(['2026-10-11T12:00:00Z', '2026-10-10T11:00:00Z', '2026-10-08T11:00:00Z'])('manual focus persists regardless of start %s', (startDate) => {
    const manual = task('manual', { isFocus: true, startDate })
    expect(calculateFocusedTask([overdue, current, manual], now)).toBe(manual)
  })
  it('oldest overdue wins irrespective of array order/priority', () => {
    expect(calculateFocusedTask([current, task('recent', { deadline: '2026-10-10T10:00:00Z', priority: 'high' }), overdue], now)).toBe(overdue)
  })
  it('current task wins when no overdue or manual', () => { expect(calculateFocusedTask([current], now)).toBe(current) })
  it('completed, archived and notes cannot focus', () => {
    expect(calculateFocusedTask([task('done', { status: 'completed', isFocus: true }), task('archive', { status: 'archived', isFocus: true }), task('note', { type: 'note', isFocus: true })], now)).toBeUndefined()
  })
  it('chooses nearest deadline among concurrent tasks', () => {
    expect(calculateFocusedTask([task('late', { ...current, id: 'late', deadline: '2026-10-10T14:00:00Z' }), current], now)).toBe(current)
  })
  it('interval boundaries are inclusive and invalid dates excluded', () => {
    expect(calculateFocusedTask([current], new Date(current.deadline!))).toBe(current)
    expect(calculateFocusedTask([task('invalid', { deadline: 'garbage' })], now)).toBeUndefined()
  })
  it('future/backlog tasks leave focus empty', () => {
    expect(calculateFocusedTask([task('backlog'), task('future', { startDate: '2026-10-11T11:00:00Z', deadline: '2026-10-11T13:00:00Z' })], now)).toBeUndefined()
  })
  it('status changes with time independently of stable task reference', () => {
    expect(getTaskTemporalStatus(current, now)).toBe('current')
    expect(getTaskTemporalStatus(current, new Date('2026-10-10T14:00:00Z'))).toBe('overdue')
  })
})
