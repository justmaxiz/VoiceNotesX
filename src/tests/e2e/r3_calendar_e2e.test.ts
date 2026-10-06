import { describe, it, expect } from 'vitest'
import { layoutDayTasks, HOUR_HEIGHT, INSTANT_MARKER_HEIGHT, itemsForDay } from '../../lib/calendarLayout'
import { normalizeTaskDates } from '../../lib/taskDates'
import { Item } from '../../types/item'

const task = (id: string, clock: string, duration: number, patch: Partial<Item> = {}): Item => normalizeTaskDates({ id, type: 'task', title: id, categoryTag: '#Work', status: 'todo', priority: 'medium', isFocus: false, dueDate: '2026-10-10', dueTime: clock, estimatedMinutes: duration, createdAt: '2026-10-10T08:00:00Z', updatedAt: '2026-10-10T08:00:00Z', ...patch })

describe('R3 shared day/week layout', () => {
  it('14:00–16:00 starts at 14 and occupies exactly two hour slots', () => {
    const event = layoutDayTasks([task('two', '16:00', 120)], '2026-10-10').positionedTasks[0]
    expect(event.top).toBe(6 * HOUR_HEIGHT)
    expect(event.height).toBe(2 * HOUR_HEIGHT)
  })
  it('short intervals retain proportional height', () => {
    expect(layoutDayTasks([task('short', '10:10', 10)], '2026-10-10').positionedTasks[0].height).toBeCloseTo(HOUR_HEIGHT / 6)
  })
  it('coincident tasks partition width and disjoint groups regain full width', () => {
    const events = layoutDayTasks([task('a', '11:00', 60), task('b', '11:00', 60), task('later', '16:00', 60)], '2026-10-10').positionedTasks
    expect(events.slice(0, 2).map((event) => event.column)).toEqual([0, 1])
    expect(events.slice(0, 2).every((event) => event.totalColumns === 2)).toBe(true)
    expect(events[2].totalColumns).toBe(1)
  })
  it('all-day tasks stay separate and remain accessible', () => {
    const allDay = task('all', '16:00', 60, { isAllDay: true })
    expect(layoutDayTasks([allDay], '2026-10-10')).toMatchObject({ allDayTasks: [allDay], positionedTasks: [] })
  })
  it('clips multi-day intervals to the local visible day', () => {
    const long = task('long', '16:00', 60, { startDate: new Date(2026, 9, 9, 20).toISOString(), deadline: new Date(2026, 9, 11, 10).toISOString() })
    expect(layoutDayTasks([long], '2026-10-10').positionedTasks[0]).toMatchObject({ top: 0, height: 14 * HOUR_HEIGHT })
  })
  it('offset ISO dates use local day intersection, not raw UTC date prefix', () => {
    const event = task('offset', '16:00', 60, { startDate: new Date(2026, 9, 10, 9).toISOString(), deadline: new Date(2026, 9, 10, 11).toISOString() })
    expect(itemsForDay([event], '2026-10-10')).toEqual([event])
    expect(itemsForDay([event], '2026-10-09')).toEqual([])
  })
  it('legacy missing-start tasks use estimated duration without disappearing', () => {
    const legacy = task('legacy', '16:00', 90)
    delete legacy.startDate
    expect(layoutDayTasks([legacy], '2026-10-10').positionedTasks[0].height).toBe(1.5 * HOUR_HEIGHT)
  })
  it('archived and invalid tasks are excluded, while early/late tasks remain accessible', () => {
    const invalid = { ...task('invalid', '16:00', 60), deadline: 'garbage', dueDate: null }
    const result = layoutDayTasks([task('archive', '16:00', 60, { status: 'archived' }), task('early', '07:00', 60), task('late', '23:30', 30), invalid], '2026-10-10')
    expect(result.positionedTasks).toEqual([])
    expect(result.offHoursTasks.map((entry) => entry.id)).toEqual(['early', 'late'])
  })
  it('instantaneous valid events remain markers at their exact clock position', () => {
    const instant = new Date(2026, 9, 10, 12).toISOString()
    const boundary = new Date(2026, 9, 10, 8).toISOString()
    const result = layoutDayTasks([task('instant', '12:00', 60, { startDate: instant, deadline: instant }), task('boundary', '08:00', 60, { startDate: boundary, deadline: boundary })], '2026-10-10')
    expect(result.positionedTasks.map(({ task: event, top, height }) => ({ id: event.id, top, height }))).toEqual([
      { id: 'boundary', top: 0, height: INSTANT_MARKER_HEIGHT },
      { id: 'instant', top: 4 * HOUR_HEIGHT, height: INSTANT_MARKER_HEIGHT },
    ])
    expect(result.offHoursTasks).toEqual([])
  })
})
