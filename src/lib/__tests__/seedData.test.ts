import { describe, it, expect, beforeEach } from 'vitest'
import {
  seedDatabase,
  resetDatabaseToSeed,
  isDatabaseSeeded,
  SEED_ITEMS,
  SEED_AUDIO_SESSIONS,
  DEFAULT_USER_SETTINGS,
  SEEDED_STORAGE_KEY,
} from '../seedData'
import { db, clearDatabase } from '../db'

describe('Seed Data & Database Initialization (TASK-07)', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearDatabase()
  })

  it('populates database on first run with demo entities', async () => {
    expect(isDatabaseSeeded()).toBe(false)
    expect(await db.items.count()).toBe(0)

    await seedDatabase()

    expect(isDatabaseSeeded()).toBe(true)
    expect(localStorage.getItem(SEEDED_STORAGE_KEY)).toBe('true')

    const itemsCount = await db.items.count()
    expect(itemsCount).toBe(SEED_ITEMS.length)

    })

  it('contains the Hero focus card task with expected attributes', async () => {
    await seedDatabase()

    const focusTask = await db.items.get('focus-1')
    expect(focusTask).toBeDefined()
    expect(focusTask?.isFocus).toBe(true)
    expect(focusTask?.title).toBe('Добавить новую фичу в VoiceNotes')
    expect(focusTask?.categoryTag).toBe('Работа')
    expect(focusTask?.priority).toBe('high')
    expect(focusTask?.dueTime).toBe('21:00')
    expect(focusTask?.checklist).toHaveLength(3)
    expect(focusTask?.checklist?.[2].isCompleted).toBe(true)
  })

  it('contains the day tasks from the overview design mockup', async () => {
    await seedDatabase()

    const t1 = await db.items.get('t-1')
    expect(t1?.title).toContain('Подготовить отчет по продуктовым метрикам Q3')
    expect(t1?.categoryTag).toBe('#Аналитика')
    expect(t1?.dueTime).toBe('16:00')

    const t2 = await db.items.get('t-2')
    expect(t2?.title).toBe('Провести ревью архитектуры микросервисов')
    expect(t2?.priority).toBe('high')

    const t4 = await db.items.get('t-4')
    expect(t4?.title).toBe('Согласовать бюджет на AI API')
    expect(t4?.status).toBe('completed')
    expect(t4?.completedAt).toBeDefined()
  })

  

  it('is idempotent: calling seedDatabase repeatedly does not duplicate data', async () => {
    await seedDatabase()
    const firstCount = await db.items.count()

    await seedDatabase()
    const secondCount = await db.items.count()

    expect(firstCount).toBe(secondCount)
  })

  it('allows resetting database to seed state via resetDatabaseToSeed()', async () => {
    await seedDatabase()

    // Add a custom user item
    await db.items.put({
      id: 'custom-user-task',
      type: 'task',
      title: 'Временная задача пользователя',
      categoryTag: '#Тест',
      status: 'todo',
      priority: 'low',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    expect(await db.items.count()).toBe(SEED_ITEMS.length + 1)

    // Reset database to seed
    await resetDatabaseToSeed()
    expect(await db.items.count()).toBe(SEED_ITEMS.length)
    expect(await db.items.get('custom-user-task')).toBeUndefined()
  })

  it('preserves user deletions and does not re-seed when all items are deleted', async () => {
    await seedDatabase()
    expect(await db.items.count()).toBe(SEED_ITEMS.length)
    expect(isDatabaseSeeded()).toBe(true)

    // User clears all items
    await db.items.clear()
    expect(await db.items.count()).toBe(0)

    // Subsequent app load calls seedDatabase()
    await seedDatabase()

    // Items must remain empty (user deletion preserved)!
    expect(await db.items.count()).toBe(0)
  })
})
