import { AIMode, ProcessNoteOptions, StructuredResult } from '../types/ai'

// Optional existing server endpoint; API credentials never enter the browser bundle.
export const getAIProxyUrl = (): string => import.meta.env.VITE_AI_PROXY_URL || ''

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    entity_type: { type: 'STRING', enum: ['task', 'note'] },
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    due_date: { type: 'STRING', nullable: true },
    priority: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    category_tag: { type: 'STRING' },
    transcript_summary: { type: 'STRING' },
    checklist: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: ['entity_type', 'title', 'priority', 'category_tag'],
}

/**
 * Local mock heuristics engine when API key is unavailable or upon network failure
 */
export function mockLocalStructuring(
  transcript: string,
  currentIsoDate?: string,
  mode: AIMode = 'fast'
): StructuredResult {
  const clean = transcript.trim()
  const lower = clean.toLowerCase()

  // Detect entity type
  const isTask =
    /(напомни|сделать|подготовить|согласовать|позвонить|написать|запустить|купить|проверить|отправить|таск|задач|todo|fix|bug)/i.test(
      lower
    )
  const entity_type: 'task' | 'note' = isTask ? 'task' : 'note'

  // Priority detection
  let priority: 'low' | 'medium' | 'high' = 'medium'
  if (/(срочн|асап|asap|важн|критичн|горит|блок|priority:?\s*high)/i.test(lower)) {
    priority = 'high'
  } else if (/(не к спеху|позже|когда-нибудь|низк|low)/i.test(lower)) {
    priority = 'low'
  }

  // Category detection
  let category_tag = '#Работа'
  if (/(аналитик|метрик|отчет|график|воронк|кпи|kpi|q[1-4])/i.test(lower)) {
    category_tag = '#Аналитика'
  } else if (/(дизайн|макет|фигм|figma|ux|ui|цвета|типографик|шрифт|интерфейс)/i.test(lower)) {
    category_tag = '#Дизайн'
  } else if (/(разработк|код|бэкенд|фронтенд|микросервис|рефактор|api|pr\b|github)/i.test(lower)) {
    category_tag = '#Разработка'
  } else if (/(финанс|бюджет|счет|оплат|деньги|инвестор|кост)/i.test(lower)) {
    category_tag = '#Финансы'
  } else if (!isTask) {
    category_tag = '#Идеи'
  }

  // Title extraction: first line or first 8-10 words
  const firstSentence = clean.split(/[.!?\n]/)[0] || clean
  let title = firstSentence.trim()
  if (title.length > 70) {
    const words = title.split(' ').slice(0, 8)
    title = words.join(' ') + '...'
  }
  if (!title) {
    title = isTask ? 'Новая задача' : 'Новая заметка'
  }

  // Due date parsing
  let due_date: string | null = null
  const baseDate = currentIsoDate ? new Date(currentIsoDate) : new Date()

  if (/завтра/i.test(lower)) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + 1)
    if (/в\s*(\d{1,2})(:(\d{2}))?/i.test(lower)) {
      const match = lower.match(/в\s*(\d{1,2})(:(\d{2}))?/)
      if (match) {
        d.setHours(parseInt(match[1], 10), match[3] ? parseInt(match[3], 10) : 0, 0, 0)
      }
    } else {
      d.setHours(18, 0, 0, 0)
    }
    due_date = d.toISOString()
  } else if (/сегодня/i.test(lower)) {
    const d = new Date(baseDate)
    if (/в\s*(\d{1,2})(:(\d{2}))?/i.test(lower)) {
      const match = lower.match(/в\s*(\d{1,2})(:(\d{2}))?/)
      if (match) {
        d.setHours(parseInt(match[1], 10), match[3] ? parseInt(match[3], 10) : 0, 0, 0)
      }
    } else {
      d.setHours(21, 0, 0, 0)
    }
    due_date = d.toISOString()
  } else if (isTask) {
    const d = new Date(baseDate)
    d.setHours(19, 0, 0, 0)
    due_date = d.toISOString()
  }

  // Checklist extraction
  const checklist: string[] = []
  const lines = clean.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[-*•\d+.]\s*(.+)/.test(trimmed)) {
      const text = trimmed.replace(/^[-*•\d+.]\s*/, '').trim()
      if (text) checklist.push(text)
    }
  }

  // In deep mode with tasks, enrich checklist if none found
  if (checklist.length === 0 && isTask && mode === 'deep') {
    checklist.push('Собрать вводные данные и требования')
    checklist.push('Реализовать и согласовать с командой')
    checklist.push('Финальная проверка и закрытие задачи')
  }

  return {
    entity_type,
    title,
    description: clean,
    due_date,
    priority,
    category_tag,
    transcript_summary:
      clean.length > 120 ? clean.substring(0, 117) + '...' : clean,
    checklist: checklist.length > 0 ? checklist : undefined,
  }
}

/**
 * Call Gemini Flash API or fallback
 */
export async function generateGeminiContent(
  systemInstruction: string,
  userPrompt: string,
  options: ProcessNoteOptions = {}
): Promise<string> {
  const endpoint = getAIProxyUrl()
  if (!endpoint) throw new Error('AI_PROXY_NOT_CONFIGURED')
  const url = new URL(endpoint, window.location.origin)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('AI endpoint должен использовать HTTPS (HTTP доступен только на localhost)')
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(url.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ systemInstruction, userPrompt, mode: options.mode || 'fast', style: options.style || 'concise', responseSchema: RESPONSE_SCHEMA }),
    })
    if (!response.ok) throw new Error(`AI endpoint: ${response.status}`)
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object' || !('text' in data) || typeof data.text !== 'string') throw new Error('Некорректный ответ AI endpoint')
    return data.text
  } finally { clearTimeout(timeout) }
}
