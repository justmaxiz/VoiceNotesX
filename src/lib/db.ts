import Dexie, { Table } from 'dexie'
import { Item, AudioSession, UserSettings } from '../types'

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
  }

  async createItem(item: Item): Promise<string> {
    const finalItem: Item = {
      ...item,
      id: item.id || generateId(),
      isFocus: Boolean(item.isFocus),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }

    if (finalItem.isFocus) {
      await this.transaction('rw', this.items, async () => {
        const allFocused = await this.items.filter((i) => Boolean(i.isFocus)).toArray()
        const now = new Date().toISOString()
        for (const f of allFocused) {
          if (f.id !== finalItem.id) {
            await this.items.update(f.id, { isFocus: false, updatedAt: now })
          }
        }
        await this.items.put(finalItem)
      })
    } else {
      await this.items.put(finalItem)
    }

    return finalItem.id
  }

  async updateItem(id: string, patch: Partial<Item>): Promise<void> {
    const existing = await this.items.get(id)
    if (!existing) {
      throw new Error(`Item with id "${id}" not found`)
    }

    if (patch.isFocus) {
      await this.setFocusTask(id)
      const restPatch = { ...patch }
      delete restPatch.isFocus
      if (Object.keys(restPatch).length > 0) {
        await this.items.update(id, {
          ...restPatch,
          updatedAt: new Date().toISOString(),
        })
      }
    } else {
      await this.items.update(id, {
        ...patch,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  async deleteItem(id: string): Promise<void> {
    await this.items.delete(id)
  }

  async toggleTaskComplete(id: string): Promise<void> {
    const item = await this.items.get(id)
    if (!item) {
      throw new Error(`Item with id "${id}" not found`)
    }
    const isCompleted = item.status === 'completed'
    const newStatus: Item['status'] = isCompleted ? 'todo' : 'completed'
    const now = new Date().toISOString()
    await this.items.update(id, {
      status: newStatus,
      completedAt: isCompleted ? undefined : now,
      updatedAt: now,
    })
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
