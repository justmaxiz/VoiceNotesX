import { describe, it, expect, beforeEach } from 'vitest'
import {
  VoiceNotesDB,
  db,
  createItem,
  updateItem,
  deleteItem,
  toggleTaskComplete,
  setFocusTask,
  getAllItems,
  getItem,
  clearDatabase,
} from '../db'
import { Item, AudioSession, UserSettings } from '../../types'

describe('VoiceNotesDB - Local-First Dexie Storage (TASK-05)', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('initializes tables items, audioSessions, and settings', async () => {
    expect(db.items).toBeDefined()
    expect(db.audioSessions).toBeDefined()
    expect(db.settings).toBeDefined()
    expect(db.name).toBe('VoiceNotesDB')
    expect(await getAllItems()).toEqual([])
  })

  it('creates and retrieves an item', async () => {
    const newItem: Item = {
      id: 'task-test-1',
      type: 'task',
      title: 'Написать тесты для хранилища',
      categoryTag: '#Тесты',
      status: 'todo',
      priority: 'high',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const createdId = await createItem(newItem)
    expect(createdId).toBe('task-test-1')

    const retrieved = await getItem('task-test-1')
    expect(retrieved).toBeDefined()
    expect(retrieved?.title).toBe('Написать тесты для хранилища')
    expect(retrieved?.status).toBe('todo')
    expect(retrieved?.priority).toBe('high')
  })

  it('updates an existing item with partial patch', async () => {
    const item: Item = {
      id: 'task-test-update',
      type: 'task',
      title: 'Старый заголовок',
      categoryTag: '#Работа',
      status: 'todo',
      priority: 'medium',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await createItem(item)

    await updateItem('task-test-update', {
      title: 'Новый обновленный заголовок',
      priority: 'high',
    })

    const updated = await getItem('task-test-update')
    expect(updated?.title).toBe('Новый обновленный заголовок')
    expect(updated?.priority).toBe('high')
    expect(updated?.categoryTag).toBe('#Работа')
  })

  it('throws an error when updating a non-existent item', async () => {
    await expect(updateItem('non-existent-id', { title: 'ABC' })).rejects.toThrow(
      'Item with id "non-existent-id" not found'
    )
  })

  it('deletes an item', async () => {
    const item: Item = {
      id: 'task-test-delete',
      type: 'task',
      title: 'Удаляемая задача',
      categoryTag: '#Временное',
      status: 'todo',
      priority: 'low',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await createItem(item)
    expect(await getItem('task-test-delete')).toBeDefined()

    await deleteItem('task-test-delete')
    expect(await getItem('task-test-delete')).toBeUndefined()
  })

  it('toggles task completion status and sets completedAt timestamp', async () => {
    const item: Item = {
      id: 'task-test-toggle',
      type: 'task',
      title: 'Задача для чекбокса',
      categoryTag: '#Фичи',
      status: 'todo',
      priority: 'medium',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await createItem(item)

    // 1. Toggle to completed
    await toggleTaskComplete('task-test-toggle')
    let current = await getItem('task-test-toggle')
    expect(current?.status).toBe('completed')
    expect(current?.completedAt).toBeDefined()

    // 2. Toggle back to todo
    await toggleTaskComplete('task-test-toggle')
    current = await getItem('task-test-toggle')
    expect(current?.status).toBe('todo')
    expect(current?.completedAt).toBeUndefined()
  })

  it('throws error when toggling non-existent task', async () => {
    await expect(toggleTaskComplete('unknown-id')).rejects.toThrow(
      'Item with id "unknown-id" not found'
    )
  })

  it('sets focus task exclusively (clears prior focus tasks)', async () => {
    const task1: Item = {
      id: 'task-focus-1',
      type: 'task',
      title: 'Фокус 1',
      categoryTag: '#A',
      status: 'todo',
      priority: 'medium',
      isFocus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const task2: Item = {
      id: 'task-focus-2',
      type: 'task',
      title: 'Фокус 2',
      categoryTag: '#B',
      status: 'todo',
      priority: 'high',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await createItem(task1)
    await createItem(task2)

    // Switch focus to task2
    await setFocusTask('task-focus-2')

    const updatedTask1 = await getItem('task-focus-1')
    const updatedTask2 = await getItem('task-focus-2')

    expect(updatedTask1?.isFocus).toBe(false)
    expect(updatedTask2?.isFocus).toBe(true)
  })

  it('stores and retrieves audio sessions and user settings', async () => {
    const session: AudioSession = {
      id: 'audio-test-1',
      title: 'Запись с митинга',
      duration: 120,
      recordedAt: '15:30',
      transcriptSnippet: 'Обсуждение релиза',
      tags: ['#Релиз'],
      audioUrl: 'blob:test',
    }

    await db.audioSessions.put(session)
    const allAudio = await db.audioSessions.toArray()
    expect(allAudio).toHaveLength(1)
    expect(allAudio[0].title).toBe('Запись с митинга')

    const settings: UserSettings = {
      id: 'default',
      userName: 'Александр',
      subscriptionStatus: 'pro',
      aiMode: 'deep',
      structuringStyle: 'action_plan',
      theme: 'dark',
      fontScale: 'compact',
      language: 'ru-RU',
      devices: [],
      updatedAt: new Date().toISOString(),
    }

    await db.settings.put(settings)
    const storedSettings = await db.settings.get('default')
    expect(storedSettings?.userName).toBe('Александр')
    expect(storedSettings?.aiMode).toBe('deep')
  })

  it('supports isolated database instances', async () => {
    const isolatedDb = new VoiceNotesDB('IsolatedTestDB_' + Date.now())
    await isolatedDb.createItem({
      id: 'isolated-item',
      type: 'note',
      title: 'Изолированная заметка',
      categoryTag: '#Заметка',
      status: 'todo',
      priority: 'low',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const found = await isolatedDb.getItem('isolated-item')
    expect(found?.title).toBe('Изолированная заметка')

    await isolatedDb.delete()
  })

  it('generates an ID automatically when creating an item without an id', async () => {
    const createdId = await createItem({
      id: '',
      type: 'task',
      title: 'Задача без явного ID',
      categoryTag: '#АвтоID',
      status: 'todo',
      priority: 'low',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    expect(createdId).toBeTruthy()
    expect(typeof createdId).toBe('string')

    const item = await getItem(createdId)
    expect(item).toBeDefined()
    expect(item?.title).toBe('Задача без явного ID')
  })

  it('enforces single focus invariant when creating an item with isFocus: true', async () => {
    const task1Id = await createItem({
      id: 'focus-test-1',
      type: 'task',
      title: 'Первый фокус',
      categoryTag: '#Фокус',
      status: 'todo',
      priority: 'medium',
      isFocus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const task2Id = await createItem({
      id: 'focus-test-2',
      type: 'task',
      title: 'Второй фокус',
      categoryTag: '#Фокус',
      status: 'todo',
      priority: 'high',
      isFocus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const t1 = await getItem(task1Id)
    const t2 = await getItem(task2Id)
    expect(t1?.isFocus).toBe(false)
    expect(t2?.isFocus).toBe(true)
  })

  it('enforces single focus invariant when updating an item with isFocus: true', async () => {
    await createItem({
      id: 'focus-t1',
      type: 'task',
      title: 'Задача 1',
      categoryTag: '#Фокус',
      status: 'todo',
      priority: 'medium',
      isFocus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await createItem({
      id: 'focus-t2',
      type: 'task',
      title: 'Задача 2',
      categoryTag: '#Фокус',
      status: 'todo',
      priority: 'high',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await updateItem('focus-t2', { isFocus: true })

    const t1 = await getItem('focus-t1')
    const t2 = await getItem('focus-t2')
    expect(t1?.isFocus).toBe(false)
    expect(t2?.isFocus).toBe(true)
  })

  it('provides helpers for audio sessions and settings management', async () => {
    const audioId = await db.createAudioSession({
      id: '',
      title: 'Сессия с микрофона',
      duration: 45,
      recordedAt: '12:00',
      transcriptSnippet: 'Тестовый сниппет',
      tags: ['#Тест'],
    })
    expect(audioId).toBeTruthy()

    const audio = await db.getAudioSession(audioId)
    expect(audio?.title).toBe('Сессия с микрофона')

    const allAudio = await db.getAllAudioSessions()
    expect(allAudio.length).toBeGreaterThanOrEqual(1)

    await db.deleteAudioSession(audioId)
    expect(await db.getAudioSession(audioId)).toBeUndefined()

    await db.saveSettings({
      id: 'default',
      userName: 'Иван',
      subscriptionStatus: 'pro',
      aiMode: 'fast',
      structuringStyle: 'concise',
      theme: 'dark',
      fontScale: 'standard',
      language: 'ru-RU',
      devices: [],
      updatedAt: new Date().toISOString(),
    })
    const settings = await db.getSettings()
    expect(settings?.userName).toBe('Иван')
  })
})
