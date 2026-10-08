import { describe, it, expect, vi, afterEach } from 'vitest'
import { structureVoiceNote, validateStructuredResult } from '../geminiStructuring'
import { refineStructuredNote } from '../geminiRefinement'
import { RESPONSE_SCHEMA } from '../gemini'
const result = { title: 'Тестовая заметка', description: 'Текст', priority: 'high', category_tag: '#Работа', transcript_summary: 'Текст', due_date: '2026-10-10' }
afterEach(() => vi.restoreAllMocks())
describe('Server AI client', () => {
  it.each([0, -1, 525601, Infinity, '120', null])('rejects invalid duration %s', estimated_minutes => expect(() => validateStructuredResult({ ...result, estimated_minutes })).toThrow())
  it('rejects empty input before requesting the provider', async () => { const request = vi.spyOn(globalThis, 'fetch'); await expect(structureVoiceNote(' ')).rejects.toThrow('Введите текст'); expect(request).not.toHaveBeenCalled() })
  it('sends preferences and date context to our authenticated API', async () => { const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result }))); expect(await structureVoiceNote('Исходный текст', '2026-10-07T12:00:00Z', { mode: 'deep', style: 'action_plan' })).toEqual(result); expect(request.mock.calls[0][0]).toBe('/api/v1/ai/structure'); expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toMatchObject({ text: 'Исходный текст', mode: 'deep', style: 'action_plan' }); expect(request.mock.calls[0][1]?.headers).toHaveProperty('Authorization') })
  it('keeps provider errors visible without local heuristics', async () => { vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'AI_TIMEOUT', message: 'Таймаут' } }), { status: 504 })); await expect(structureVoiceNote('Текст')).rejects.toThrow('Таймаут') })
  it.each([{}, { ...result, title: '' }, { ...result, deadline: 'invalid' }, { ...result, checklist: [12] }])('rejects invalid output %#', value => expect(() => validateStructuredResult(value)).toThrow())
  it('does not expose entity_type in the JSON schema', () => { expect(RESPONSE_SCHEMA.properties).not.toHaveProperty('entity_type'); expect(RESPONSE_SCHEMA.properties).toHaveProperty('start_date'); expect(RESPONSE_SCHEMA.properties).toHaveProperty('deadline') })
  it('refines through the same server API', async () => { vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: { ...result, title: 'Новый заголовок' } }))); expect((await refineStructuredNote(result as never, 'Переименуй')).title).toBe('Новый заголовок') })
})
