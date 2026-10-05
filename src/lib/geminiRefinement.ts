import { ProcessNoteOptions, StructuredResult } from '../types/ai'
import { generateGeminiContent } from './gemini'

const REFINEMENT_SYSTEM_INSTRUCTION = `Ты — ИИ-ассистент в VoiceNotes AI.
Пользователь передает существующий структурированный JSON объект заметки/задачи и текстовую инструкцию с правками.
Твоя задача — вернуть обновленный JSON объект с сохранением структуры схемы, применив все пожелания пользователя.`

export async function refineStructuredNote(
  currentData: StructuredResult,
  userFeedback: string,
  options: ProcessNoteOptions = {}
): Promise<StructuredResult> {
  const feedback = userFeedback.trim()
  if (!feedback) return currentData

  const userPrompt = `У тебя есть существующий JSON объект:
${JSON.stringify(currentData, null, 2)}

Пользователь хочет внести изменения:
"${feedback}"

Обнови JSON объект с сохранением структуры схемы.`

  try {
    const rawJson = await generateGeminiContent(
      REFINEMENT_SYSTEM_INSTRUCTION,
      userPrompt,
      options
    )
    const parsed = JSON.parse(rawJson) as StructuredResult
    return {
      entity_type: parsed.entity_type === 'task' ? 'task' : 'note',
      title: parsed.title || currentData.title,
      description: parsed.description || currentData.description,
      due_date: parsed.due_date !== undefined ? parsed.due_date : currentData.due_date,
      priority: parsed.priority || currentData.priority,
      category_tag: parsed.category_tag?.startsWith('#')
        ? parsed.category_tag
        : `#${parsed.category_tag || currentData.category_tag.replace('#', '')}`,
      transcript_summary: parsed.transcript_summary || currentData.transcript_summary,
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : currentData.checklist,
    }
  } catch {
    // Local heuristic refinement fallback
    const lower = feedback.toLowerCase()
    const updated = { ...currentData }

    if (lower.includes('высокий') || lower.includes('срочно')) {
      updated.priority = 'high'
    } else if (lower.includes('низкий')) {
      updated.priority = 'low'
    } else if (lower.includes('средний')) {
      updated.priority = 'medium'
    }

    if (lower.includes('задач') || lower.includes('таск')) {
      updated.entity_type = 'task'
    } else if (lower.includes('заметк')) {
      updated.entity_type = 'note'
    }

    if (lower.includes('добавь пункт') || lower.includes('добавь в чек-лист') || lower.includes('добавь шаг')) {
      const match = feedback.match(/добавь (?:пункт|в чек-лист|шаг)\s*[:«"']?\s*(.+?)[»"']?$/i)
      const newItem = match ? match[1].trim() : feedback.replace(/добавь (?:пункт|в чек-лист|шаг)/i, '').trim()
      if (newItem) {
        updated.checklist = [...(updated.checklist || []), newItem]
      }
    }

    if (lower.includes('переименуй') || lower.includes('заголовок')) {
      const match = feedback.match(/(?:переименуй(?:\s+заголовок)?|заголовок)\s*(?:в|на)?\s*[:«"']?\s*(.+?)[»"']?$/i)
      if (match && match[1]) {
        updated.title = match[1].replace(/^[«"']|[»"']$/g, '').trim()
      }
    }

    return updated
  }
}
