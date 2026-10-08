import type { ProcessNoteOptions, StructuredResult } from '../types/ai'
import { api } from './api'
export async function structureVoiceNote(rawTranscript: string, currentIsoDate?: string, options: ProcessNoteOptions = {}): Promise<StructuredResult> {
  if (!rawTranscript.trim()) throw new Error('Введите текст заметки')
  const { result } = await api<{ result: StructuredResult }>('/ai/structure', { method: 'POST', body: JSON.stringify({ text: rawTranscript.trim(), mode: options.mode || 'fast', style: options.style || 'concise', currentIsoDate: currentIsoDate || new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) })
  return validateStructuredResult(result)
}
export function validateStructuredResult(value: unknown): StructuredResult {
  if (!value || typeof value !== 'object') throw new Error('AI вернул некорректные данные')
  const record = value as Record<string, unknown>
  if (record.estimated_minutes !== undefined && (typeof record.estimated_minutes !== 'number' || !Number.isFinite(record.estimated_minutes) || record.estimated_minutes <= 0 || record.estimated_minutes > 525600)) throw new Error('AI вернул некорректную длительность')
  if (!['low', 'medium', 'high'].includes(String(record.priority)) || typeof record.title !== 'string' || !record.title.trim() || typeof record.category_tag !== 'string' || typeof record.description !== 'string' || typeof record.transcript_summary !== 'string' || record.checklist !== undefined && (!Array.isArray(record.checklist) || record.checklist.some(item => typeof item !== 'string')) || ['due_date', 'start_date', 'deadline'].some(key => record[key] != null && (typeof record[key] !== 'string' || !Number.isFinite(Date.parse(record[key] as string))))) throw new Error('AI вернул некорректные поля')
  return record as unknown as StructuredResult
}
