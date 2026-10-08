import { db } from './db'
import { api, getSession } from './api'
import { SEED_ITEMS } from './seedData'
import { noteInput } from './repository'
import type { Note } from '../../server/src/contracts'
import type { Item } from '../types/item'
import { normalizeTaskDates, taskDuration } from './taskDates'
const seedIds = new Set(SEED_ITEMS.map((item) => item.id))
const seedById = new Map(SEED_ITEMS.map((item) => [item.id, item]))
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
function isUnchangedSeed(item: Item): boolean {
  const seed = seedById.get(item.id)
  if (!seed) return false
  const snapshot = canonical(item)
  return snapshot === canonical(seed) ||
    snapshot === canonical(normalizeTaskDates({ ...seed, estimatedMinutes: taskDuration(seed) }))
}
function importTimestamp(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : new Date(NaN)
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 0 || date.getUTCFullYear() > 9999)
    return undefined
  return date.toISOString()
}
async function legacyItems(): Promise<Item[]> {
  const audios = await db.getAllAudioSessions()
  const audioIds = new Set(audios.map((audio) => audio.id))
  const items = (await db.getAllItems()).filter((item) => !isUnchangedSeed(item) || audioIds.has(item.id))
  const ids = new Set(items.map((item) => item.id))
  for (const audio of audios) {
    if (ids.has(audio.id)) continue
    const createdAt =
      importTimestamp(audio.recordedAt) || importTimestamp(audio.createdAt) || new Date().toISOString()
    items.push({
      id: audio.id,
      type: 'note',
      title: audio.title || 'Аудиозаметка',
      description: audio.summary || '',
      transcriptText: audio.transcript || audio.transcriptSnippet,
      status: 'todo',
      priority: 'medium',
      categoryTag: '#Аудио',
      tags: audio.tags,
      isFocus: false,
      createdAt,
      updatedAt: createdAt,
    })
  }
  return items
}
export async function localMigrationCount() {
  return (await legacyItems()).length
}
export async function migrateLocalData(
  progress: (done: number, total: number) => void,
) {
  const owner = getSession()?.user.id
  if (!owner) throw new Error('Войдите перед переносом данных')
  const items = await legacyItems()
  let done = 0
  for (let offset = 0; offset < items.length; offset += 25) {
    const batch = items.slice(offset, offset + 25)
    const entries = []
    for (const item of batch) {
      if (getSession()?.user.id !== owner)
        throw new Error('Сессия изменилась. Перенос остановлен.')
      const audio = await db.getAudioSession(item.id)
      // Old records may contain unreadable metadata. Recover it without blocking
      // their content; the source remains untouched until server acknowledgement.
      const validCreatedAt = importTimestamp(item.createdAt)
      const validUpdatedAt = importTimestamp(item.updatedAt)
      const validCompletedAt = importTimestamp(item.completedAt)
      const createdAt = validCreatedAt || importTimestamp(audio?.recordedAt) ||
        importTimestamp(audio?.createdAt) || validUpdatedAt || validCompletedAt || new Date().toISOString()
      const updatedAt = validUpdatedAt || validCompletedAt || createdAt
      const timestamps = {
        createdAt,
        updatedAt,
        completedAt: validCompletedAt || (item.status === 'completed' ? updatedAt : undefined),
      }
      let audioId: string | undefined
      if (audio?.audioBlob) {
        const form = new FormData()
        form.append('legacyId', item.id)
        form.append('file', audio.audioBlob, `${item.title}.audio`)
        audioId = (
          await api<{ audioId: string }>('/audio/upload', {
            method: 'POST',
            body: form,
          })
        ).audioId
      }
      entries.push({
        legacyId: item.id,
        note: {
          ...noteInput(normalizeTaskDates(item)),
          ...timestamps,
          ...(audioId ? { audioId } : {}),
        },
      })
    }
    const result = await api<{
      count: number
      notes: { legacyId: string; note: Note }[]
    }>('/import/notes', {
      method: 'POST',
      body: JSON.stringify({ notes: entries }),
    })
    const acknowledged = new Map(
      result.notes.map((entry) => [entry.legacyId, entry.note.id]),
    )
    if (
      result.count !== batch.length ||
      acknowledged.size !== batch.length ||
      batch.some((item) => !acknowledged.get(item.id))
    )
      throw new Error('Сервер не подтвердил перенос записи')
    if (getSession()?.user.id !== owner)
      throw new Error('Сессия изменилась. Локальная копия сохранена.')
    const ids = batch.map((item) => item.id)
    await db.transaction('rw', [db.items, db.audioSessions], async () => {
      await db.items.bulkDelete(ids)
      await db.audioSessions.bulkDelete(ids)
    })
    done += batch.length
    progress(done, items.length)
  }
  await db.transaction('rw', [db.items, db.audioSessions], async () => {
    await db.items.bulkDelete([...seedIds])
    await db.audioSessions.bulkDelete([...seedIds])
  })
}
