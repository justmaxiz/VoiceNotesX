import { localDateKey, localDayBounds, taskDeadline } from './taskDates'
import { Item } from '../types/item'

export interface GeneratedDigest {
  id: string
  title: string
  period: string
  date: string
  dateKey: string
  updatedAtTime: string
  tags: string[]
  achievements: string[]
  bottlenecks: string[]
  recommendations: string[]
  rawText: string
}

const STORAGE_KEY = 'voicenotes_ai_summaries'

export function getStoredSummaries(): GeneratedDigest[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((value) => value && typeof value.id === 'string' && typeof value.dateKey === 'string' && typeof value.rawText === 'string' && [value.tags, value.achievements, value.bottlenecks, value.recommendations].every((field) => Array.isArray(field) && field.every((entry) => typeof entry === 'string')))
    }
  } catch {}
  return []
}

export function saveStoredSummaries(summaries: GeneratedDigest[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries))
  } catch (error) { throw new Error(`Не удалось сохранить отчет: ${(error as Error).message}`) }
  window.dispatchEvent(new Event('voicenotes:summaries-updated'))
}

export function generateDigestData(
  type: 'today' | 'weekly' | 'tag',
  items: Item[],
  targetTag?: string
): GeneratedDigest {
  const now = new Date()
  const dateKey = localDateKey(now)
  const [dayStart, dayEnd] = localDayBounds(dateKey)
  const start = new Date(dayStart)
  if (type === 'weekly') start.setDate(start.getDate() - 6)
  const scope = items.filter((item) => item.status !== 'archived' && (type !== 'tag' || item.categoryTag === targetTag || item.tags?.includes(targetTag || '')))
  const inPeriod = (value?: string | null) => !!value && new Date(value) >= start && new Date(value) < dayEnd
  const completed = scope.filter((item) => item.type === 'task' && item.status === 'completed' && (type === 'tag' || inPeriod(item.completedAt)))
  const pending = scope.filter((item) => item.type === 'task' && item.status !== 'completed' && (type === 'tag' || inPeriod(taskDeadline(item)?.toISOString())))
  const notes = scope.filter((item) => item.type === 'note' && (type === 'tag' || inPeriod(item.createdAt)))
  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const period = type === 'today' ? 'За сегодня' : type === 'weekly' ? 'За неделю' : 'По проекту'
  return {
    id: type === 'today' ? `rep-today-${dateKey}` : `rep-${type}-${crypto.randomUUID()}`,
    title: type === 'today' ? `Итоги дня: ${now.toLocaleDateString('ru-RU')}` : type === 'weekly' ? 'Итоги последних 7 дней' : `Итоги по тегу ${targetTag || ''}`,
    period, date: `${now.toLocaleDateString('ru-RU')}, ${time}`, dateKey, updatedAtTime: time,
    tags: Array.from(new Set([...completed, ...pending, ...notes].flatMap((item) => item.tags || [item.categoryTag]))).filter(Boolean).slice(0, 6),
    achievements: [`Завершено задач: ${completed.length}`, ...completed.slice(0, 3).map((item) => item.title), `Создано заметок: ${notes.length}`],
    bottlenecks: pending.length ? [`Открытых задач в выбранном периоде: ${pending.length}`] : ['Нет открытых задач с датой в выбранном периоде'],
    recommendations: pending.length ? [`Следующая задача: ${pending[0].title}`] : ['Добавьте дела на следующий период при необходимости'],
    rawText: `Локальный отчет по сохраненным данным. ${period}: завершено ${completed.length} задач, создано ${notes.length} заметок, открытых задач с датой ${pending.length}.`,
  }
}

let digestIntervalId: ReturnType<typeof setInterval> | null = null

export function startDailyDigestScheduler(getItems: () => Item[]) {
  if (typeof window === 'undefined') return () => {}

  if (digestIntervalId) clearInterval(digestIntervalId)

  digestIntervalId = setInterval(() => {
    const now = new Date()
    // Trigger at 21:00
    if (now.getHours() === 21 && now.getMinutes() === 0) {
      const todayKey = localDateKey(now)
      const existing = getStoredSummaries()
      const alreadyHasToday = existing.some((e) => e.dateKey === todayKey && e.period === 'За сегодня')

      if (!alreadyHasToday) {
        const items = getItems()
        if (items.length > 0) {
          const newDigest = generateDigestData('today', items)
          try { saveStoredSummaries([newDigest, ...existing]) } catch (error) { window.dispatchEvent(new CustomEvent('voicenotes:storage-error', { detail: (error as Error).message })); return }

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Ваш вечерний AI-дайджест готов!', {
                body: 'Нажмите, чтобы посмотреть итоги дня в разделе AI Сводки',
                icon: '/favicon.ico',
              })
            } catch {}
          }
        }
      }
    }
  }, 45000)

  return () => {
    if (digestIntervalId) {
      clearInterval(digestIntervalId)
      digestIntervalId = null
    }
  }
}
