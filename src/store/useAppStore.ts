import { create } from 'zustand'
import { Item, TaskFilter, TaskSortCriteria, TaskSortDirection } from '../types'
import { db } from '../lib/db'
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
  activeTab: string
  searchQuery: string
  isRecording: boolean
  activeFilter: TaskFilter
  sortOrder: SortOrder
  sortBy: TaskSortCriteria
  sortDirection: TaskSortDirection
  selectedTaskIds: string[]
  isSelectMode: boolean
  apiKey: string
  isLoading: boolean
  error: string | null

  // Actions
  setActiveTab: (tab: string) => void
  setSearchQuery: (query: string) => void
  setActiveFilter: (filter: TaskFilter) => void
  setSortOrder: (order: SortOrder) => void
  setSort: (by: TaskSortCriteria, direction?: TaskSortDirection) => void
  setIsRecording: (isRecording: boolean) => void
  setRecording: (isRecording: boolean) => void
  setItems: (items: Item[]) => void
  addItem: (item: Item) => Promise<void>
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
  setApiKey: (key: string) => void
  loadItems: () => Promise<void>
  clearError: () => void

  // Selectors / Query helpers
  getFilteredItems: () => Item[]
  searchItems: (query: string) => Item[]
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)
}

const getStoredApiKey = (): string => {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem('voicenotes_api_key') || ''
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
  activeTab: 'overview',
  searchQuery: '',
  isRecording: false,
  activeFilter: 'all',
  sortOrder: 'priority',
  sortBy: initialSort.sortBy,
  sortDirection: initialSort.sortDirection,
  selectedTaskIds: [],
  isSelectMode: false,
  apiKey: getStoredApiKey(),
  isLoading: false,
  error: null,

  setActiveTab: (tab: string) => {
    set({ activeTab: tab })
    const navStore = useNavigationStore.getState()
    if (navStore.activeTab !== tab) {
      navStore.setActiveTab(tab as any)
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
    const navStore = useNavigationStore.getState()
    if (navStore.searchQuery !== query) {
      navStore.setSearchQuery(query)
    }
  },

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

  addItem: async (item: Item) => {
    const finalItem: Item = {
      ...item,
      id: item.id || generateId(),
      isFocus: Boolean(item.isFocus),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }
    const previousItems = get().items

    let nextItems = [finalItem, ...previousItems]
    if (finalItem.isFocus) {
      nextItems = nextItems.map((i) =>
        i.id === finalItem.id ? i : i.isFocus ? { ...i, isFocus: false } : i
      )
    }

    // Optimistic update
    set({ items: nextItems })
    upsertSearchItem(finalItem)
    if (finalItem.isFocus) {
      previousItems
        .filter((i) => i.isFocus)
        .forEach((i) => upsertSearchItem({ ...i, isFocus: false }))
    }

    try {
      await db.createItem(finalItem)
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      removeSearchItem(finalItem.id)
      if (finalItem.isFocus) {
        previousItems.filter((i) => i.isFocus).forEach((i) => upsertSearchItem(i))
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

    const updatedItem: Item = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    }

    let nextItems = previousItems.map((item) => (item.id === id ? updatedItem : item))
    if (patch.isFocus) {
      nextItems = nextItems.map((item) =>
        item.id === id ? item : item.isFocus ? { ...item, isFocus: false } : item
      )
    }

    // Optimistic update
    set({ items: nextItems })
    upsertSearchItem(updatedItem)
    if (patch.isFocus) {
      previousItems
        .filter((i) => i.id !== id && i.isFocus)
        .forEach((i) => upsertSearchItem({ ...i, isFocus: false }))
    }

    try {
      await db.updateItem(id, patch)
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      upsertSearchItem(current)
      if (patch.isFocus) {
        previousItems.filter((i) => i.id !== id && i.isFocus).forEach((i) => upsertSearchItem(i))
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
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      upsertSearchItem(itemToDelete)
      throw err
    }
  },

  toggleTask: async (id: string) => {
    const previousItems = get().items
    const current = previousItems.find((t) => t.id === id)
    if (!current) {
      throw new Error(`Item with id "${id}" not found`)
    }

    const isCompleted = current.status === 'completed'
    const newStatus: Item['status'] = isCompleted ? 'todo' : 'completed'
    const now = new Date().toISOString()
    const updatedItem: Item = {
      ...current,
      status: newStatus,
      completedAt: isCompleted ? undefined : now,
      updatedAt: now,
    }

    // Optimistic update
    const nextItems = previousItems.map((item) => (item.id === id ? updatedItem : item))
    set({ items: nextItems })
    upsertSearchItem(updatedItem)

    try {
      await db.toggleTaskComplete(id)
    } catch (err) {
      // Rollback on failure
      set({ items: previousItems, error: (err as Error).message })
      upsertSearchItem(current)
      throw err
    }
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
      if (target.status === 'todo') {
        await db.updateItem(id, { status: 'in_progress' })
      }
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
      await get().updateItem(id, { dueDate })
    }
    set({ selectedTaskIds: [], isSelectMode: false })
  },

  setApiKey: (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('voicenotes_api_key', key)
    }
    set({ apiKey: key })
  },

  loadItems: async () => {
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      await seedDatabase()
      const loaded = await db.getAllItems()
      rebuildSearchIndex(loaded)
      set({ items: loaded, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message })
      throw err
    }
  },

  clearError: () => set({ error: null }),

  getFilteredItems: () => {
    const { items, activeFilter, sortOrder, searchQuery } = get()
    let result = [...items]

    // Apply full-text search if query present
    if (searchQuery.trim()) {
      result = performSearch(searchQuery, result)
    }

    // Apply active filter
    if (activeFilter === 'urgent') {
      result = result.filter((item) => item.priority === 'high')
    } else if (activeFilter === 'voice') {
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

// Synchronize changes from navigation store to app store
if (typeof window !== 'undefined') {
  useNavigationStore.subscribe((navState) => {
    const current = useAppStore.getState()
    if (current.activeTab !== navState.activeTab) {
      useAppStore.setState({ activeTab: navState.activeTab })
    }
    if (current.searchQuery !== navState.searchQuery) {
      useAppStore.setState({ searchQuery: navState.searchQuery })
    }
  })
}
