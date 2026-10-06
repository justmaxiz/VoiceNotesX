import { describe, it, expect } from 'vitest'
import Dexie from 'dexie'
import { VoiceNotesDB } from '../../lib/db'
import { localDeadline, taskDuration } from '../../lib/taskDates'
import { Item } from '../../types/item'

const legacy = (id: string, patch: Partial<Item> = {}): Item => ({ id, type: 'task', title: id, categoryTag: '#Work', status: 'todo', priority: 'medium', isFocus: false, createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z', ...patch })

describe('Migration and indexing adversarial regressions', () => {
  it('migrates real v1 schema without losing originals, short clocks, explicit dates or backlog', async () => {
    const name = `migration-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(1).stores({ items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate' })
    const rows = [legacy('short', { dueDate: '2026-10-15', dueTime: '9:30' }), legacy('backlog'), legacy('invalid', { dueDate: 'garbage' }), legacy('explicit', { startDate: '2026-10-15T08:00:00.000Z', deadline: '2026-10-15T09:00:00.000Z' }), ...[0, -1, 1440, Infinity].map((duration, index) => legacy(`duration-${index}`, { dueDate: '2026-10-15', dueTime: '12:00', estimatedMinutes: duration }))]
    await old.table('items').bulkPut(rows)
    old.close()
    const current = new VoiceNotesDB(name)
    try {
      await current.open()
      expect(await current.items.count()).toBe(rows.length)
      const short = await current.getItem('short')
      expect(short?.deadline).toBe(localDeadline('2026-10-15', '09:30')!.toISOString())
      expect((await current.items.where('deadline').equals(short!.deadline!).toArray()).map((item) => item.id)).toContain('short')
      expect(await current.getItem('backlog')).toMatchObject({ startDate: null, deadline: null })
      expect(await current.getItem('invalid')).toMatchObject({ dueDate: 'garbage', title: 'invalid' })
      expect(await current.getItem('explicit')).toMatchObject({ startDate: rows[3].startDate, deadline: rows[3].deadline })
      for (const row of rows.slice(4)) {
        const migrated = (await current.getItem(row.id))!
        expect(new Date(migrated.deadline!).getTime() - new Date(migrated.startDate!).getTime()).toBe(taskDuration(row) * 60000)
      }
      expect(current.tables.map((table) => table.name)).toEqual(expect.arrayContaining(['items', 'audioSessions', 'settings']))
    } finally { current.close(); await Dexie.delete(name) }
  })
  it('indexes equivalent offset instants canonically', async () => {
    const database = new VoiceNotesDB(`index-${crypto.randomUUID()}`)
    try {
      await database.createItem(legacy('offset', { deadline: '2026-10-15T18:00:00+03:00' }))
      await database.createItem(legacy('utc', { deadline: '2026-10-15T15:00:00Z' }))
      expect(await database.items.where('deadline').equals('2026-10-15T15:00:00.000Z').count()).toBe(2)
    } finally { await database.delete() }
  })
})
