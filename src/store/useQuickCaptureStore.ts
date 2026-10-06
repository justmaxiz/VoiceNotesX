import { create } from 'zustand'

export interface QuickCaptureState {
  isOpen: boolean
  entityType: 'task' | 'note'
  targetColumn: string | null
  dueDate: string | null
  dueTime: string | null
  text: string
  isRecording: boolean
  openQuickCapture: (options?: {
    targetColumn?: string
    entityType?: 'task' | 'note'
    initialText?: string
    dueDate?: string
    dueTime?: string
  }) => void
  closeQuickCapture: () => void
  setEntityType: (type: 'task' | 'note') => void
  setText: (text: string) => void
  setIsRecording: (recording: boolean) => void
}

export const useQuickCaptureStore = create<QuickCaptureState>((set) => ({
  isOpen: true,
  entityType: 'task',
  targetColumn: null,
  text: '',
  dueDate: null,
  dueTime: null,
  isRecording: false,

  openQuickCapture: (options) => {
    set({
      isOpen: true,
      targetColumn: options?.targetColumn ?? null,
      entityType: options?.entityType ?? 'task',
      text: options?.initialText ?? '',
      dueDate: options?.dueDate ?? null,
      dueTime: options?.dueTime ?? null,
    })
  },

  closeQuickCapture: () => set({ isOpen: false, targetColumn: null }),
  setEntityType: (entityType) => set({ entityType }),
  setText: (text) => set({ text }),
  setIsRecording: (isRecording) => set({ isRecording }),
}))
