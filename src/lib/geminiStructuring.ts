import { ProcessNoteOptions, StructuredResult } from '../types/ai'
import { generateGeminiContent, mockLocalStructuring, getAIProxyUrl } from './gemini'

const STRUCTURING_SYSTEM_INSTRUCTION = `Ты — интеллектуальный помощник для структурирования голосовых заметок и задач VoiceNotes AI.
Твоя задача — преобразовать поток мыслей пользователя в строго типизированный JSON.

Правила классификации:
1. entity_type:
   - "task", если в тексте содержится действие, обязательство, напоминание, поручение или намерение что-то выполнить.
   - "note", если это идея, наблюдение, конспект, тезисы мыслей или заметка на будущее без четкого действия.
2. title:
   - Емкий заголовок (не более 60 символов), отражающий суть.
3. description:
   - Очищенный, хорошо отформатированный текст без речевого мусора (э-э, ну, типа).
4. due_date:
   - Точный ISO 8601 штамп времени, если упомянут дедлайн или дата (отталкиваясь от переданной текущей даты). Иначе null.
5. priority:
   - "high" при наличии слов "критично", "важно", "горит".
   - "low" при явном указании низкого приоритета.
   - "medium" по умолчанию.
6. category_tag:
   - Тег категории с решеткой: #Работа, #Разработка, #Дизайн, #Аналитика, #Финансы, #Идеи, #Личное.
7. transcript_summary:
   - Краткая выжимка (1-2 предложения).
8. checklist:
   - Массив конкретных шагов/подзадач, если задачу можно разбить на шаги.`

export async function structureVoiceNote(
  rawTranscript: string,
  currentIsoDate?: string,
  options: ProcessNoteOptions = {}
): Promise<StructuredResult> {
  const cleanTranscript = rawTranscript.trim()
  if (!cleanTranscript) {
    return {
      entity_type: 'note',
      title: 'Пустая заметка',
      description: '',
      due_date: null,
      priority: 'medium',
      category_tag: '#Заметки',
      transcript_summary: '',
    }
  }

  const currentDate = currentIsoDate || new Date().toISOString()
  const userPrompt = `Текущая дата и время пользователя: ${currentDate}
Транскрипт аудио:
"""
${cleanTranscript}
"""

Сформируй валидный JSON согласно схеме.`

  if (!getAIProxyUrl()) return mockLocalStructuring(cleanTranscript, currentDate, options.mode || 'fast')
  {
    const rawJson = await generateGeminiContent(
      STRUCTURING_SYSTEM_INSTRUCTION,
      userPrompt,
      { ...options, currentIsoDate: currentDate }
    )

    const parsed = validateStructuredResult(JSON.parse(rawJson))
    // Ensure required fields have valid fallbacks
    return {
      entity_type: parsed.entity_type === 'task' ? 'task' : 'note',
      title: parsed.title || cleanTranscript.slice(0, 50),
      description: parsed.description || cleanTranscript,
      due_date: parsed.due_date || null,
      start_date: parsed.start_date,
      deadline: parsed.deadline,
      priority: parsed.priority || 'medium',
      category_tag: parsed.category_tag?.startsWith('#')
        ? parsed.category_tag
        : `#${parsed.category_tag || 'Работа'}`,
      transcript_summary: parsed.transcript_summary || cleanTranscript.slice(0, 100),
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : undefined,
    }
  }
}

export function validateStructuredResult(value: unknown): StructuredResult {
  if (!value || typeof value !== 'object') throw new Error('AI вернул некорректные данные')
  const record = value as Record<string, unknown>
  if (!['task', 'note'].includes(String(record.entity_type)) || !['low', 'medium', 'high'].includes(String(record.priority)) ||
      typeof record.title !== 'string' || !record.title.trim() || typeof record.category_tag !== 'string' ||
      typeof record.description !== 'string' || typeof record.transcript_summary !== 'string' ||
      record.checklist !== undefined && (!Array.isArray(record.checklist) || record.checklist.some((item) => typeof item !== 'string')) ||
      ['due_date', 'start_date', 'deadline'].some((key) => record[key] != null && (typeof record[key] !== 'string' || !Number.isFinite(new Date(record[key] as string).getTime())))) {
    throw new Error('AI вернул некорректные поля')
  }
  return record as unknown as StructuredResult
}
