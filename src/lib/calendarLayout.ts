import { Item } from '../types/item'
import { localDayBounds, parseInstant, taskDeadline, taskDuration } from './taskDates'

export const HOUR_HEIGHT = 56
export const START_HOUR = 0
export const END_HOUR = 24
export const INSTANT_MARKER_HEIGHT = 8

export function itemsForDay(items: Item[], dateKey: string): Item[] {
  const [start, end] = localDayBounds(dateKey)
  return items.filter((item) => {
    if (item.type !== 'task' || item.status === 'archived') return false
    const deadline = taskDeadline(item)
    if (!deadline) return false
    const beginning = parseInstant(item.startDate) || deadline
    return beginning < end && deadline >= start
  })
}

export function layoutDayTasks(items: Item[], dateKey: string) {
  const dayItems = itemsForDay(items, dateKey)
  const allDayTasks = dayItems.filter((item) => item.isAllDay || item.dueTime === null)
  const [dayStart, dayEnd] = localDayBounds(dateKey)
  const start = dayStart.getTime()
  const end = dayEnd.getTime()
  const offHoursTasks = dayItems.filter((task) => {
    if (allDayTasks.includes(task)) return false
    const deadline = taskDeadline(task)!.getTime()
    const beginning = parseInstant(task.startDate)?.getTime() ?? deadline - taskDuration(task) * 60000
    return deadline === beginning ? beginning < start || beginning >= end : deadline <= start || beginning >= end
  })
  const entries = dayItems.filter((item) => !allDayTasks.includes(item)).map((task) => {
    const deadline = taskDeadline(task)!.getTime()
    const beginning = parseInstant(task.startDate)?.getTime() ?? deadline - taskDuration(task) * 60000
    const from = Math.max(start, beginning)
    const to = Math.min(end, deadline)
    const instantaneous = beginning === deadline && beginning >= start && beginning < end
    return { task, top: (from - start) / 60000 * HOUR_HEIGHT / 60, height: instantaneous ? INSTANT_MARKER_HEIGHT : (to - from) / 60000 * HOUR_HEIGHT / 60, column: 0, totalColumns: 1 }
  }).filter((entry) => entry.height > 0).sort((a, b) => a.top - b.top)
  // Each overlapping group shares columns; independent later events regain full width.
  let group: typeof entries = []
  let groupEnd = -Infinity
  const finishGroup = () => {
    const ends: number[] = []
    for (const entry of group) {
      let column = ends.findIndex((value) => value <= entry.top)
      if (column < 0) column = ends.length
      ends[column] = entry.top + entry.height
      entry.column = column
    }
    group.forEach((entry) => { entry.totalColumns = ends.length })
    group = []
  }
  for (const entry of entries) {
    if (entry.top >= groupEnd) finishGroup()
    group.push(entry)
    groupEnd = Math.max(groupEnd, entry.top + entry.height)
  }
  finishGroup()
  return { positionedTasks: entries, allDayTasks, offHoursTasks }
}
