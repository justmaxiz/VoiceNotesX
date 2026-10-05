import MiniSearch from 'minisearch'
import { Item } from '../types'

export const searchIndex = new MiniSearch<Item>({
  fields: ['title', 'description', 'transcriptText', 'categoryTag'],
  storeFields: ['id', 'title', 'type', 'status', 'categoryTag'],
  searchOptions: {
    boost: { title: 2, categoryTag: 1.5 },
    prefix: true,
    fuzzy: 0.2,
  },
})

// Local in-memory item cache to resolve full Item entities from search results
const itemStore = new Map<string, Item>()

export function upsertSearchItem(item: Item): void {
  itemStore.set(item.id, item)
  if (searchIndex.has(item.id)) {
    searchIndex.replace(item)
  } else {
    searchIndex.add(item)
  }
}

export function removeSearchItem(id: string): void {
  itemStore.delete(id)
  if (searchIndex.has(id)) {
    searchIndex.discard(id)
  }
}

export function rebuildSearchIndex(items: Item[]): void {
  searchIndex.removeAll()
  itemStore.clear()
  if (items.length > 0) {
    items.forEach((item) => itemStore.set(item.id, item))
    searchIndex.addAll(items)
  }
}

export function clearSearchIndex(): void {
  searchIndex.removeAll()
  itemStore.clear()
}

export function performSearch(query: string, itemsPool?: Item[]): Item[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const searchResults = searchIndex.search(trimmed)
  const poolMap = itemsPool ? new Map(itemsPool.map((i) => [i.id, i])) : itemStore

  const matchedItems: Item[] = []
  for (const res of searchResults) {
    const fullItem = poolMap.get(res.id)
    if (fullItem) {
      matchedItems.push(fullItem)
    }
  }

  return matchedItems
}
