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
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveStoredSummaries(summaries: GeneratedDigest[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries))
  } catch {}
}

export function generateDigestData(
  type: 'today' | 'weekly' | 'tag',
  items: Item[],
  targetTag?: string
): GeneratedDigest {
  const now = new Date()
  const nowTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const dateKey = now.toISOString().split('T')[0]

  const completedTasks = items.filter((i) => i.type === 'task' && i.status === 'completed')
  const pendingTasks = items.filter((i) => i.type === 'task' && i.status !== 'completed')
  const notesCount = items.filter((i) => i.type === 'note').length

  if (type === 'today') {
    return {
      id: `rep-today-${dateKey}`,
      title: `Дайджест дня: ${now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      period: 'За сегодня',
      date: `Сегодня, ${nowTime}`,
      dateKey,
      updatedAtTime: nowTime,
      tags: ['#AI', '#Продуктивность', '#ИтогиДня'],
      achievements: [
        `Закрыто ${completedTasks.length} задач за сегодняшний день`,
        completedTasks[0] ? `Ключевой результат: «${completedTasks[0].title}»` : 'Проведена продуктивная аналитическая работа',
        `Зафиксировано ${notesCount} заметок и контекстных мыслей`,
      ],
      bottlenecks: [
        pendingTasks.length > 0
          ? `Осталось ${pendingTasks.length} открытых задач, перенесенных на следующий цикл`
          : 'Блокеров и критических задержек не обнаружено',
      ],
      recommendations: [
        'Сохранить фокус на ключевых приоритетах завтра с утра',
        'Продолжать быструю фиксацию входящих мыслей через Quick Capture',
      ],
      rawText: `Сегодня обработано ${items.length} активных записей. Завершено ${completedTasks.length} задач. Фокус был направлен на качественное выполнение приоритетов дня.`,
    }
  }

  if (type === 'weekly') {
    return {
      id: `rep-weekly-${Date.now()}`,
      title: 'Еженедельная ретроспектива',
      period: 'За неделю',
      date: `${now.toLocaleDateString('ru-RU')}, ${nowTime}`,
      dateKey,
      updatedAtTime: nowTime,
      tags: ['#Ретроспектива', '#Неделя', '#Аналитика'],
      achievements: [
        `Суммарно закрыто ${completedTasks.length} задач за отчетный период`,
        'Успешная интеграция новых архитектурных компонентов',
      ],
      bottlenecks: ['Некоторые второстепенные задачи откладывались в бэклог'],
      recommendations: [
        'Выделить слот для очистки бэклога в начале следующей недели',
      ],
      rawText: `Недельный срез активности: ${items.length} задач и заметок в работе. Высокая стабильность завершения запланированных дел.`,
    }
  }

  // by tag
  const tagToUse = targetTag || '#Разработка'
  const tagItems = items.filter((i) => i.categoryTag === tagToUse || i.tags?.includes(tagToUse))
  return {
    id: `rep-tag-${Date.now()}`,
    title: `Анализ проекта по тегу ${tagToUse}`,
    period: 'По проекту',
    date: `Сегодня, ${nowTime}`,
    dateKey,
    updatedAtTime: nowTime,
    tags: [tagToUse, '#Срез'],
    achievements: [
      `Обработано ${tagItems.length} элементов с тегом ${tagToUse}`,
      'Сформирована актуальная картина проекта',
    ],
    bottlenecks: ['Требуется синхронизация с зависимыми подсистемами'],
    recommendations: ['Продолжить приоритизацию задач проекта'],
    rawText: `Аналитический срез по тегу ${tagToUse}: в работе ${tagItems.length} активных записей.`,
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
      const todayKey = now.toISOString().split('T')[0]
      const existing = getStoredSummaries()
      const alreadyHasToday = existing.some((e) => e.dateKey === todayKey && e.period === 'За сегодня')

      if (!alreadyHasToday) {
        const items = getItems()
        if (items.length > 0) {
          const newDigest = generateDigestData('today', items)
          saveStoredSummaries([newDigest, ...existing])

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
