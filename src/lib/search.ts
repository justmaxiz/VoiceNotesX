import MiniSearch from 'minisearch'
import { Item } from '../types'

export const searchIndex = new MiniSearch<Item>({
  fields: ['title', 'description', 'transcriptText', 'categoryTag', 'tags'],
  storeFields: ['id', 'title', 'type', 'status', 'categoryTag'],
  searchOptions: {
    boost: { title: 2, categoryTag: 1.5, tags: 1.5 },
    prefix: true,
    fuzzy: 0.2,
    combineWith: 'OR',
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

export interface SearchHit {
  item: Item
  score: number
  terms: string[]
  fields: string[]
}

export interface SearchSnippet {
  text: string
  terms: string[]
}

export function performSearchWithMatches(query: string, itemsPool?: Item[]): SearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const searchResults = searchIndex.search(trimmed, { combineWith: 'OR' })
  const poolMap = itemsPool ? new Map(itemsPool.map((i) => [i.id, i])) : itemStore

  const matchedItems: SearchHit[] = []
  for (const res of searchResults) {
    const fullItem = poolMap.get(res.id)
    if (fullItem) {
      matchedItems.push({
        item: fullItem,
        score: res.score,
        terms: res.terms,
        fields: [...new Set(Object.values(res.match).flat())],
      })
    }
  }

  return matchedItems
}

export function performSearch(query: string, itemsPool?: Item[]): Item[] {
  return performSearchWithMatches(query, itemsPool).map(({ item }) => item)
}

export function createSearchSnippet(hit: SearchHit, maxLength = 140): SearchSnippet {
  const { item, fields, terms } = hit
  const fieldValues: Record<string, string | undefined> = {
    description: item.description,
    transcriptText: item.transcriptText,
    title: item.title,
    categoryTag: item.categoryTag,
    tags: item.tags?.join(', '),
  }
  const fieldOrder = ['description', 'transcriptText', 'title', 'categoryTag', 'tags']
  const field = fieldOrder.find((candidate) => fields.includes(candidate) && fieldValues[candidate])
    || fieldOrder.find((candidate) => fieldValues[candidate])
  const text = field ? fieldValues[field]!.trim() : item.title
  const lowerText = text.toLowerCase()
  const matchIndex = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0]

  if (text.length <= maxLength || matchIndex === undefined) {
    return { text: text.slice(0, maxLength), terms }
  }

  const contextBefore = Math.floor(maxLength * 0.35)
  const start = Math.max(0, Math.min(matchIndex - contextBefore, text.length - maxLength))
  const end = Math.min(text.length, start + maxLength)
  const snippet = `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
  return { text: snippet, terms }
}
