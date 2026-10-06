import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAIProxyUrl,
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
    it('returns empty string if no proxy in env', () => {
      expect(typeof getAIProxyUrl()).toBe('string')
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

    it('marks tasks described as ASAP as high priority', () => {
      const res = mockLocalStructuring('Please fix the login bug ASAP')
      expect(res.entity_type).toBe('task')
      expect(res.priority).toBe('high')
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

    it('throws AI_PROXY_NOT_CONFIGURED when calling generateGeminiContent without proxy', async () => {
      await expect(generateGeminiContent('system', 'user')).rejects.toThrow('AI_PROXY_NOT_CONFIGURED')
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
        json: async () => ({ text: mockResult.candidates[0].content.parts[0].text }),
      })

      vi.stubEnv('VITE_AI_PROXY_URL', 'https://example.com/ai')

      try {
        const res = await structureVoiceNote('Согласовать бюджет на AI API')
        expect(res.title).toBe('Согласовать бюджет')
        expect(res.priority).toBe('high')
        expect(res.category_tag).toBe('#Финансы')
        expect(res.checklist).toHaveLength(2)
      } finally {
        vi.unstubAllEnvs()
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
