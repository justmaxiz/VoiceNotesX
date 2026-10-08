import { api, API_BASE, apiUrl } from './api'
import type { Item } from '../types/item'
import type { Note, AudioMetadata } from '../../server/src/contracts'
import { hasSchedule } from '../../server/src/contracts'
export function toItem(note: Note): Item {
  return {
    ...note,
    type: hasSchedule(note) ? 'task' : 'note',
    audioUrl: note.audioUrl ? `${API_BASE}${note.audioUrl}` : undefined,
  }
}
export function noteInput(item: Partial<Item>) {
  const {
    id,
    type,
    createdAt,
    updatedAt,
    completedAt,
    audioUrl,
    audioDuration,
    ...data
  } = item
  return data
}
export const notesRepository = {
  async getAllItems() {
    const items: Item[] = []
    for (let offset = 0; ; offset += 200) {
      const page = await api<{ notes: Note[]; total: number }>(
        `/notes?limit=200&offset=${offset}`,
      )
      items.push(...page.notes.map(toItem))
      if (offset + page.notes.length >= page.total || !page.notes.length)
        return items
    }
  },
  async createItem(item: Item, _audio?: { blob: Blob; duration: number }) {
    const { note } = await api<{ note: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify({ ...noteInput(item), id: item.id }),
    })
    return toItem(note)
  },
  async updateItem(id: string, patch: Partial<Item>) {
    const { note } = await api<{ note: Note }>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(noteInput(patch)),
    })
    return toItem(note)
  },
  async deleteItem(id: string) {
    await api(`/notes/${id}`, { method: 'DELETE' })
  },
  async setFocusTask(id: string) {
    return this.updateItem(id, { isFocus: true, isFocused: true })
  },
}
export const audioRepository = {
  async getMetadata(id: string) {
    return (await api<{ audio: AudioMetadata }>(`/audio/${id}`)).audio
  },
  fileUrl(id: string) {
    return apiUrl(`/audio/${id}/file`)
  },
}
