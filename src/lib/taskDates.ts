import { Item } from '../types/item'

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function localTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function parseInstant(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

export function localDeadline(date: string, time?: string | null): Date | null {
  if (date.includes('T')) return parseInstant(date)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time || '23:59:59')
  if (!match || !clock) return null
  const [, year, month, day] = match.map(Number)
  const hour = Number(clock[1])
  const minute = Number(clock[2])
  const second = Number(clock[3] || 0)
  if (hour > 23 || minute > 59 || second > 59) return null
  const result = new Date(year, month - 1, day, hour, minute, second)
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : null
}

function localEndOfDay(date: string): Date | null {
  const end = localDeadline(date)
  if (end) end.setMilliseconds(999)
  return end
}

export function taskDeadline(task: Partial<Item>): Date | null {
  return parseInstant(task.deadline) || (task.dueDate ? localDeadline(task.dueDate, task.dueTime) : null)
}

export function taskDuration(task: Partial<Item>): number {
  return typeof task.estimatedMinutes === 'number' && Number.isFinite(task.estimatedMinutes) && task.estimatedMinutes > 0 && task.estimatedMinutes <= 525600
    ? task.estimatedMinutes : 60
}

// ISO instants are canonical; legacy date/time are local display fields.
// Date-only tasks end at local 23:59:59 and have no explicit clock time.
export function normalizeTaskDates<T extends Partial<Item>>(fields: T, existing?: Partial<Item>): T & Partial<Item> {
  const result: T & Partial<Item> = { ...fields }
  if (existing && !['startDate', 'deadline', 'dueDate', 'dueTime', 'isAllDay', 'estimatedMinutes'].some((key) => key in fields)) return result
  const merged = { ...existing, ...fields }
  const duration = taskDuration(merged)
  if ('estimatedMinutes' in fields && fields.estimatedMinutes !== undefined && duration !== fields.estimatedMinutes) {
    throw new Error('Длительность должна быть положительным числом минут (не более года)')
  }
  if ((!('deadline' in fields) && 'dueDate' in fields && !fields.dueDate) || ('deadline' in fields && !fields.deadline)) {
    return { ...result, startDate: null, deadline: null, dueDate: null, dueTime: null }
  }
  let end = taskDeadline(existing || {})
  const previousEnd = end
  const previousStart = parseInstant(existing?.startDate)
  let start = parseInstant(merged.startDate)
  let deriveStart = false
  const legacyChange = !('deadline' in fields) && ('dueDate' in fields || 'dueTime' in fields)
  if ('deadline' in fields && fields.deadline) {
    end = parseInstant(fields.deadline)
    if (!end) throw new Error('Некорректный дедлайн')
  } else if (legacyChange) {
    if (merged.dueDate) {
      const date = 'dueDate' in fields ? fields.dueDate! : merged.dueDate
      // A full ISO legacy date carries its own time unless a clock was explicitly edited.
      end = localDeadline('dueTime' in fields && date.includes('T') ? localDateKey(parseInstant(date) || new Date(NaN)) : date, merged.dueTime)
      if (!end) throw new Error('Некорректная дата или время')
      // Manual deadline edits preserve the existing start; only derive it for unscheduled items.
      deriveStart = !start
    }
  }
  if (merged.isAllDay && (end || merged.dueDate)) {
    const date = 'dueDate' in fields && fields.dueDate
      ? fields.dueDate
      : merged.dueDate || localDateKey(end!)
    end = localEndOfDay(date)
    if (!end) throw new Error('Некорректная дата')
    result.dueTime = null
  }
  const dateWasRescheduled = Boolean(
    'dueDate' in fields && fields.dueDate && !('startDate' in fields) &&
    start && previousStart && previousEnd && end && localDateKey(previousEnd) !== localDateKey(end)
  )
  if (dateWasRescheduled) {
    const previousDuration = previousEnd!.getTime() - previousStart!.getTime()
    if (previousDuration >= 0) start = new Date(end!.getTime() - previousDuration)
  }
  if ('startDate' in fields && fields.startDate && !start) throw new Error('Некорректное время начала')
  const manuallyChangedEnd = ('deadline' in fields && Boolean(fields.deadline)) || legacyChange
  const manuallyChangedStart = 'startDate' in fields && Boolean(fields.startDate)
  const turningAllDayOff = fields.isAllDay === false && Boolean(existing?.isAllDay)
  const durationChanged = 'estimatedMinutes' in fields && fields.estimatedMinutes !== undefined
  if (!merged.isAllDay && turningAllDayOff && start) {
    end = new Date(start.getTime() + duration * 60000)
  } else if (!merged.isAllDay && durationChanged && end && !manuallyChangedStart) {
    start = new Date(end.getTime() - duration * 60000)
  } else if (!merged.isAllDay && end && manuallyChangedStart && !manuallyChangedEnd && start && start > end) {
    end = new Date(start.getTime() + duration * 60000)
  } else if (!merged.isAllDay && end && manuallyChangedEnd && !manuallyChangedStart && start && start > end) {
    start = new Date(end.getTime() - duration * 60000)
  } else if (!merged.isAllDay && end && manuallyChangedEnd && start) {
    const actualDuration = Math.round((end.getTime() - start.getTime()) / 60000)
    if (actualDuration > 0 && actualDuration <= 525600) result.estimatedMinutes = actualDuration
  } else if (!merged.isAllDay && manuallyChangedStart && end && start) {
    const actualDuration = Math.round((end.getTime() - start.getTime()) / 60000)
    if (actualDuration > 0 && actualDuration <= 525600) result.estimatedMinutes = actualDuration
  }
  if (start && !end) end = new Date(start.getTime() + duration * 60000)
  if (end) {
    if ((!start && !(fields.startDate === null && 'startDate' in fields)) || deriveStart) {
      start = new Date(end.getTime() - duration * 60000)
    }
    if (start && start.getTime() > end.getTime() && !manuallyChangedStart && !manuallyChangedEnd) {
      if ('startDate' in fields && !('deadline' in fields)) end = new Date(start.getTime() + duration * 60000)
      else start = new Date(end.getTime() - duration * 60000)
    }
    result.deadline = end.toISOString()
    result.startDate = fields.startDate === null && 'startDate' in fields ? null : start?.toISOString() || null
    result.dueDate = localDateKey(end)
    const hasDateOnlyDeadline = Boolean(merged.dueDate && !merged.dueDate.includes('T') && !merged.dueTime && !('deadline' in fields) && !('startDate' in fields))
    result.dueTime = merged.isAllDay || fields.dueTime === null || hasDateOnlyDeadline ? null : localTime(end)
  } else if (!existing && !fields.startDate && !fields.deadline && !fields.dueDate) {
    // Keep backlog items genuinely unscheduled.
    result.startDate = null
    result.deadline = null
  }
  return result
}

export function localDayBounds(dateKey: string): [Date, Date] {
  const start = localDeadline(dateKey, '00:00')!
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return [start, end]
}

export function tasksForToday(items: Item[], now = new Date()): Item[] {
  const key = localDateKey(now)
  return items.filter((item) => item.type === 'task' && item.status !== 'archived' && (
    taskDeadline(item) && localDateKey(taskDeadline(item)!) === key ||
    item.status === 'completed' && item.completedAt && localDateKey(new Date(item.completedAt)) === key
  ))
}
