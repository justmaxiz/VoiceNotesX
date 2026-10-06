import Dexie, { Table } from 'dexie'
import { Item, AudioSession, UserSettings } from '../types'
import { normalizeTaskDates, taskDuration } from './taskDates'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)
}

export class VoiceNotesDB extends Dexie {
  items!: Table<Item, string>
  audioSessions!: Table<AudioSession, string>
  settings!: Table<UserSettings, string>

  constructor(databaseName = 'VoiceNotesDB') {
    super(databaseName)
    this.version(1).stores({
      items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
      audioSessions: 'id, recordedAt',
      settings: 'id',
    })

    this.version(2)
      .stores({
        items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate, startDate, deadline',
        audioSessions: 'id, recordedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx.table('items').toCollection().modify((item: any) => {
          try {
            Object.assign(item, normalizeTaskDates({ ...item, estimatedMinutes: taskDuration(item) }))
          } catch {
            // Preserve malformed legacy rows; do not guess or discard user data.
          }
        })
      })
  }

  async createItem(item: Item, audio?: { blob: Blob; duration: number }): Promise<string> {
    const isItemFocus = Boolean(item.isFocus || item.isFocused)
    const finalItem: Item = {
      ...normalizeTaskDates(item),
      id: item.id || generateId(),
      isFocus: isItemFocus,
      isFocused: isItemFocus,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }

    // A capture and its original audio are one atomic write.
    await this.transaction('rw', [this.items, this.audioSessions], async () => {
      if (finalItem.isFocus) {
        await this.items.filter((i) => Boolean(i.isFocus || i.isFocused)).modify({ isFocus: false, isFocused: false })
      }
      if (audio) {
        delete finalItem.audioUrl
        finalItem.audioDuration = audio.duration
        await this.audioSessions.put({ id: finalItem.id, title: finalItem.title, duration: audio.duration, recordedAt: finalItem.createdAt, audioBlob: audio.blob })
      }
      await this.items.put(finalItem)
    })

    return finalItem.id
  }

  async updateItem(id: string, patch: Partial<Item>): Promise<void> {
    const existing = await this.items.get(id)
    if (!existing) {
      throw new Error(`Item with id "${id}" not found`)
    }

    const normalized = normalizeTaskDates(patch, existing)
    if ('status' in patch) {
      normalized.completedAt = patch.status === 'completed' ? existing.completedAt || new Date().toISOString() : undefined
      if (patch.status === 'completed' || patch.status === 'archived') { normalized.isFocus = false; normalized.isFocused = false }
    }
    if ('isFocus' in normalized || 'isFocused' in normalized) {
      normalized.isFocus = normalized.isFocused = Boolean(normalized.isFocus || normalized.isFocused)
    }
    await this.transaction('rw', this.items, async () => {
      if (normalized.isFocus) {
        await this.items.filter((i) => i.id !== id && Boolean(i.isFocus || i.isFocused)).modify({ isFocus: false, isFocused: false })
        if ((normalized.status || existing.status) === 'todo') normalized.status = 'in_progress'
      }
      await this.items.update(id, { ...normalized, updatedAt: new Date().toISOString() })
    })
  }

  async deleteItem(id: string): Promise<void> {
    await this.transaction('rw', [this.items, this.audioSessions], async () => {
      await this.items.delete(id)
      await this.audioSessions.delete(id)
    })
  }

  async toggleTaskComplete(id: string): Promise<void> {
    const item = await this.items.get(id)
    if (!item) {
      throw new Error(`Item with id "${id}" not found`)
    }
    await this.updateItem(id, { status: item.status === 'completed' ? 'todo' : 'completed' })
  }

  async setFocusTask(id: string): Promise<void> {
    const target = await this.items.get(id)
    if (!target) {
      throw new Error(`Item with id "${id}" not found`)
    }
    await this.transaction('rw', this.items, async () => {
      const allFocused = await this.items
        .filter((item) => Boolean(item.isFocus || item.isFocused))
        .toArray()
      const now = new Date().toISOString()
      for (const item of allFocused) {
        if (item.id !== id) {
          await this.items.update(item.id, { isFocus: false, isFocused: false, updatedAt: now })
        }
      }
      const newStatus = target.status === 'todo' ? 'in_progress' : target.status
      await this.items.update(id, {
        isFocus: true,
        isFocused: true,
        status: newStatus,
        updatedAt: now,
      })
    })
  }

  async getAllItems(): Promise<Item[]> {
    return this.items.toArray()
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id)
  }

  async getAllAudioSessions(): Promise<AudioSession[]> {
    return this.audioSessions.toArray()
  }

  async getAudioSession(id: string): Promise<AudioSession | undefined> {
    return this.audioSessions.get(id)
  }

  async createAudioSession(session: AudioSession): Promise<string> {
    const finalSession: AudioSession = {
      ...session,
      id: session.id || generateId(),
      recordedAt: session.recordedAt || new Date().toISOString(),
    }
    await this.audioSessions.put(finalSession)
    return finalSession.id
  }

  async deleteAudioSession(id: string): Promise<void> {
    await this.audioSessions.delete(id)
  }

  async getSettings(): Promise<UserSettings | undefined> {
    return this.settings.get('default')
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await this.settings.put({
      ...settings,
      id: 'default',
      updatedAt: new Date().toISOString(),
    })
  }

  async clearDatabase(): Promise<void> {
    await this.transaction('rw', [this.items, this.audioSessions, this.settings], async () => {
      await this.items.clear()
      await this.audioSessions.clear()
      await this.settings.clear()
    })
  }
}

export const db = new VoiceNotesDB()

export const createItem = (item: Item) => db.createItem(item)
export const updateItem = (id: string, patch: Partial<Item>) => db.updateItem(id, patch)
export const deleteItem = (id: string) => db.deleteItem(id)
export const toggleTaskComplete = (id: string) => db.toggleTaskComplete(id)
export const setFocusTask = (id: string) => db.setFocusTask(id)
export const getAllItems = () => db.getAllItems()
export const getItem = (id: string) => db.getItem(id)
export const getAllAudioSessions = () => db.getAllAudioSessions()
export const getAudioSession = (id: string) => db.getAudioSession(id)
export const createAudioSession = (session: AudioSession) => db.createAudioSession(session)
export const deleteAudioSession = (id: string) => db.deleteAudioSession(id)
export const getSettings = () => db.getSettings()
export const saveSettings = (settings: UserSettings) => db.saveSettings(settings)
export const clearDatabase = () => db.clearDatabase()
