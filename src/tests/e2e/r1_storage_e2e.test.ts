import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { VoiceNotesDB } from '../../lib/db'
import { useAppStore } from '../../store/useAppStore'
import { Item } from '../../types/item'

/**
 * R1 integration Test Suite: Data Structure & Storage
 * Covers:
 * - Support for `startDate` and `deadline` in Item types & Dexie database
 * - Legacy backwards compatibility (dueDate/dueTime migration to deadline, startDate derivation)
 * - Zero data loss during schema upgrades
 * - Store synchronization between modern interval and legacy temporal fields
 *
 * 4-Tier Test Case Design:
 * Tier 1: Feature Coverage (CRUD, indexed fields, store sync)
 * Tier 2: Boundary & Corner Cases (nulls, missing fields, zero duration, midnight crossing, migration)
 * Tier 3: Cross-Feature Combinations (batch reschedule, completion toggle, AI struct mapping)
 * Tier 4: Real-World Scenarios (voice capture to completion, 10-task legacy database migration)
 */

describe('R1 integration: Data Structure & Storage (startDate & deadline)', () => {
  let testDb: VoiceNotesDB
  let dbName: string

  const originalZone = process.env.TZ
  beforeEach(() => {
    process.env.TZ = 'UTC'
    dbName = `test-vn-r1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    testDb = new VoiceNotesDB(dbName)
  })

  afterEach(async () => {
    process.env.TZ = originalZone
    try {
      if (testDb) {
        testDb.close()
        await Dexie.delete(dbName)
      }
    } catch {
      // Ignore cleanup error in test teardown
    }
  })

  // =========================================================================
  // TIER 1: Feature Coverage
  // =========================================================================
  describe('Tier 1: Feature Coverage', () => {
    it('TC-R1-T1-01: creates and retrieves task with explicit startDate and deadline in Dexie DB', async () => {
      const startIso = '2026-10-10T09:00:00.000Z'
      const deadlineIso = '2026-10-10T11:00:00.000Z'

      const taskId = await testDb.createItem({
        id: 't-r1-01',
        type: 'task',
        title: 'Защитить презентацию проекта',
        categoryTag: '#Работа',
        status: 'todo',
        priority: 'high',
        startDate: startIso,
        deadline: deadlineIso,
        isFocus: false,
        createdAt: '2026-10-06T10:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
      })

      const fetched = await testDb.getItem(taskId)
      expect(fetched).toBeDefined()
      expect(fetched?.startDate).toBe(startIso)
      expect(fetched?.deadline).toBe(deadlineIso)
      expect(fetched?.title).toBe('Защитить презентацию проекта')
    })

    it('TC-R1-T1-02: updates startDate and deadline independently without data corruption', async () => {
      const taskId = await testDb.createItem({
        id: 't-r1-02',
        type: 'task',
        title: 'Код-ревью PR',
        categoryTag: '#Разработка',
        status: 'todo',
        priority: 'medium',
        startDate: '2026-10-10T14:00:00.000Z',
        deadline: '2026-10-10T15:00:00.000Z',
        isFocus: false,
        createdAt: '2026-10-06T10:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
      })

      // Update deadline only
      const extendedDeadline = '2026-10-10T16:30:00.000Z'
      await testDb.updateItem(taskId, { deadline: extendedDeadline })

      let updated = await testDb.getItem(taskId)
      expect(updated?.startDate).toBe('2026-10-10T14:00:00.000Z')
      expect(updated?.deadline).toBe(extendedDeadline)

      // Update startDate only
      const shiftedStart = '2026-10-10T14:30:00.000Z'
      await testDb.updateItem(taskId, { startDate: shiftedStart })

      updated = await testDb.getItem(taskId)
      expect(updated?.startDate).toBe(shiftedStart)
      expect(updated?.deadline).toBe(extendedDeadline)
    })

    it('TC-R1-T1-03: useAppStore addItem maintains startDate, deadline and synchronizes legacy dueDate/dueTime', async () => {
      const testItem: Item = {
        id: 't-store-sync-1',
        type: 'task',
        title: 'Синхронизация полей стора',
        categoryTag: '#Тест',
        status: 'todo',
        priority: 'high',
        startDate: '2026-10-15T10:00:00.000Z',
        deadline: '2026-10-15T11:30:00.000Z',
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await useAppStore.getState().addItem(testItem)
      const stored = useAppStore.getState().items.find((i) => i.id === 't-store-sync-1')

      expect(stored).toBeDefined()
      expect(stored?.startDate).toBe('2026-10-15T10:00:00.000Z')
      expect(stored?.deadline).toBe('2026-10-15T11:30:00.000Z')
      // Legacy backwards-compatibility synchronization:
      expect(stored?.dueDate).toBe('2026-10-15')
      expect(stored?.dueTime).toBe('11:30')
    })

    it('TC-R1-T1-04: verifies Dexie v2 indexes on startDate and deadline for range queries', async () => {
      await testDb.createItem({
        id: 't-idx-1',
        type: 'task',
        title: 'Утренняя задача',
        categoryTag: '#План',
        status: 'todo',
        priority: 'low',
        startDate: '2026-10-10T08:00:00.000Z',
        deadline: '2026-10-10T09:00:00.000Z',
        isFocus: false,
        createdAt: '2026-10-06T10:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
      })

      await testDb.createItem({
        id: 't-idx-2',
        type: 'task',
        title: 'Вечерняя задача',
        categoryTag: '#План',
        status: 'todo',
        priority: 'low',
        startDate: '2026-10-10T18:00:00.000Z',
        deadline: '2026-10-10T20:00:00.000Z',
        isFocus: false,
        createdAt: '2026-10-06T10:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
      })

      // Query by indexed startDate
      const morningTasks = await testDb.items
        .where('startDate')
        .below('2026-10-10T12:00:00.000Z')
        .toArray()
      expect(morningTasks.map((t) => t.id)).toContain('t-idx-1')
      expect(morningTasks.map((t) => t.id)).not.toContain('t-idx-2')

      // Query by indexed deadline
      const eveningTasks = await testDb.items
        .where('deadline')
        .above('2026-10-10T12:00:00.000Z')
        .toArray()
      expect(eveningTasks.map((t) => t.id)).toContain('t-idx-2')
      expect(eveningTasks.map((t) => t.id)).not.toContain('t-idx-1')
    })

    it('TC-R1-T1-05: useAppStore updateItem preserves temporal fields when updating non-temporal properties', async () => {
      const item: Item = {
        id: 't-store-preserve',
        type: 'task',
        title: 'Первоначальное название',
        categoryTag: '#Инфра',
        status: 'todo',
        priority: 'low',
        startDate: '2026-10-20T09:00:00.000Z',
        deadline: '2026-10-20T10:00:00.000Z',
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await useAppStore.getState().addItem(item)
      await useAppStore.getState().updateItem('t-store-preserve', {
        title: 'Обновленное название',
        priority: 'high',
      })

      const updated = useAppStore.getState().items.find((i) => i.id === 't-store-preserve')
      expect(updated?.title).toBe('Обновленное название')
      expect(updated?.priority).toBe('high')
      expect(updated?.startDate).toBe('2026-10-20T09:00:00.000Z')
      expect(updated?.deadline).toBe('2026-10-20T10:00:00.000Z')
    })

    it('TC-R1-T1-06: setFocusTask in DB enforces mutual exclusivity across items', async () => {
      const id1 = await testDb.createItem({
        id: 't-focus-ex-1',
        type: 'task',
        title: 'Задача 1',
        categoryTag: '#Работа',
        status: 'todo',
        priority: 'medium',
        isFocus: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const id2 = await testDb.createItem({
        id: 't-focus-ex-2',
        type: 'task',
        title: 'Задача 2',
        categoryTag: '#Работа',
        status: 'todo',
        priority: 'medium',
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await testDb.setFocusTask(id2)

      const item1 = await testDb.getItem(id1)
      const item2 = await testDb.getItem(id2)

      expect(item1?.isFocus).toBe(false)
      expect(item2?.isFocus).toBe(true)
    })
  })

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('TC-R1-T2-01: Legacy Migration - converts v1 dueDate + dueTime to deadline and derives startDate from estimatedMinutes', async () => {
      const migrationDbName = `test-mig-1-${Date.now()}`

      // 1. Simulate legacy v1 database
      const v1Db = new Dexie(migrationDbName)
      v1Db.version(1).stores({
        items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
      })
      await v1Db.open()

      await v1Db.table('items').put({
        id: 'legacy-task-1',
        type: 'task',
        title: 'Старая задача с дедлайном',
        dueDate: '2026-10-18',
        dueTime: '15:00',
        estimatedMinutes: 90,
        status: 'todo',
        priority: 'high',
        categoryTag: '#Работа',
        isFocus: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      })
      v1Db.close()

      // 2. Open with modern VoiceNotesDB (v2 schema + upgrade handler)
      const modernDb = new VoiceNotesDB(migrationDbName)
      await modernDb.open()

      const upgraded = await modernDb.getItem('legacy-task-1')
      expect(upgraded).toBeDefined()
      // Deadline derived from dueDate & dueTime
      expect(upgraded?.deadline).toBe('2026-10-18T15:00:00.000Z')
      // StartDate derived: 15:00 minus 90 minutes = 13:30
      expect(upgraded?.startDate).toBe('2026-10-18T13:30:00.000Z')

      modernDb.close()
      await Dexie.delete(migrationDbName)
    })

    it('TC-R1-T2-02: Legacy Migration - handles legacy task with dueDate but missing dueTime', async () => {
      const migrationDbName = `test-mig-2-${Date.now()}`

      const v1Db = new Dexie(migrationDbName)
      v1Db.version(1).stores({
        items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
      })
      await v1Db.open()

      await v1Db.table('items').put({
        id: 'legacy-date-only',
        type: 'task',
        title: 'Задача без конкретного времени',
        dueDate: '2026-10-20',
        estimatedMinutes: 60,
        status: 'todo',
        priority: 'medium',
        categoryTag: '#Личное',
        isFocus: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      })
      v1Db.close()

      const modernDb = new VoiceNotesDB(migrationDbName)
      await modernDb.open()

      const upgraded = await modernDb.getItem('legacy-date-only')
      expect(upgraded?.deadline).toBe('2026-10-20T23:59:59.000Z')
      expect(upgraded?.startDate).toBeDefined()
      // 23:59:59 minus 60m is 22:59:59
      expect(upgraded?.startDate).toBe('2026-10-20T22:59:59.000Z')

      modernDb.close()
      await Dexie.delete(migrationDbName)
    })

    it('TC-R1-T2-03: Legacy Migration - defaults estimatedMinutes to 60 when missing or 0', async () => {
      const migrationDbName = `test-mig-3-${Date.now()}`

      const v1Db = new Dexie(migrationDbName)
      v1Db.version(1).stores({
        items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
      })
      await v1Db.open()

      await v1Db.table('items').put({
        id: 'legacy-no-est',
        type: 'task',
        title: 'Задача без оценки длительности',
        dueDate: '2026-10-22',
        dueTime: '10:00',
        status: 'todo',
        priority: 'low',
        categoryTag: '#План',
        isFocus: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      })
      v1Db.close()

      const modernDb = new VoiceNotesDB(migrationDbName)
      await modernDb.open()

      const upgraded = await modernDb.getItem('legacy-no-est')
      expect(upgraded?.deadline).toBe('2026-10-22T10:00:00.000Z')
      // Default 60 min duration: 10:00 - 60m = 09:00
      expect(upgraded?.startDate).toBe('2026-10-22T09:00:00.000Z')

      modernDb.close()
      await Dexie.delete(migrationDbName)
    })

    it('TC-R1-T2-04: Non-destructive migration guarantees zero loss of non-temporal properties', async () => {
      const migrationDbName = `test-mig-4-${Date.now()}`

      const v1Db = new Dexie(migrationDbName)
      v1Db.version(1).stores({
        items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
      })
      await v1Db.open()

      const richItem = {
        id: 'rich-legacy-task',
        type: 'task' as const,
        title: 'Сложная задача с метаданными',
        description: 'Подробное описание задачи для аудита миграции',
        transcriptText: 'Запишите это в задачи пожалуйста',
        audioDuration: 42,
        audioUrl: 'blob://mock-url',
        status: 'in_progress' as const,
        priority: 'high' as const,
        categoryTag: '#Аудит',
        tags: ['важно', 'релиз', 'dexie'],
        checklist: [
          { id: 'c1', text: 'Шаг 1', isCompleted: true, sortOrder: 0 },
          { id: 'c2', text: 'Шаг 2', isCompleted: false, sortOrder: 1 },
        ],
        dueDate: '2026-10-25',
        dueTime: '18:00',
        isFocus: true,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
      }
      await v1Db.table('items').put(richItem)
      v1Db.close()

      const modernDb = new VoiceNotesDB(migrationDbName)
      await modernDb.open()

      const migrated = await modernDb.getItem('rich-legacy-task')
      expect(migrated?.title).toBe(richItem.title)
      expect(migrated?.description).toBe(richItem.description)
      expect(migrated?.transcriptText).toBe(richItem.transcriptText)
      expect(migrated?.audioDuration).toBe(42)
      expect(migrated?.audioUrl).toBe('blob://mock-url')
      expect(migrated?.status).toBe('in_progress')
      expect(migrated?.priority).toBe('high')
      expect(migrated?.tags).toEqual(['важно', 'релиз', 'dexie'])
      expect(migrated?.checklist).toHaveLength(2)
      expect(migrated?.checklist?.[0].isCompleted).toBe(true)
      expect(migrated?.isFocus).toBe(true)

      modernDb.close()
      await Dexie.delete(migrationDbName)
    })

    it('TC-R1-T2-05: Backlog task with null startDate and null deadline stores and retrieves safely', async () => {
      const taskId = await testDb.createItem({
        id: 't-backlog-null',
        type: 'task',
        title: 'Бэклог без даты',
        categoryTag: '#Бэклог',
        status: 'todo',
        priority: 'low',
        startDate: null,
        deadline: null,
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const fetched = await testDb.getItem(taskId)
      expect(fetched).toBeDefined()
      expect(fetched?.startDate).toBeNull()
      expect(fetched?.deadline).toBeNull()
    })

    it('TC-R1-T2-06: Instantaneous task where startDate equals deadline is preserved without invariant collapse', async () => {
      const instant = '2026-10-15T12:00:00.000Z'
      const taskId = await testDb.createItem({
        id: 't-instant',
        type: 'task',
        title: 'Моментальная контрольная точка',
        categoryTag: '#Майлстоун',
        status: 'todo',
        priority: 'high',
        startDate: instant,
        deadline: instant,
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const fetched = await testDb.getItem(taskId)
      expect(fetched?.startDate).toBe(instant)
      expect(fetched?.deadline).toBe(instant)
    })

    it('TC-R1-T2-07: Midnight boundary spanning task (23:30 to 01:30 next day) correctly preserves ISO dates', async () => {
      const start = '2026-10-31T23:30:00.000Z'
      const end = '2026-11-01T01:30:00.000Z'

      const taskId = await testDb.createItem({
        id: 't-midnight',
        type: 'task',
        title: 'Ночной релиз деплоя',
        categoryTag: '#Девопс',
        status: 'todo',
        priority: 'high',
        startDate: start,
        deadline: end,
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const fetched = await testDb.getItem(taskId)
      expect(fetched?.startDate).toBe(start)
      expect(fetched?.deadline).toBe(end)
      expect(new Date(fetched!.startDate!).getUTCDate()).toBe(31)
      expect(new Date(fetched!.deadline!).getUTCDate()).toBe(1)
    })
  })

  // =========================================================================
  // TIER 3: Cross-Feature Combinations
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('TC-R1-T3-01: batchRescheduleTasks in store updates deadline and synchronizes legacy dueDate across selected tasks', async () => {
      const item1: Item = {
        id: 'batch-1',
        type: 'task',
        title: 'Пакетная задача 1',
        categoryTag: '#Пакет',
        status: 'todo',
        priority: 'medium',
        startDate: '2026-10-10T09:00:00.000Z',
        deadline: '2026-10-10T10:00:00.000Z',
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const item2: Item = {
        id: 'batch-2',
        type: 'task',
        title: 'Пакетная задача 2',
        categoryTag: '#Пакет',
        status: 'todo',
        priority: 'medium',
        startDate: '2026-10-10T11:00:00.000Z',
        deadline: '2026-10-10T12:00:00.000Z',
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const itemUnselected: Item = {
        id: 'batch-keep',
        type: 'task',
        title: 'Невыбранная задача',
        categoryTag: '#Пакет',
        status: 'todo',
        priority: 'medium',
        startDate: '2026-10-10T14:00:00.000Z',
        deadline: '2026-10-10T15:00:00.000Z',
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await useAppStore.getState().addItem(item1)
      await useAppStore.getState().addItem(item2)
      await useAppStore.getState().addItem(itemUnselected)

      useAppStore.setState({ selectedTaskIds: ['batch-1', 'batch-2'] })

      const newDate = '2026-10-28'
      await useAppStore.getState().batchRescheduleTasks(newDate)

      const items = useAppStore.getState().items
      const b1 = items.find((i) => i.id === 'batch-1')
      const b2 = items.find((i) => i.id === 'batch-2')
      const kept = items.find((i) => i.id === 'batch-keep')

      expect(b1?.dueDate).toBe(newDate)
      expect(b1?.deadline).toContain(newDate)
      expect(b2?.dueDate).toBe(newDate)
      expect(b2?.deadline).toContain(newDate)
      expect(kept?.dueDate).toBe('2026-10-10')
    })

    it('TC-R1-T3-02: toggleTask completion preserves startDate & deadline while updating completedAt', async () => {
      const item: Item = {
        id: 't-complete-toggle',
        type: 'task',
        title: 'Проверка сохранения дат при завершении',
        categoryTag: '#Финалка',
        status: 'todo',
        priority: 'high',
        startDate: '2026-10-12T08:00:00.000Z',
        deadline: '2026-10-12T09:30:00.000Z',
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await useAppStore.getState().addItem(item)
      await useAppStore.getState().toggleTask('t-complete-toggle')

      let current = useAppStore.getState().items.find((i) => i.id === 't-complete-toggle')
      expect(current?.status).toBe('completed')
      expect(current?.completedAt).toBeDefined()
      expect(current?.startDate).toBe('2026-10-12T08:00:00.000Z')
      expect(current?.deadline).toBe('2026-10-12T09:30:00.000Z')

      // Uncomplete
      await useAppStore.getState().toggleTask('t-complete-toggle')
      current = useAppStore.getState().items.find((i) => i.id === 't-complete-toggle')
      expect(current?.status).toBe('todo')
      expect(current?.startDate).toBe('2026-10-12T08:00:00.000Z')
      expect(current?.deadline).toBe('2026-10-12T09:30:00.000Z')
    })

    it('TC-R1-T3-03: enforcing start <= deadline when updating startDate past existing deadline', async () => {
      const item: Item = {
        id: 't-inv-sync',
        type: 'task',
        title: 'Инвариант времени',
        categoryTag: '#Валидация',
        status: 'todo',
        priority: 'medium',
        startDate: '2026-10-12T10:00:00.000Z',
        deadline: '2026-10-12T11:00:00.000Z',
        estimatedMinutes: 60,
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await useAppStore.getState().addItem(item)
      // Attempt to move startDate past deadline
      await useAppStore.getState().updateItem('t-inv-sync', {
        startDate: '2026-10-12T12:00:00.000Z',
      })

      const updated = useAppStore.getState().items.find((i) => i.id === 't-inv-sync')
      expect(updated).toBeDefined()
      const startTime = new Date(updated!.startDate!).getTime()
      const deadlineTime = new Date(updated!.deadline!).getTime()
      expect(startTime).toBeLessThanOrEqual(deadlineTime)
    })
  })

  // =========================================================================
  // TIER 4: Real-World Application Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios', () => {
    it('TC-R1-T4-01: Full Task Lifecycle - Audio transcript -> Structured interval task -> Store -> DB -> Complete', async () => {
      const simulatedAudioSnippet = 'Запланируй созвон с инвестором завтра с 15:00 до 16:30'
      const startIso = '2026-10-07T15:00:00.000Z'
      const deadlineIso = '2026-10-07T16:30:00.000Z'

      const newTask: Item = {
        id: 'flow-task-1',
        type: 'task',
        title: 'Созвон с инвестором',
        description: 'Обсуждение посевного раунда инвестиций',
        transcriptText: simulatedAudioSnippet,
        audioDuration: 18,
        status: 'todo',
        priority: 'high',
        startDate: startIso,
        deadline: deadlineIso,
        categoryTag: '#Бизнес',
        tags: ['инвестор', 'питч'],
        isFocus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await useAppStore.getState().addItem(newTask)

      // Verify in store
      const inStore = useAppStore.getState().items.find((i) => i.id === 'flow-task-1')
      expect(inStore).toBeDefined()
      expect(inStore?.startDate).toBe(startIso)
      expect(inStore?.deadline).toBe(deadlineIso)
      expect(inStore?.dueDate).toBe('2026-10-07')
      expect(inStore?.dueTime).toBe('16:30')

      // Mark in progress
      await useAppStore.getState().updateItem('flow-task-1', { status: 'in_progress' })
      expect(useAppStore.getState().items.find((i) => i.id === 'flow-task-1')?.status).toBe('in_progress')

      // Mark completed
      await useAppStore.getState().toggleTask('flow-task-1')
      const completed = useAppStore.getState().items.find((i) => i.id === 'flow-task-1')
      expect(completed?.status).toBe('completed')
      expect(completed?.completedAt).toBeDefined()
    })

    it('TC-R1-T4-02: Heterogeneous 10-Task Legacy DB Migration - All formats seamlessly upgraded with zero data loss', async () => {
      const migrationDbName = `test-mig-10-${Date.now()}`

      const v1Db = new Dexie(migrationDbName)
      v1Db.version(1).stores({
        items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
      })
      await v1Db.open()

      const legacyTasks = [
        { id: 't1', title: 'Task 1: Full due date + time + est', dueDate: '2026-10-15', dueTime: '10:00', estimatedMinutes: 45 },
        { id: 't2', title: 'Task 2: Full due date + time, no est', dueDate: '2026-10-15', dueTime: '14:00' },
        { id: 't3', title: 'Task 3: ISO dueDate format', dueDate: '2026-10-16T18:00:00.000Z' },
        { id: 't4', title: 'Task 4: Date only, no time', dueDate: '2026-10-17' },
        { id: 't5', title: 'Task 5: Backlog task, no dueDate', createdAt: '2026-10-01T09:00:00.000Z' },
        { id: 't6', title: 'Task 6: High priority with checklist', dueDate: '2026-10-18', dueTime: '16:00', checklist: [{ id: 'c1', text: 'chk', isCompleted: false, sortOrder: 0 }] },
        { id: 't7', title: 'Task 7: Due date with short time 9:00', dueDate: '2026-10-19', dueTime: '09:00', estimatedMinutes: 120 },
        { id: 't8', title: 'Task 8: Completed task', dueDate: '2026-10-20', dueTime: '11:00', status: 'completed' },
        { id: 't9', title: 'Task 9: Focused task', dueDate: '2026-10-21', dueTime: '15:00', isFocus: true },
        { id: 't10', title: 'Task 10: Task with tags', dueDate: '2026-10-22', dueTime: '17:00', tags: ['audit'] },
      ]

      for (const t of legacyTasks) {
        await v1Db.table('items').put({
          type: 'task',
          status: 'todo',
          priority: 'medium',
          categoryTag: '#План',
          isFocus: false,
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
          ...t,
        })
      }
      v1Db.close()

      // Upgrade to modern VoiceNotesDB
      const modernDb = new VoiceNotesDB(migrationDbName)
      await modernDb.open()

      const allUpgraded = await modernDb.getAllItems()
      expect(allUpgraded).toHaveLength(10)

      // Verify specific migration outcomes
      const t1 = allUpgraded.find((i) => i.id === 't1')
      expect(t1?.deadline).toBe('2026-10-15T10:00:00.000Z')
      expect(t1?.startDate).toBe('2026-10-15T09:15:00.000Z') // 10:00 - 45 min

      const t2 = allUpgraded.find((i) => i.id === 't2')
      expect(t2?.deadline).toBe('2026-10-15T14:00:00.000Z')
      expect(t2?.startDate).toBe('2026-10-15T13:00:00.000Z') // default 60 min

      const t3 = allUpgraded.find((i) => i.id === 't3')
      expect(t3?.deadline).toBe('2026-10-16T18:00:00.000Z')
      expect(t3?.startDate).toBe('2026-10-16T17:00:00.000Z')

      const t4 = allUpgraded.find((i) => i.id === 't4')
      expect(t4?.deadline).toBe('2026-10-17T23:59:59.000Z')
      expect(t4?.startDate).toBe('2026-10-17T22:59:59.000Z')

      const t5 = allUpgraded.find((i) => i.id === 't5')
      expect(t5?.deadline).toBeNull()

      const t6 = allUpgraded.find((i) => i.id === 't6')
      expect(t6?.checklist).toHaveLength(1)

      const t7 = allUpgraded.find((i) => i.id === 't7')
      expect(t7?.startDate).toBe('2026-10-19T07:00:00.000Z') // 09:00 - 120 min

      const t9 = allUpgraded.find((i) => i.id === 't9')
      expect(t9?.isFocus).toBe(true)

      const t10 = allUpgraded.find((i) => i.id === 't10')
      expect(t10?.tags).toEqual(['audit'])

      modernDb.close()
      await Dexie.delete(migrationDbName)
    })
  })
})
