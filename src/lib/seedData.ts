import { Item } from '../types'
import { db } from './db'

export const SEEDED_STORAGE_KEY = 'voicenotes_seeded'

export const SEED_ITEMS: Item[] = [
  // 1. Focus Task (Hero Card)
  {
    id: 'focus-1',
    type: 'task',
    title: 'Добавить новую фичу в VoiceNotes',
    description: 'Контекстное связывание голосовых заметок с календарем и автогенерация задач',
    transcriptText:
      '«Синхронизировать транскрипцию в реальном времени с векторной базой и контекстом пользователя для точных AI-ответов. Проверить задержку вебсокета на мобильных устройствах...»',
    audioDuration: 102,
    status: 'todo',
    priority: 'high',
    startDate: '2026-10-06T19:00:00.000Z',
    deadline: '2026-10-06T21:00:00.000Z',
    dueTime: '21:00',
    dueDate: '2026-10-06',
    estimatedMinutes: 120,
    categoryTag: 'Работа',
    isFocus: true,
    isFocused: true,
    checklist: [
      {
        id: 'cl-1',
        text: 'Синхронизировать транскрипцию в реальном времени с векторной базой',
        isCompleted: false,
        sortOrder: 1,
      },
      {
        id: 'cl-2',
        text: 'Проверить задержку вебсокета на мобильных устройствах',
        isCompleted: false,
        sortOrder: 2,
      },
      {
        id: 'cl-3',
        text: 'Протестировать автогенерацию задач из контекста',
        isCompleted: true,
        sortOrder: 3,
      },
    ],
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
  },

  // 2. Daily Tasks
  {
    id: 't-1',
    type: 'task',
    title: 'Подготовить отчет по продуктовым метрикам Q3',
    description: 'Встреча с инвесторами',
    categoryTag: '#Аналитика',
    startDate: '2026-10-06T14:30:00.000Z',
    deadline: '2026-10-06T16:00:00.000Z',
    dueTime: '16:00',
    dueDate: '2026-10-06',
    estimatedMinutes: 90,
    status: 'todo',
    priority: 'medium',
    audioDuration: 75,
    isFocus: false,
    createdAt: '2026-10-05T09:00:00.000Z',
    updatedAt: '2026-10-05T09:00:00.000Z',
  },
  {
    id: 't-2',
    type: 'task',
    title: 'Провести ревью архитектуры микросервисов',
    description: 'PR #142 • Саммари готово',
    categoryTag: '#Разработка',
    startDate: '2026-10-06T17:00:00.000Z',
    deadline: '2026-10-06T18:30:00.000Z',
    dueTime: '18:30',
    dueDate: '2026-10-06',
    estimatedMinutes: 90,
    status: 'todo',
    priority: 'high',
    isFocus: false,
    createdAt: '2026-10-05T09:15:00.000Z',
    updatedAt: '2026-10-05T09:15:00.000Z',
  },
  {
    id: 't-3',
    type: 'task',
    title: 'Записать идеи для дизайн-системы 2026',
    description: '3 заметки',
    categoryTag: '#Дизайн',
    startDate: '2026-10-07T10:00:00.000Z',
    deadline: '2026-10-07T12:00:00.000Z',
    dueDate: '2026-10-07',
    dueTime: '12:00',
    estimatedMinutes: 120,
    status: 'todo',
    priority: 'low',
    audioDuration: 180,
    isFocus: false,
    createdAt: '2026-10-05T09:30:00.000Z',
    updatedAt: '2026-10-05T09:30:00.000Z',
  },
  {
    id: 't-4',
    type: 'task',
    title: 'Согласовать бюджет на AI API',
    description: 'Выполнено в 14:15',
    categoryTag: '#Финансы',
    startDate: '2026-10-06T13:15:00.000Z',
    deadline: '2026-10-06T14:15:00.000Z',
    dueTime: '14:15',
    dueDate: '2026-10-06',
    estimatedMinutes: 60,
    completedAt: '2026-10-05T14:15:00.000Z',
    status: 'completed',
    priority: 'medium',
    isFocus: false,
    createdAt: '2026-10-05T08:30:00.000Z',
    updatedAt: '2026-10-05T14:15:00.000Z',
  },

  // 3. Notes
  {
    id: 'note-1',
    type: 'note',
    title: 'План редизайна мобильного экрана',
    description: 'Обсудили перенос карточки устройств в настройки и новый компактный виджет Quick Capture',
    transcriptText: 'Обсудили перенос карточки устройств в настройки и новый компактный виджет Quick Capture',
    categoryTag: '#Дизайн',
    status: 'todo',
    priority: 'medium',
    audioDuration: 42,
    isFocus: false,
    createdAt: '2026-10-05T14:30:00.000Z',
    updatedAt: '2026-10-05T14:30:00.000Z',
  },
  {
    id: 'note-2',
    type: 'note',
    title: 'Брейншторм фичи Voice-to-SQL',
    description: 'Идея прямого преобразования голосовых запросов в локальные запросы к Dexie/IndexedDB без облака',
    transcriptText: 'Идея прямого преобразования голосовых запросов в локальные запросы к Dexie/IndexedDB без облака',
    categoryTag: '#Архитектура',
    status: 'todo',
    priority: 'high',
    audioDuration: 138,
    isFocus: false,
    createdAt: '2026-10-05T12:10:00.000Z',
    updatedAt: '2026-10-05T12:10:00.000Z',
  },
  {
    id: 'note-3',
    type: 'note',
    title: 'Заметки к встрече 1-на-1 с тимлидом',
    description: 'Синхронизация по бэклогу релиза 2.5: фокус на хранилище данных и скорость отклика интерфейса',
    transcriptText: 'Синхронизация по бэклогу релиза 2.5: фокус на хранилище данных и скорость отклика интерфейса',
    categoryTag: '#Управление',
    status: 'todo',
    priority: 'medium',
    audioDuration: 65,
    isFocus: false,
    createdAt: '2026-10-05T10:45:00.000Z',
    updatedAt: '2026-10-05T10:45:00.000Z',
  },
]


export function isDatabaseSeeded(): boolean {
  if (typeof localStorage === 'undefined') return false
  return Boolean(localStorage.getItem(SEEDED_STORAGE_KEY))
}

export async function seedDatabase(force: boolean = false): Promise<void> {
  if (!force) {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(SEEDED_STORAGE_KEY)) {
      return
    }
    const existingCount = await db.items.count()
    if (existingCount > 0) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SEEDED_STORAGE_KEY, 'true')
      }
      return
    }
  }

  await db.transaction('rw', [db.items, db.audioSessions, db.settings], async () => {
    if (force) {
      await db.items.clear()
      await db.audioSessions.clear()
      await db.settings.clear()
    }
    await db.items.bulkPut(SEED_ITEMS)
  })

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SEEDED_STORAGE_KEY, 'true')
  }
}

export async function resetDatabaseToSeed(): Promise<void> {
  await seedDatabase(true)
}
