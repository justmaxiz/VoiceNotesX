import { describe, it, expect, vi } from 'vitest'
import {
  generateNoteMarkdown,
  slugify,
  exportNoteAsMarkdown,
  exportDatabaseAsJson,
} from '../export'
import { Item } from '../../types/item'

describe('Export Utilities (TASK-30)', () => {
  const sampleNote: Item = {
    id: 'note-1',
    type: 'note',
    title: 'Архитектура микросервисов',
    description: 'Тезисы по масштабированию и отказоустойчивости.',
    transcriptText: 'Записано на утреннем стендапе',
    categoryTag: '#Разработка',
    priority: 'high',
    status: 'in_progress',
    isFocus: true,
    checklist: [
      { id: 'chk-1', text: 'Проверить gRPC', isCompleted: true, sortOrder: 1 },
      { id: 'chk-2', text: 'Настроить мониторинг', isCompleted: false, sortOrder: 2 },
    ],
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
  }

  it('slugify handles Cyrillic and special characters', () => {
    expect(slugify('Архитектура микросервисов 2026!')).toBe('архитектура-микросервисов-2026')
  })

  it('generates valid Markdown with YAML frontmatter', () => {
    const md = generateNoteMarkdown(sampleNote)
    expect(md).toContain('---')
    expect(md).toContain('title: "Архитектура микросервисов"')
    expect(md).toContain('category: "#Разработка"')
    expect(md).toContain('priority: "high"')
    expect(md).toContain('# Архитектура микросервисов')
    expect(md).toContain('> **Голосовая расшифровка:**')
    expect(md).toContain('- [x] Проверить gRPC')
    expect(md).toContain('- [ ] Настроить мониторинг')
  })

  it('triggers download for markdown note without crashing', () => {
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      setAttribute: vi.fn(),
      style: {},
    } as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test')
    globalThis.URL.revokeObjectURL = vi.fn()

    exportNoteAsMarkdown(sampleNote)
    expect(clickSpy).toHaveBeenCalled()

    exportDatabaseAsJson([sampleNote])
    expect(clickSpy).toHaveBeenCalledTimes(2)
  })
})
