import { Item } from '../types/item'

/**
 * Вычисляет задачу, которая должна быть в фокусе, на основе приоритетов:
 *
 * P1 — Ручной фокус: задача, у которой isFocus === true,
 *       при этом её startDate ещё не наступило. Удерживает фокус
 *       до завершения или ручного снятия.
 *
 * P2 — Просроченная: deadline прошёл, задача не завершена.
 *       Из нескольких просроченных берётся самая старая (по deadline).
 *
 * P3 — Текущая: текущее время попадает в интервал [startDate, deadline].
 *       Из нескольких текущих берётся та, чей deadline ближе.
 *
 * Если ничего не подходит — возвращает undefined.
 */
export function calculateFocusedTask(
  items: Item[],
  now: Date = new Date()
): Item | undefined {
  const nowMs = now.getTime()

  // Только незавершённые задачи
  const activeTasks = items.filter(
    (i) => i.type === 'task' && i.status !== 'completed' && i.status !== 'archived'
  )

  // Manual selection persists regardless of the task interval.
  const manualFocus = activeTasks.find((task) => task.isFocus || task.isFocused)

  if (manualFocus) return manualFocus

  // P2: Просроченные задачи (deadline прошёл)
  const overdueTasks = activeTasks
    .filter((task) => {
      if (!task.deadline) return false
      const dl = new Date(task.deadline).getTime()
      return !isNaN(dl) && dl < nowMs
    })
    .sort((a, b) => {
      // Самая старая просроченная (с самым ранним deadline)
      const dlA = new Date(a.deadline!).getTime()
      const dlB = new Date(b.deadline!).getTime()
      return dlA - dlB
    })

  if (overdueTasks.length > 0) return overdueTasks[0]

  // P3: Текущая задача (now между startDate и deadline)
  const currentTasks = activeTasks
    .filter((task) => {
      if (!task.startDate || !task.deadline) return false
      const start = new Date(task.startDate).getTime()
      const end = new Date(task.deadline).getTime()
      return !isNaN(start) && !isNaN(end) && start <= nowMs && nowMs <= end
    })
    .sort((a, b) => {
      // Из нескольких текущих — та, чей deadline ближе
      const dlA = new Date(a.deadline!).getTime()
      const dlB = new Date(b.deadline!).getTime()
      return dlA - dlB
    })

  if (currentTasks.length > 0) return currentTasks[0]

  return undefined
}

/**
 * Определяет статус задачи относительно текущего времени.
 */
export type TaskTemporalStatus = 'overdue' | 'current' | 'upcoming' | 'unscheduled'

export function getTaskTemporalStatus(
  task: Item,
  now: Date = new Date()
): TaskTemporalStatus {
  const nowMs = now.getTime()

  if (!task.startDate && !task.deadline) return 'unscheduled'

  if (task.deadline) {
    const dl = new Date(task.deadline).getTime()
    if (!isNaN(dl) && dl < nowMs && task.status !== 'completed') {
      return 'overdue'
    }
  }

  if (task.startDate && task.deadline) {
    const start = new Date(task.startDate).getTime()
    const end = new Date(task.deadline).getTime()
    if (!isNaN(start) && !isNaN(end) && start <= nowMs && nowMs <= end) {
      return 'current'
    }
  }

  return 'upcoming'
}
