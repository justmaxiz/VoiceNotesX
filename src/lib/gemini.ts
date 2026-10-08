import { api, apiUrl } from './api'
import type { ProcessNoteOptions, StructuredResult } from '../types/ai'
import { structuredSchema } from '../../server/src/contracts'
export const RESPONSE_SCHEMA = structuredSchema
export const getAIProxyUrl = () => apiUrl('/ai/structure')
export async function generateGeminiContent(systemInstruction: string, userPrompt: string, options: ProcessNoteOptions = {}): Promise<string> {
  const { result } = await api<{ result: StructuredResult }>('/ai/structure', { method: 'POST', body: JSON.stringify({ text: `${systemInstruction}\n${userPrompt}`, mode: options.mode || 'fast', style: options.style || 'concise', currentIsoDate: options.currentIsoDate || new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) })
  return JSON.stringify(result)
}
