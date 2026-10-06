import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import { unzipSync, strFromU8 } from 'fflate'
import { db } from '../lib/db'
import { audioPlaybackUrl, releaseAudioUrl } from '../lib/audioPersistence'
import { createNotesZip, exportAllNotesAsMarkdown } from '../lib/export'
import { generateDigestData } from '../lib/dailyDigestScheduler'
import { useSettingsStore } from '../store/useSettingsStore'
import { useAppStore } from '../store/useAppStore'
import { tasksForToday } from '../lib/taskDates'
import { Item } from '../types/item'

const item = (id: string, patch: Partial<Item> = {}): Item => ({ id, type: 'task', title: id, categoryTag: '#Work', status: 'todo', priority: 'medium', isFocus: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...patch })
beforeEach(async () => {
  await db.clearDatabase()
  localStorage.clear()
  useAppStore.getState().setItems([])
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 10, 12))
  URL.createObjectURL = vi.fn(() => `blob:${crypto.randomUUID()}`)
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('Persistent audio and real local data', () => {
  it('date-only schedules retain absent clock through store, database, updates and reload', async () => {
    await useAppStore.getState().addItem(item('date-only', { dueDate: '2026-10-10' }))
    const original = (await db.getItem('date-only'))!
    expect(original.dueTime).toBeNull()
    expect(new Date(original.deadline!).getHours()).toBe(23)
    expect(new Date(original.deadline!).getSeconds()).toBe(59)
    await useAppStore.getState().updateItem('date-only', { description: 'Keep schedule', estimatedMinutes: 30 })
    useAppStore.getState().setItems([])
    localStorage.setItem('voicenotes_seeded', 'true')
    await useAppStore.getState().loadItems()
    expect(useAppStore.getState().items[0]).toMatchObject({ dueDate: '2026-10-10', dueTime: null, deadline: original.deadline })
    expect((await db.getItem('date-only'))?.dueTime).toBeNull()
  })
  it('stores Blob atomically, recreates playback after reload and revokes old URL', async () => {
    const blob = new NodeBlob(['recorded-audio'], { type: 'audio/webm' }) as unknown as Blob
    await useAppStore.getState().addItem(item('audio'), { blob, duration: 42 })
    const stored = (await db.getItem('audio'))!
    expect(stored.audioUrl).toBeUndefined()
    expect(stored.audioDuration).toBe(42)
    expect(await (await db.getAudioSession('audio'))?.audioBlob?.text()).toBe('recorded-audio')
    const first = useAppStore.getState().items[0].audioUrl
    useAppStore.getState().setItems([])
    localStorage.setItem('voicenotes_seeded', 'true')
    await useAppStore.getState().loadItems()
    expect(useAppStore.getState().items[0].audioUrl).toMatch(/^blob:/)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first)
    releaseAudioUrl('audio')
    expect(await audioPlaybackUrl('audio')).toMatch(/^blob:/)
  })
  it('audio-write failure leaves neither item nor audio persisted', async () => {
    vi.spyOn(db.audioSessions, 'put').mockRejectedValueOnce(new Error('Quota'))
    const blob = new NodeBlob(['audio']) as unknown as Blob
    await expect(useAppStore.getState().addItem(item('fail'), { blob, duration: 5 })).rejects.toThrow('Quota')
    expect(await db.items.count()).toBe(0)
    expect(await db.audioSessions.count()).toBe(0)
    expect(useAppStore.getState().items).toEqual([])
  })
  it('ZIP contains real Markdown and original audio with collision-free filenames', async () => {
    const rows = [item('one', { title: 'Task' }), item('two', { title: 'Task' }), item('three', { title: 'Task-2' })]
    await db.createItem(rows[0], { blob: new NodeBlob(['audio-bytes'], { type: 'audio/ogg' }) as unknown as Blob, duration: 3 })
    const bytes = await createNotesZip(rows)
    expect(Array.from(bytes.slice(0, 4))).toEqual([80, 75, 3, 4])
    const files = unzipSync(bytes)
    expect(Object.keys(files).filter((name) => name.endsWith('.md'))).toHaveLength(3)
    expect(strFromU8(files['task.md'])).toContain('# Task')
    expect(strFromU8(files['audio/task.ogg'])).toBe('audio-bytes')
  })
  it('combined Markdown download has markdown extension and MIME, not a text file bundle', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    exportAllNotesAsMarkdown([item('one')])
    const anchor = click.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.download).toMatch(/\.md$/)
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(blob.type).toContain('text/markdown')
  })
  it('daily and weekly counts use actual periods and completedAt', () => {
    const today = new Date(2026, 9, 10, 10).toISOString()
    const yesterday = new Date(2026, 9, 9, 10).toISOString()
    const old = new Date(2026, 8, 1, 10).toISOString()
    const rows = [item('today', { status: 'completed', completedAt: today }), item('yesterday', { status: 'completed', completedAt: yesterday }), item('old', { status: 'completed', completedAt: old }), item('archived', { status: 'archived', deadline: today }), item('note', { type: 'note' }), item('future', { deadline: new Date(2026, 9, 11, 10).toISOString() })]
    expect(generateDigestData('today', rows).achievements[0]).toBe('Завершено задач: 1')
    expect(generateDigestData('weekly', rows).achievements[0]).toBe('Завершено задач: 2')
    expect(tasksForToday(rows).map((row) => row.id)).toEqual(['today'])
    expect(generateDigestData('today', []).rawText).toContain('завершено 0 задач')
  })
  it('preference cleanup preserves other apps, reports and deletion/seed state', async () => {
    localStorage.setItem('unrelated-app', 'keep')
    localStorage.setItem('voicenotes_ai_summaries', 'reports')
    localStorage.setItem('voicenotes_seeded', 'true')
    localStorage.setItem('voicenotes_task_sort', 'cache')
    await useSettingsStore.getState().clearCache()
    expect(localStorage.getItem('unrelated-app')).toBe('keep')
    expect(localStorage.getItem('voicenotes_ai_summaries')).toBe('reports')
    expect(localStorage.getItem('voicenotes_seeded')).toBe('true')
    expect(localStorage.getItem('voicenotes_task_sort')).toBeNull()
  })
  it.each(['Asia/Dubai', 'America/New_York'])('local clocks and dates round-trip independently of runner timezone: %s', (zone) => {
    const source = readFileSync('src/lib/taskDates.ts', 'utf8')
    const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
    const script = `${js}
const result = normalizeTaskDates({ dueDate: '2026-10-10', dueTime: '00:30' }); console.log(JSON.stringify({hour: new Date(result.deadline).getHours(), key: localDateKey(new Date(result.deadline)), roundtrip: normalizeTaskDates({deadline: result.deadline}).dueTime}));`
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: zone }, encoding: 'utf8' })
    expect(child.status, child.stderr).toBe(0)
    expect(JSON.parse(child.stdout)).toEqual({ hour: 0, key: '2026-10-10', roundtrip: '00:30' })
  })
})
