import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db'
import { localMigrationCount, migrateLocalData } from '../migration'
import { SEED_ITEMS } from '../seedData'
import type { Item } from '../../types/item'
const row: Item = {
  id: 'legacy',
  type: 'note',
  title: 'Локальная запись',
  transcriptText: 'Исходный текст',
  categoryTag: '#Тест',
  status: 'completed',
  priority: 'high',
  isFocus: false,
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-02T12:00:00Z',
  completedAt: '2026-10-02T12:00:00Z',
}
beforeEach(async () => {
  await db.clearDatabase()
})
afterEach(() => vi.restoreAllMocks())
describe('Local account migration', () => {
  it.each([
    ['date only', '2026-10-01', '2026-10-01T00:00:00.000Z'],
    ['local time', '2026-10-01T12:00:00', new Date('2026-10-01T12:00:00').toISOString()],
    ['offset', '2026-10-01T12:00:00+04:00', '2026-10-01T08:00:00.000Z'],
    ['timestamp', Date.parse(row.createdAt), '2026-10-01T12:00:00.000Z'],
    ['Date object', new Date(row.createdAt), '2026-10-01T12:00:00.000Z'],
    ['empty', '', undefined],
    ['null', null, undefined],
    ['missing', undefined, undefined],
  ])('normalizes legacy %s timestamps before importing', async (_label, value, expected) => {
    const legacy = Object.assign({}, row, {
      createdAt: value, updatedAt: value, completedAt: value,
    }) as unknown as Item
    await db.items.put(legacy)
    const startedAt = Date.now()
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const note = JSON.parse(init!.body as string).notes[0].note
      for (const field of ['createdAt', 'updatedAt', 'completedAt']) {
        if (expected !== undefined) expect(note[field]).toBe(expected)
        else {
          expect(new Date(note[field]).toISOString()).toBe(note[field])
          expect(Date.parse(note[field])).toBeGreaterThanOrEqual(startedAt)
          expect(Date.parse(note[field])).toBeLessThanOrEqual(Date.now())
        }
      }
      expect(await db.items.get(row.id)).toBeDefined()
      return new Response(JSON.stringify({
        count: 1, notes: [{ legacyId: row.id, note: { id: 'remote-id' } }],
      }))
    }))
    await migrateLocalData(() => {})
    expect(await db.items.get(row.id)).toBeUndefined()
  })
  it.each(['createdAt', 'updatedAt', 'completedAt'])('recovers an unreadable %s and retains the source until acknowledgement', async (field) => {
    await db.items.put({ ...row, [field]: 'not-a-date' })
    const fetch = vi.fn(async (_url, init) => {
      const note = JSON.parse(init!.body as string).notes[0].note
      expect(note).toMatchObject({ title: row.title, transcriptText: row.transcriptText })
      const fallback = field === 'updatedAt' ? row.completedAt! : row.updatedAt
      expect(note[field]).toBe(new Date(fallback).toISOString())
      expect(await db.items.get(row.id)).toMatchObject({ [field]: 'not-a-date' })
      return new Response(JSON.stringify({ count: 1, notes: [{ legacyId: row.id, note: { id: 'remote' } }] }))
    })
    vi.stubGlobal('fetch', fetch)
    await migrateLocalData(() => {})
    expect(fetch).toHaveBeenCalledOnce()
    expect(await db.items.get(row.id)).toBeUndefined()
  })
  it('ignores seed rows and deletes a user row only after ID/count acknowledgement', async () => {
    await db.items.bulkPut([row, ...SEED_ITEMS])
    expect(await localMigrationCount()).toBe(1)
    const progress = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        const payload = JSON.parse(init!.body as string)
        expect(await db.items.get(row.id)).toBeDefined()
        expect(payload.notes[0].note).toMatchObject({
          completedAt: new Date(row.completedAt!).toISOString(),
          createdAt: new Date(row.createdAt).toISOString(),
        })
        return new Response(
          JSON.stringify({
            count: 1,
            notes: [{ legacyId: 'legacy', note: { id: 'remote-id' } }],
          }),
        )
      }),
    )
    await migrateLocalData(progress)
    expect(await db.items.count()).toBe(0)
    expect(progress).toHaveBeenCalledWith(1, 1)
    await migrateLocalData(progress)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
  it('imports an edited seed record before deleting its local copy', async () => {
    const edited = { ...SEED_ITEMS[1], title: 'Мой отредактированный план' }
    await db.items.bulkPut([SEED_ITEMS[0], edited])
    expect(await localMigrationCount()).toBe(1)
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const { notes } = JSON.parse(init!.body as string)
      expect(notes).toHaveLength(1)
      expect(notes[0]).toMatchObject({ legacyId: edited.id, note: { title: edited.title } })
      expect(await db.items.get(edited.id)).toBeDefined()
      return new Response(JSON.stringify({ count: 1, notes: [{ legacyId: edited.id, note: { id: 'remote-edited' } }] }))
    }))
    await migrateLocalData(() => {})
    expect(await db.items.get(edited.id)).toBeUndefined()
  })
  it('imports audio attached to an otherwise unchanged seed record', async () => {
    const seed = SEED_ITEMS[0]
    await db.items.put(seed)
    const audio = { id: seed.id, title: seed.title, duration: 1, recordedAt: seed.createdAt, audioBlob: new Blob(['audio']) }
    await db.audioSessions.put(audio)
    vi.spyOn(db, 'getAudioSession').mockResolvedValue(audio)
    expect(await localMigrationCount()).toBe(1)
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      if (String(url).includes('/audio/upload')) return new Response(JSON.stringify({ audioId: 'remote-audio' }))
      const { notes } = JSON.parse(init!.body as string)
      expect(notes[0]).toMatchObject({ legacyId: seed.id, note: { audioId: 'remote-audio' } })
      return new Response(JSON.stringify({ count: 1, notes: [{ legacyId: seed.id, note: { id: 'remote-seed' } }] }))
    }))
    await migrateLocalData(() => {})
    expect(await db.audioSessions.get(seed.id)).toBeUndefined()
  })
  it('imports a record with no readable timestamps and preserves it after a server rejection', async () => {
    const legacy = { ...row, status: 'todo' as const, createdAt: 'broken', updatedAt: 'broken', completedAt: 'broken' }
    await db.items.put(legacy)
    const startedAt = Date.now()
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const note = JSON.parse(init!.body as string).notes[0].note
      expect(note.title).toBe(row.title)
      expect(note.transcriptText).toBe(row.transcriptText)
      expect(note.createdAt).toBe(note.updatedAt)
      expect(Date.parse(note.createdAt)).toBeGreaterThanOrEqual(startedAt)
      expect(Date.parse(note.createdAt)).toBeLessThanOrEqual(Date.now())
      expect(note).not.toHaveProperty('completedAt')
      return new Response(JSON.stringify({ error: { message: 'Try again' } }), { status: 503 })
    }))
    await expect(migrateLocalData(() => {})).rejects.toThrow('Try again')
    expect(await db.items.get(row.id)).toMatchObject(legacy)
  })
  it('recovers creation time from the original audio metadata', async () => {
    await db.items.put({ ...row, createdAt: 'broken' })
    await db.audioSessions.put({ id: row.id, title: row.title, duration: 1, recordedAt: '2026-09-30T10:00:00Z' })
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const note = JSON.parse(init!.body as string).notes[0].note
      expect(note.createdAt).toBe('2026-09-30T10:00:00.000Z')
      return new Response(JSON.stringify({ count: 1, notes: [{ legacyId: row.id, note: { id: 'remote' } }] }))
    }))
    await migrateLocalData(() => {})
    expect(await db.audioSessions.get(row.id)).toBeUndefined()
  })
  it('preserves source after a network error and resumes with the same legacyId', async () => {
    await db.items.put(row)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('Offline'))
        .mockImplementation(async (_url, init) => {
          expect(JSON.parse(init!.body as string).notes[0].legacyId).toBe(
            'legacy',
          )
          return new Response(
            JSON.stringify({
              count: 1,
              notes: [{ legacyId: 'legacy', note: { id: 'server' } }],
            }),
          )
        }),
    )
    await expect(migrateLocalData(() => {})).rejects.toThrow('Offline')
    expect(await db.items.get('legacy')).toBeDefined()
    await migrateLocalData(() => {})
    expect(await db.items.get('legacy')).toBeUndefined()
  })
  it('does not erase local data on an incomplete acknowledgement', async () => {
    await db.items.put(row)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ count: 0, notes: [] }))),
    )
    await expect(migrateLocalData(() => {})).rejects.toThrow(
      'Сервер не подтвердил',
    )
    expect(await db.items.get('legacy')).toBeDefined()
  })
  it('migrates an orphan audio session and keeps its blob until server acknowledgement', async () => {
    const session = {
      id: 'audio-only',
      title: 'Запись',
      duration: 1,
      recordedAt: row.createdAt,
      summary: 'Сводка',
      transcript: 'Транскрипт',
      audioBlob: new Blob(['synthetic'], { type: 'audio/wav' }),
    }
    await db.audioSessions.put(session)
    // Node structuredClone used by fake-indexeddb cannot clone jsdom Blob internals.
    vi.spyOn(db, 'getAudioSession').mockResolvedValue(session)
    expect(await localMigrationCount()).toBe(1)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        expect(await db.audioSessions.get('audio-only')).toBeDefined()
        if (String(url).includes('/audio/upload')) {
          const form = init!.body as FormData
          expect(form.get('legacyId')).toBe('audio-only')
          expect(form.get('file')).toBeTruthy()
          return new Response(JSON.stringify({ audioId: 'server-audio' }))
        }
        const payload = JSON.parse(init!.body as string)
        expect(payload.notes[0]).toMatchObject({
          legacyId: 'audio-only',
          note: {
            audioId: 'server-audio',
            description: 'Сводка',
            transcriptText: 'Транскрипт',
            createdAt: new Date(row.createdAt).toISOString(),
          },
        })
        return new Response(
          JSON.stringify({
            count: 1,
            notes: [{ legacyId: 'audio-only', note: { id: 'server-note' } }],
          }),
        )
      }),
    )
    await migrateLocalData(() => {})
    expect(await db.audioSessions.count()).toBe(0)
    expect(await localMigrationCount()).toBe(0)
  })
})
