import { create } from 'zustand'
import { Item, TaskFilter, TaskSortCriteria, TaskSortDirection } from '../types'
import { db } from '../lib/db'
import { normalizeTaskDates } from '../lib/taskDates'
import { audioPlaybackUrl, releaseAudioUrl } from '../lib/audioPersistence'
import {
  upsertSearchItem,
  removeSearchItem,
  rebuildSearchIndex,
  performSearch,
} from '../lib/search'
import { SEED_ITEMS, seedDatabase } from '../lib/seedData'
import { useNavigationStore } from './navigationStore'

export type SortOrder = 'priority' | 'date' | 'alphabetical'

export interface AppState {
  items: Item[]
  isRecording: boolean
  activeFilter: TaskFilter
  sortOrder: SortOrder
  sortBy: TaskSortCriteria
  sortDirection: TaskSortDirection
  selectedTaskIds: string[]
  isSelectMode: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setActiveFilter: (filter: TaskFilter) => void
  setSortOrder: (order: SortOrder) => void
  setSort: (by: TaskSortCriteria, direction?: TaskSortDirection) => void
  setIsRecording: (isRecording: boolean) => void
  setRecording: (isRecording: boolean) => void
  setItems: (items: Item[]) => void
  addItem: (item: Item, audio?: { blob: Blob; duration: number }) => Promise<void>
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  setFocusTask: (id: string) => Promise<void>
  setFocusedTask: (id: string) => Promise<void>
  setSelectMode: (mode: boolean) => void
  toggleSelectTask: (id: string) => void
  selectAllTasks: (ids?: string[]) => void
  clearSelectedTasks: () => void
  batchCompleteTasks: () => Promise<void>
  batchDeleteTasks: () => Promise<void>
  batchRescheduleTasks: (dueDate: string | null) => Promise<void>
  loadItems: () => Promise<void>
  clearError: () => void

  // Selectors / Query helpers
  getFilteredItems: () => Item[]
  searchItems: (query: string) => Item[]
}

export { normalizeTaskDates as syncTemporalFields } from '../lib/taskDates'

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)
}

const getInitialSort = (): { sortBy: TaskSortCriteria; sortDirection: TaskSortDirection } => {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('voicenotes_task_sort')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.sortBy && parsed.sortDirection) {
          return parsed
        }
      }
    } catch {}
  }
  return { sortBy: 'priority', sortDirection: 'asc' }
}

// Populate search index with initial seed items synchronously
rebuildSearchIndex(SEED_ITEMS)

const initialSort = getInitialSort()

export const useAppStore = create<AppState>((set, get) => ({
  items: SEED_ITEMS,
  isRecording: false,
  activeFilter: 'all',
  sortOrder: 'priority',
  sortBy: initialSort.sortBy,
  sortDirection: initialSort.sortDirection,
  selectedTaskIds: [],
  isSelectMode: false,
  isLoading: false,
  error: null,





  setActiveFilter: (filter: TaskFilter) => set({ activeFilter: filter }),

  setSortOrder: (order: SortOrder) => set({ sortOrder: order }),

  setSort: (by: TaskSortCriteria, direction?: TaskSortDirection) => {
    const currentDir = get().sortDirection
    const nextDir = direction !== undefined ? direction : (get().sortBy === by ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc')
    set({ sortBy: by, sortDirection: nextDir })
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('voicenotes_task_sort', JSON.stringify({ sortBy: by, sortDirection: nextDir }))
      } catch {}
    }
  },

  setIsRecording: (isRecording: boolean) => set({ isRecording }),
  setRecording: (isRecording: boolean) => set({ isRecording }),

  setItems: (items: Item[]) => {
    rebuildSearchIndex(items)
    set({ items })
  },

  addItem: async (item: Item, audio) => {
    const isFocus = Boolean(item.isFocus || item.isFocused)
    let synced: Item
    try { synced = normalizeTaskDates(item) } catch (error) { set({ error: (error as Error).message }); throw error }
    const finalItem: Item = {
      ...synced,
      id: synced.id || generateId(),
      isFocus,
      isFocused: isFocus,
      createdAt: synced.createdAt || new Date().toISOString(),
      updatedAt: synced.updatedAt || new Date().toISOString(),
    }
    const previousItems = get().items

    let nextItems = [finalItem, ...previousItems]
    if (finalItem.isFocus) {
      nextItems = nextItems.map((i) =>
        i.id === finalItem.id ? i : (i.isFocus || i.isFocused) ? { ...i, isFocus: false, isFocused: false } : i
      )
    }

    // Optimistic update
    set({ items: nextItems })
    upsertSearchItem(finalItem)
    if (finalItem.isFocus) {
      previousItems
        .filter((i) => i.isFocus || i.isFocused)
        .forEach((i) => upsertSearchItem({ ...i, isFocus: false, isFocused: false }))
    }

    try {
      await db.createItem(finalItem, audio)
      if (audio) {
        const audioUrl = await audioPlaybackUrl(finalItem.id)
        set({ items: get().items.map((i) => i.id === finalItem.id ? { ...i, audioUrl } : i) })
      }
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      removeSearchItem(finalItem.id)
      if (finalItem.isFocus) {
        previousItems.filter((i) => i.isFocus || i.isFocused).forEach((i) => upsertSearchItem(i))
      }
      throw err
    }
  },

  updateItem: async (id: string, patch: Partial<Item>) => {
    const previousItems = get().items
    const current = previousItems.find((i) => i.id === id)
    if (!current) {
      throw new Error(`Item with id "${id}" not found`)
    }

    let syncedPatch: Partial<Item>
    try { syncedPatch = normalizeTaskDates(patch, current) } catch (error) { set({ error: (error as Error).message }); throw error }
    if ('status' in patch) {
      syncedPatch.completedAt = patch.status === 'completed' ? current.completedAt || new Date().toISOString() : undefined
      if (patch.status === 'completed' || patch.status === 'archived') {
        syncedPatch.isFocus = false
        syncedPatch.isFocused = false
      }
    }
    const hasFocusChange = 'isFocus' in syncedPatch || 'isFocused' in syncedPatch
    const isFocusVal = hasFocusChange ? Boolean(syncedPatch.isFocus || syncedPatch.isFocused) : Boolean(current.isFocus || current.isFocused)

    if (isFocusVal && hasFocusChange && (syncedPatch.status || current.status) === 'todo') syncedPatch.status = 'in_progress'
    const updatedItem: Item = {
      ...current,
      ...syncedPatch,
      ...(hasFocusChange ? { isFocus: isFocusVal, isFocused: isFocusVal } : {}),
      updatedAt: new Date().toISOString(),
    }

    let nextItems = previousItems.map((item) => (item.id === id ? updatedItem : item))
    if (isFocusVal && hasFocusChange) {
      nextItems = nextItems.map((item) =>
        item.id === id ? item : (item.isFocus || item.isFocused) ? { ...item, isFocus: false, isFocused: false } : item
      )
    }

    // Optimistic update
    set({ items: nextItems })
    upsertSearchItem(updatedItem)
    if (isFocusVal && hasFocusChange) {
      previousItems
        .filter((i) => i.id !== id && (i.isFocus || i.isFocused))
        .forEach((i) => upsertSearchItem({ ...i, isFocus: false, isFocused: false }))
    }

    try {
      await db.updateItem(id, {
        ...syncedPatch,
        ...(hasFocusChange ? { isFocus: isFocusVal, isFocused: isFocusVal } : {}),
      })
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      upsertSearchItem(current)
      if (isFocusVal && hasFocusChange) {
        previousItems.filter((i) => i.id !== id && (i.isFocus || i.isFocused)).forEach((i) => upsertSearchItem(i))
      }
      throw err
    }
  },

  deleteItem: async (id: string) => {
    const previousItems = get().items
    const itemToDelete = previousItems.find((i) => i.id === id)
    if (!itemToDelete) {
      throw new Error(`Item with id "${id}" not found`)
    }

    // Optimistic update
    const nextItems = previousItems.filter((i) => i.id !== id)
    set({ items: nextItems })
    removeSearchItem(id)

    try {
      await db.deleteItem(id)
      releaseAudioUrl(id)
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      upsertSearchItem(itemToDelete)
      throw err
    }
  },

  toggleTask: async (id: string) => {
    const current = get().items.find((item) => item.id === id)
    if (!current) throw new Error(`Item with id "${id}" not found`)
    await get().updateItem(id, { status: current.status === 'completed' ? 'todo' : 'completed' })
  },

  setFocusTask: async (id: string) => {
    const previousItems = get().items
    const target = previousItems.find((i) => i.id === id)
    if (!target) {
      throw new Error(`Item with id "${id}" not found`)
    }

    const now = new Date().toISOString()
    const prevFocused = previousItems.filter((i) => i.id !== id && (i.isFocus || i.isFocused))
    const newStatus = target.status === 'todo' ? 'in_progress' : target.status

    const nextItems = previousItems.map((item) => {
      if (item.id === id) {
        return { ...item, isFocus: true, isFocused: true, status: newStatus, updatedAt: now }
      }
      if (item.isFocus || item.isFocused) {
        return { ...item, isFocus: false, isFocused: false, updatedAt: now }
      }
      return item
    })

    const updatedTarget = nextItems.find((i) => i.id === id)!

    // Optimistic update
    set({ items: nextItems })
    upsertSearchItem(updatedTarget)
    prevFocused.forEach((item) =>
      upsertSearchItem({ ...item, isFocus: false, isFocused: false, updatedAt: now })
    )

    try {
      await db.setFocusTask(id)
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      upsertSearchItem(target)
      prevFocused.forEach((item) => upsertSearchItem(item))
      throw err
    }
  },

  setFocusedTask: async (id: string) => {
    return get().setFocusTask(id)
  },

  setSelectMode: (mode: boolean) => {
    set({ isSelectMode: mode, selectedTaskIds: mode ? get().selectedTaskIds : [] })
  },

  toggleSelectTask: (id: string) => {
    const current = get().selectedTaskIds
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    set({ selectedTaskIds: next, isSelectMode: next.length > 0 ? true : get().isSelectMode })
  },

  selectAllTasks: (ids?: string[]) => {
    if (ids) {
      set({ selectedTaskIds: ids, isSelectMode: true })
    } else {
      const allTaskIds = get().items.filter((i) => i.type === 'task').map((i) => i.id)
      set({ selectedTaskIds: allTaskIds, isSelectMode: true })
    }
  },

  clearSelectedTasks: () => {
    set({ selectedTaskIds: [], isSelectMode: false })
  },

  batchCompleteTasks: async () => {
    const selected = get().selectedTaskIds
    if (selected.length === 0) return
    for (const id of selected) {
      const item = get().items.find((i) => i.id === id)
      if (item && item.status !== 'completed') {
        await get().toggleTask(id)
      }
    }
    set({ selectedTaskIds: [], isSelectMode: false })
  },

  batchDeleteTasks: async () => {
    const selected = get().selectedTaskIds
    if (selected.length === 0) return
    for (const id of selected) {
      await get().deleteItem(id)
    }
    set({ selectedTaskIds: [], isSelectMode: false })
  },

  batchRescheduleTasks: async (dueDate: string | null) => {
    const selected = get().selectedTaskIds
    if (selected.length === 0) return
    for (const id of selected) {
      if (dueDate === null) {
        await get().updateItem(id, { dueDate: null, dueTime: null, deadline: null, startDate: null })
      } else {
        await get().updateItem(id, { dueDate })
      }
    }
    set({ selectedTaskIds: [], isSelectMode: false })
  },

  loadItems: async () => {
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      await seedDatabase()
      const loaded = await db.getAllItems()
      await Promise.all(loaded.map(async (item) => {
        item.audioUrl = await audioPlaybackUrl(item.id) || (item.audioUrl?.startsWith('blob:') ? undefined : item.audioUrl)
      }))
      rebuildSearchIndex(loaded)
      set({ items: loaded, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      throw err
    }
  },

  clearError: () => set({ error: null }),

  getFilteredItems: () => {
    const { items, activeFilter, sortOrder } = get()
    const { searchQuery } = useNavigationStore.getState()
    let result = [...items]

    // Apply full-text search if query present
    if (searchQuery.trim()) {
      result = performSearch(searchQuery, result)
    }

    // Apply active filter
    if (activeFilter === 'voice') {
      result = result.filter(
        (item) =>
          Boolean(item.audioUrl) ||
          Boolean(item.transcriptText) ||
          (typeof item.audioDuration === 'number' && item.audioDuration > 0)
      )
    } else if (activeFilter === 'summaries') {
      result = result.filter(
        (item) =>
          item.type === 'note' ||
          item.categoryTag.toLowerCase().includes('сводка') ||
          item.categoryTag.toLowerCase().includes('дайджест')
      )
    }

    // Apply sort order
    if (sortOrder === 'priority') {
      const priorityWeight: Record<Item['priority'], number> = {
        high: 3,
        medium: 2,
        low: 1,
      }
      result.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
    } else if (sortOrder === 'date') {
      result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
    } else if (sortOrder === 'alphabetical') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    }

    return result
  },

  searchItems: (query: string) => {
    return performSearch(query, get().items)
  },
}))


