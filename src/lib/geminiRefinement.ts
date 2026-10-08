import type { ProcessNoteOptions, StructuredResult } from '../types/ai'
import { structureVoiceNote } from './geminiStructuring'
export async function refineStructuredNote(currentData: StructuredResult, userFeedback: string, options: ProcessNoteOptions = {}): Promise<StructuredResult> {
  if (!userFeedback.trim()) return currentData
  return structureVoiceNote(`Обнови заметку по инструкции пользователя. Текущая заметка: ${JSON.stringify(currentData)}\nИнструкция: ${userFeedback}`, options.currentIsoDate, options)
}
