import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getGeminiApiKey,
  mockLocalStructuring,
  generateGeminiContent,
} from '../gemini'
import { structureVoiceNote } from '../geminiStructuring'
import { refineStructuredNote } from '../geminiRefinement'

describe('Gemini AI Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('gemini client & mock fallback', () => {
    it('returns empty string if no api key in env', () => {
      expect(typeof getGeminiApiKey()).toBe('string')
    })

    it('mockLocalStructuring correctly parses action tasks', () => {
      const res = mockLocalStructuring(
        'Напомни срочно подготовить отчет по продуктовым метрикам Q3 завтра в 15:00',
        '2026-10-05T12:00:00.000Z',
        'fast'
      )
      expect(res.entity_type).toBe('task')
      expect(res.priority).toBe('high')
      expect(res.category_tag).toBe('#Аналитика')
      expect(res.due_date).toBeDefined()
      expect(res.title).toBeTruthy()
    })

    it('mockLocalStructuring correctly parses reflective notes', () => {
      const res = mockLocalStructuring(
        'Думаю над концепцией нового интерфейса и подбором шрифтовых пар',
        '2026-10-05T12:00:00.000Z',
        'fast'
      )
      expect(res.entity_type).toBe('note')
      expect(res.category_tag).toBe('#Дизайн')
      expect(res.priority).toBe('medium')
    })

    it('throws API_KEY_NOT_FOUND when calling generateGeminiContent without key', async () => {
      await expect(generateGeminiContent('system', 'user')).rejects.toThrow('API_KEY_NOT_FOUND')
    })
  })

  describe('structureVoiceNote', () => {
    it('handles empty transcript gracefully', async () => {
      const res = await structureVoiceNote('')
      expect(res.title).toBe('Пустая заметка')
      expect(res.entity_type).toBe('note')
    })

    it('falls back to mockLocalStructuring when API key is not set', async () => {
      const res = await structureVoiceNote('Сделать ревью архитектуры микросервисов')
      expect(res.entity_type).toBe('task')
      expect(res.category_tag).toBe('#Разработка')
      expect(res.title).toContain('Сделать ревью')
    })

    it('parses structured outputs from successful Gemini API response', async () => {
      // Mock fetch
      const mockResult = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    entity_type: 'task',
                    title: 'Согласовать бюджет',
                    description: 'Согласовать бюджет на AI API',
                    due_date: '2026-10-06T14:00:00.000Z',
                    priority: 'high',
                    category_tag: '#Финансы',
                    transcript_summary: 'Срочное согласование бюджета',
                    checklist: ['Собрать смету', 'Отправить финдиректору'],
                  }),
                },
              ],
            },
          },
        ],
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      })

      // Temporarily mock import.meta.env
      const origEnv = (import.meta as any).env?.VITE_GEMINI_API_KEY
      ;(import.meta as any).env = { ...(import.meta as any).env, VITE_GEMINI_API_KEY: 'test-key' }

      try {
        const res = await structureVoiceNote('Согласовать бюджет на AI API')
        expect(res.title).toBe('Согласовать бюджет')
        expect(res.priority).toBe('high')
        expect(res.category_tag).toBe('#Финансы')
        expect(res.checklist).toHaveLength(2)
      } finally {
        ;(import.meta as any).env = { ...(import.meta as any).env, VITE_GEMINI_API_KEY: origEnv }
      }
    })
  })

  describe('refineStructuredNote', () => {
    const baseItem = {
      entity_type: 'task' as const,
      title: 'Подготовить релиз',
      description: 'Подготовить релиз приложения',
      due_date: null,
      priority: 'medium' as const,
      category_tag: '#Разработка',
      transcript_summary: 'Релиз',
    }

    it('updates priority on feedback via local fallback', async () => {
      const updated = await refineStructuredNote(baseItem, 'Сделай высокий приоритет')
      expect(updated.priority).toBe('high')
    })

    it('adds checklist item on feedback via local fallback', async () => {
      const updated = await refineStructuredNote(baseItem, 'Добавь пункт: Проверить тесты')
      expect(updated.checklist).toContain('Проверить тесты')
    })

    it('renames title on feedback via local fallback', async () => {
      const updated = await refineStructuredNote(baseItem, 'Переименуй заголовок в "Финальный релиз v2.5"')
      expect(updated.title).toBe('Финальный релиз v2.5')
    })
  })
})
