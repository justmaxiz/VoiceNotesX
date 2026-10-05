import { Item } from '../types/item'

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function notifyTaskReminder(task: Item) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      new Notification(`Напоминание: ${task.title}`, {
        body: task.description || 'Время выполнить запланированную задачу',
        icon: '/favicon.ico',
      })
    } catch {
      // Fallback if Notification constructor fails
    }
  }

  // Also dispatch a browser event for in-app toast
  const event = new CustomEvent('task-reminder', {
    detail: { task },
  })
  window.dispatchEvent(event)
}

const notifiedTaskIds = new Set<string>()

export function checkPendingReminders(items: Item[]) {
  const now = new Date()
  const todayDateStr = now.toISOString().split('T')[0]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  items.forEach((item) => {
    if (item.status === 'completed' || item.reminderMinutesBefore === null || item.reminderMinutesBefore === undefined) {
      return
    }

    if (!item.dueDate) return

    // If dueDate matches today
    const itemDate = item.dueDate.includes('-') ? item.dueDate.split('T')[0] : todayDateStr
    if (itemDate !== todayDateStr) return

    let taskTargetMinutes: number | null = null
    if (item.dueTime && item.dueTime.includes(':')) {
      const [h, m] = item.dueTime.split(':').map(Number)
      taskTargetMinutes = h * 60 + m
    } else if (item.dueDate.includes(':')) {
      const [h, m] = item.dueDate.split(':').map(Number)
      taskTargetMinutes = h * 60 + m
    }

    if (taskTargetMinutes === null) return

    const reminderTriggerMinutes = taskTargetMinutes - item.reminderMinutesBefore

    // If within 1 minute of trigger time and not yet notified
    if (
      Math.abs(currentMinutes - reminderTriggerMinutes) <= 1 &&
      !notifiedTaskIds.has(`${item.id}-${todayDateStr}-${taskTargetMinutes}`)
    ) {
      notifiedTaskIds.add(`${item.id}-${todayDateStr}-${taskTargetMinutes}`)
      notifyTaskReminder(item)
    }
  })
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startReminderScheduler(getItems: () => Item[]) {
  if (typeof window === 'undefined') return () => {}

  if (intervalId) {
    clearInterval(intervalId)
  }

  intervalId = setInterval(() => {
    checkPendingReminders(getItems())
  }, 30000)

  return () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}
