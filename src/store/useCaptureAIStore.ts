import { create } from 'zustand'
import type { Item } from '../types/item'
import type { ProcessNoteOptions } from '../types/ai'
import { structureVoiceNote } from '../lib/geminiStructuring'
import { useAppStore } from './useAppStore'
import { useDrawerStore } from './useDrawerStore'
import { getSession } from '../lib/api'
import { useQuickCaptureStore } from './useQuickCaptureStore'
interface CaptureState {
  draft: Item | null
  status: 'idle' | 'pending' | 'error'
  error: string | null
  options: ProcessNoteOptions
  start: (draft: Item, options: ProcessNoteOptions) => Promise<void>
  retry: (raw?: boolean) => Promise<void>
  reset: () => void
}
let inFlight = false
export const useCaptureAIStore = create<CaptureState>((set, get) => ({
  draft: null,
  status: 'idle',
  error: null,
  options: {},
  reset: () => set({ draft: null, status: 'idle', error: null }),
  start: async (draft, options) => {
    if (inFlight) throw new Error('Дождитесь завершения текущего запроса')
    set({ draft, options })
    useDrawerStore.getState().openDrawer(draft.id)
    return get().retry()
  },
  retry: async (raw = false) => {
    const draft = get().draft
    if (!draft || inFlight) return
    inFlight = true
    const owner = getSession()?.user.id
    set({ status: 'pending', error: null })
    try {
      const result = raw
        ? null
        : await structureVoiceNote(
            draft.transcriptText || draft.title,
            undefined,
            get().options,
          )
      const item: Item = {
        ...draft,
        ...(result
          ? {
              title: result.title,
              description: result.description,
              priority: result.priority,
              categoryTag: result.category_tag,
              ...(result.estimated_minutes !== undefined
                ? { estimatedMinutes: result.estimated_minutes }
                : {}),
              ...(!draft.dueDate && !draft.deadline
                ? {
                    ...(result.due_date !== undefined
                      ? { dueDate: result.due_date }
                      : {}),
                    ...(result.start_date
                      ? { startDate: result.start_date }
                      : {}),
                    ...(result.deadline ? { deadline: result.deadline } : {}),
                  }
                : {}),
              checklist: result.checklist?.map((text, index) => ({
                id: `${draft.id}-${index}`,
                text,
                isCompleted: false,
                sortOrder: index + 1,
              })),
            }
          : {}),
      }
      if (getSession()?.user.id !== owner) return
      await useAppStore.getState().addItem(item)
      if (getSession()?.user.id !== owner) return
      set({ draft: null, status: 'idle', error: null })
      if (useQuickCaptureStore.getState().text === draft.transcriptText)
        useQuickCaptureStore.getState().setText('')
    } catch (error) {
      if (getSession()?.user.id === owner)
        set({ status: 'error', error: (error as Error).message })
      throw error
    } finally {
      inFlight = false
    }
  },
}))
