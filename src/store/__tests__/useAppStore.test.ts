import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '../useAppStore'
import { useNavigationStore } from '../navigationStore'
import { db, clearDatabase } from '../../lib/db'
import { Item } from '../../types'

describe('useAppStore - Reactive State Management (TASK-06)', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearDatabase()
    useNavigationStore.setState({ activeTab: 'overview', searchQuery: '' })
    const testItems: Item[] = [
      {
        id: 'store-1',
        type: 'task',
        title: 'Обычная задача',
        categoryTag: '#Общее',
        status: 'todo',
        priority: 'low',
        isFocus: false,
        createdAt: '2026-10-05T08:00:00.000Z',
        updatedAt: '2026-10-05T08:00:00.000Z',
      },
      {
        id: 'store-2',
        type: 'task',
        title: 'Срочная задача',
        categoryTag: '#Срочно',
        status: 'todo',
        priority: 'high',
        isFocus: false,
        createdAt: '2026-10-05T09:00:00.000Z',
        updatedAt: '2026-10-05T09:00:00.000Z',
      },
      {
        id: 'store-3',
        type: 'note',
        title: 'Голосовая заметка со звуком',
        categoryTag: '#Аудио',
        status: 'todo',
        priority: 'medium',
        audioDuration: 45,
        transcriptText: 'Текст аудио транскрипции',
        isFocus: false,
        createdAt: '2026-10-05T10:00:00.000Z',
        updatedAt: '2026-10-05T10:00:00.000Z',
      },
    ]
    useAppStore.setState({
      activeTab: 'overview',
      searchQuery: '',
      isRecording: false,
      activeFilter: 'all',
      sortOrder: 'priority',
      error: null,
    })
    await db.items.bulkPut(testItems)
    useAppStore.getState().setItems(testItems)
  })

  it('optimistically adds an item and syncs with IndexedDB', async () => {
    const newItem: Item = {
      id: 'store-new-item',
      type: 'task',
      title: 'Быстрая новая задача',
      categoryTag: '#Быстро',
      status: 'todo',
      priority: 'medium',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await useAppStore.getState().addItem(newItem)

    // State is updated
    const items = useAppStore.getState().items
    expect(items[0].id).toBe('store-new-item')

    // Persisted to DB
    const dbItem = await db.items.get('store-new-item')
    expect(dbItem).toBeDefined()
    expect(dbItem?.title).toBe('Быстрая новая задача')
  })

  it('rolls back state if addItem fails in IndexedDB', async () => {
    const prevItems = useAppStore.getState().items
    const spy = vi.spyOn(db, 'createItem').mockRejectedValueOnce(new Error('DB failure'))

    const newItem: Item = {
      id: 'store-fail-item',
      type: 'task',
      title: 'Ошибочная задача',
      categoryTag: '#Ошибка',
      status: 'todo',
      priority: 'low',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await expect(useAppStore.getState().addItem(newItem)).rejects.toThrow('DB failure')

    // Should rollback to previous items
    expect(useAppStore.getState().items).toEqual(prevItems)
    expect(useAppStore.getState().error).toBe('DB failure')

    spy.mockRestore()
  })

  it('optimistically updates an item and syncs to DB', async () => {
    await db.items.put(useAppStore.getState().items[0])

    await useAppStore.getState().updateItem('store-1', { title: 'Обновленное имя' })

    const updated = useAppStore.getState().items.find((i) => i.id === 'store-1')
    expect(updated?.title).toBe('Обновленное имя')

    const dbUpdated = await db.items.get('store-1')
    expect(dbUpdated?.title).toBe('Обновленное имя')
  })

  it('rolls back state if updateItem fails in DB', async () => {
    const spy = vi.spyOn(db, 'updateItem').mockRejectedValueOnce(new Error('Update failed'))

    await expect(
      useAppStore.getState().updateItem('store-1', { title: 'Сломанное имя' })
    ).rejects.toThrow('Update failed')

    const current = useAppStore.getState().items.find((i) => i.id === 'store-1')
    expect(current?.title).toBe('Обычная задача')

    spy.mockRestore()
  })

  it('optimistically deletes an item and removes from DB', async () => {
    await db.items.put(useAppStore.getState().items[0])

    await useAppStore.getState().deleteItem('store-1')

    expect(useAppStore.getState().items.some((i) => i.id === 'store-1')).toBe(false)
    expect(await db.items.get('store-1')).toBeUndefined()
  })

  it('optimistically toggles task completion and rolls back on failure', async () => {
    await db.items.put(useAppStore.getState().items[0])

    // Toggle 1: todo -> completed
    await useAppStore.getState().toggleTask('store-1')
    let item = useAppStore.getState().items.find((i) => i.id === 'store-1')
    expect(item?.status).toBe('completed')
    expect(item?.completedAt).toBeDefined()

    // Toggle 2: completed -> todo
    await useAppStore.getState().toggleTask('store-1')
    item = useAppStore.getState().items.find((i) => i.id === 'store-1')
    expect(item?.status).toBe('todo')

    // Test rollback on failure
    const spy = vi.spyOn(db, 'toggleTaskComplete').mockRejectedValueOnce(new Error('Toggle error'))
    await expect(useAppStore.getState().toggleTask('store-1')).rejects.toThrow('Toggle error')
    expect(useAppStore.getState().items.find((i) => i.id === 'store-1')?.status).toBe('todo')

    spy.mockRestore()
  })

  it('sets focus task optimistically', async () => {
    await db.items.put(useAppStore.getState().items[1])

    await useAppStore.getState().setFocusTask('store-2')

    const items = useAppStore.getState().items
    expect(items.find((i) => i.id === 'store-2')?.isFocus).toBe(true)
    expect(items.find((i) => i.id === 'store-1')?.isFocus).toBe(false)
  })

  it('filters items correctly with activeFilter', () => {
    const store = useAppStore.getState()

    // Filter: urgent
    store.setActiveFilter('urgent')
    let filtered = useAppStore.getState().getFilteredItems()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('store-2')

    // Filter: voice
    store.setActiveFilter('voice')
    filtered = useAppStore.getState().getFilteredItems()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('store-3')

    // Filter: all
    store.setActiveFilter('all')
    filtered = useAppStore.getState().getFilteredItems()
    expect(filtered).toHaveLength(3)
  })

  it('sorts items by priority, date, and alphabetical', () => {
    const store = useAppStore.getState()

    // Sort by priority (high > medium > low)
    store.setSortOrder('priority')
    let sorted = useAppStore.getState().getFilteredItems()
    expect(sorted[0].id).toBe('store-2') // high
    expect(sorted[1].id).toBe('store-3') // medium
    expect(sorted[2].id).toBe('store-1') // low

    // Sort by alphabetical
    store.setSortOrder('alphabetical')
    sorted = useAppStore.getState().getFilteredItems()
    expect(sorted[0].title).toBe('Голосовая заметка со звуком')
    expect(sorted[1].title).toBe('Обычная задача')
    expect(sorted[2].title).toBe('Срочная задача')
  })

  it('integrates search via searchQuery and searchItems', () => {
    const results = useAppStore.getState().searchItems('Срочная')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('store-2')

    useAppStore.getState().setSearchQuery('Голосовая')
    const filtered = useAppStore.getState().getFilteredItems()
    expect(filtered.some((i) => i.id === 'store-3')).toBe(true)
  })

  it('synchronizes activeTab with useNavigationStore', () => {
    useAppStore.getState().setActiveTab('tasks')
    expect(useAppStore.getState().activeTab).toBe('tasks')
    expect(useNavigationStore.getState().activeTab).toBe('tasks')
  })

  it('stores and persists API key', () => {
    useAppStore.getState().setApiKey('AIzaSyTestKey123')
    expect(useAppStore.getState().apiKey).toBe('AIzaSyTestKey123')
    expect(localStorage.getItem('voicenotes_api_key')).toBe('AIzaSyTestKey123')
  })

  it('throws an error when updating, deleting, toggling, or focusing a non-existent item', async () => {
    const store = useAppStore.getState()
    await expect(store.updateItem('non-existent-id', { title: 'X' })).rejects.toThrow(
      'Item with id "non-existent-id" not found'
    )
    await expect(store.deleteItem('non-existent-id')).rejects.toThrow(
      'Item with id "non-existent-id" not found'
    )
    await expect(store.toggleTask('non-existent-id')).rejects.toThrow(
      'Item with id "non-existent-id" not found'
    )
    await expect(store.setFocusTask('non-existent-id')).rejects.toThrow(
      'Item with id "non-existent-id" not found'
    )
  })

  it('enforces single focus invariant when adding an item with isFocus: true', async () => {
    await useAppStore.getState().setFocusTask('store-2')
    expect(useAppStore.getState().items.find((i) => i.id === 'store-2')?.isFocus).toBe(true)

    await useAppStore.getState().addItem({
      id: 'store-focus-new',
      type: 'task',
      title: 'Новая супер фокусная задача',
      categoryTag: '#Фокус',
      status: 'todo',
      priority: 'high',
      isFocus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const items = useAppStore.getState().items
    expect(items.find((i) => i.id === 'store-focus-new')?.isFocus).toBe(true)
    expect(items.find((i) => i.id === 'store-2')?.isFocus).toBe(false)
  })

  it('enforces single focus invariant when updating an item with isFocus: true', async () => {
    await useAppStore.getState().setFocusTask('store-1')
    expect(useAppStore.getState().items.find((i) => i.id === 'store-1')?.isFocus).toBe(true)

    await useAppStore.getState().updateItem('store-2', { isFocus: true })

    const items = useAppStore.getState().items
    expect(items.find((i) => i.id === 'store-2')?.isFocus).toBe(true)
    expect(items.find((i) => i.id === 'store-1')?.isFocus).toBe(false)
  })

  it('guards against concurrent loadItems calls while loading', async () => {
    useAppStore.setState({ isLoading: true })
    const spy = vi.spyOn(db, 'getAllItems')

    await useAppStore.getState().loadItems()

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
