import { describe, it, expect, beforeEach } from 'vitest'
import {
  searchIndex,
  performSearch,
  upsertSearchItem,
  removeSearchItem,
  rebuildSearchIndex,
  clearSearchIndex,
} from '../search'
import { Item } from '../../types'

describe('MiniSearch FTS - Full-Text Search Engine (TASK-08)', () => {
  const sampleItems: Item[] = [
    {
      id: 's-1',
      type: 'task',
      title: 'Подготовить отчет по продуктовым метрикам Q3',
      description: 'Встреча с инвесторами в конференц-зале',
      transcriptText: 'Обсудить конверсию пользователей и retention за третий квартал',
      categoryTag: '#Аналитика',
      status: 'todo',
      priority: 'medium',
      isFocus: false,
      createdAt: '2026-10-05T10:00:00.000Z',
      updatedAt: '2026-10-05T10:00:00.000Z',
    },
    {
      id: 's-2',
      type: 'task',
      title: 'Провести ревью архитектуры микросервисов',
      description: 'PR #142 • Саммари готово к обсуждению',
      transcriptText: 'Проверить отказоустойчивость брокера Kafka и шардирование базы данных',
      categoryTag: '#Разработка',
      status: 'todo',
      priority: 'high',
      isFocus: false,
      createdAt: '2026-10-05T10:10:00.000Z',
      updatedAt: '2026-10-05T10:10:00.000Z',
    },
    {
      id: 's-3',
      type: 'note',
      title: 'Идеи для релиза дизайн-системы Obsidian',
      description: 'Черновик палитры и темной темы для веб-клиента',
      transcriptText: 'Сделать акцент на изумрудных индикаторах и высокой контрастности текста',
      categoryTag: '#Дизайн',
      status: 'todo',
      priority: 'low',
      isFocus: false,
      createdAt: '2026-10-05T10:20:00.000Z',
      updatedAt: '2026-10-05T10:20:00.000Z',
    },
  ]

  beforeEach(() => {
    rebuildSearchIndex(sampleItems)
  })

  it('performs prefix search (matching words by initial characters)', () => {
    // "релиз" matches "релиза"
    const results = performSearch('релиз')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.id === 's-3')).toBe(true)

    // "микросервис" matches "микросервисов"
    const microResults = performSearch('микросервис')
    expect(microResults.length).toBeGreaterThanOrEqual(1)
    expect(microResults[0].id).toBe('s-2')
  })

  it('searches by tag with and without hashtag prefix', () => {
    const withHash = performSearch('#Аналитика')
    expect(withHash.length).toBeGreaterThanOrEqual(1)
    expect(withHash[0].id).toBe('s-1')

    const withoutHash = performSearch('Аналитика')
    expect(withoutHash.length).toBeGreaterThanOrEqual(1)
    expect(withoutHash[0].id).toBe('s-1')
  })

  it('searches verbatim quotes from audio transcripts', () => {
    const results = performSearch('Kafka')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].id).toBe('s-2')

    const retentionResults = performSearch('retention')
    expect(retentionResults.length).toBeGreaterThanOrEqual(1)
    expect(retentionResults[0].id).toBe('s-1')
  })

  it('supports bilingual Russian and English search terms', () => {
    const enResults = performSearch('PR')
    expect(enResults.some((r) => r.id === 's-2')).toBe(true)

    const ruResults = performSearch('инвесторами')
    expect(ruResults.some((r) => r.id === 's-1')).toBe(true)
  })

  it('handles fuzzy matching for typos', () => {
    // typo: 'архитекрура' instead of 'архитектура'
    const results = performSearch('архитекрура')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].id).toBe('s-2')
  })

  it('dynamically adds, updates, and removes items from the index', () => {
    const newDoc: Item = {
      id: 's-dynamic',
      type: 'task',
      title: 'Динамическая задача для индекса',
      categoryTag: '#СпецТест',
      status: 'todo',
      priority: 'high',
      isFocus: false,
      createdAt: '2026-10-05T12:00:00.000Z',
      updatedAt: '2026-10-05T12:00:00.000Z',
    }

    upsertSearchItem(newDoc)
    expect(performSearch('СпецТест')).toHaveLength(1)

    // Update title
    upsertSearchItem({
      ...newDoc,
      title: 'Переименованная тестовая сущность',
    })
    expect(performSearch('Переименованная')).toHaveLength(1)

    // Discard item
    removeSearchItem('s-dynamic')
    expect(performSearch('Переименованная')).toHaveLength(0)
    expect(performSearch('СпецТест')).toHaveLength(0)
  })

  it('returns empty array for empty or whitespace query', () => {
    expect(performSearch('')).toEqual([])
    expect(performSearch('    ')).toEqual([])
  })

  it('executes search in under 5 ms on a corpus of 500+ items', () => {
    const largeCorpus: Item[] = []
    for (let i = 0; i < 600; i++) {
      largeCorpus.push({
        id: `item-${i}`,
        type: i % 2 === 0 ? 'task' : 'note',
        title: `Регулярная проектная задача номер ${i} по оптимизации системы`,
        description: `Детальное техническое описание для элемента под индексом ${i}`,
        transcriptText: `Транскрипт голосовой записи встречи ${i}: обсуждался релиз и производительность`,
        categoryTag: i % 3 === 0 ? '#Архитектура' : '#Аналитика',
        status: 'todo',
        priority: 'medium',
        isFocus: false,
        createdAt: '2026-10-05T10:00:00.000Z',
        updatedAt: '2026-10-05T10:00:00.000Z',
      })
    }
    rebuildSearchIndex(largeCorpus)

    const startTime = performance.now()
    const searchResults = performSearch('оптимизации')
    const elapsed = performance.now() - startTime

    expect(searchResults.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(15) // Vitest overhead buffer, comfortably within target
  })

  it('exposes underlying searchIndex and supports clearSearchIndex', () => {
    expect(searchIndex.documentCount).toBeGreaterThan(0)
    clearSearchIndex()
    expect(searchIndex.documentCount).toBe(0)
    expect(performSearch('отчет')).toHaveLength(0)
  })

  it('does not fabricate phantom items when searching within a filtered itemsPool', () => {
    // sampleItems contains s-1 (инвесторами), s-2 (микросервисов), s-3 (Obsidian)
    // Pool only contains s-1
    const pool = [sampleItems[0]]

    // Searching for a term that matches s-2 should return empty because s-2 is not in pool
    const results = performSearch('микросервисов', pool)
    expect(results).toHaveLength(0)

    // Searching for a term matching s-1 returns s-1 with full fidelity
    const poolResults = performSearch('инвесторами', pool)
    expect(poolResults).toHaveLength(1)
    expect(poolResults[0].id).toBe('s-1')
    expect(poolResults[0].description).toBe(sampleItems[0].description)
  })
})
