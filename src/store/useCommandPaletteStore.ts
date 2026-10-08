import { create } from 'zustand'

export interface CommandPaletteState {
  isOpen: boolean
  query: string
  returnFocusElement: HTMLElement | null
  setQuery: (query: string) => void
  openPalette: (returnFocusTo?: HTMLElement | null) => void
  closePalette: () => void
  togglePalette: (returnFocusTo?: HTMLElement | null) => void
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  query: '',
  returnFocusElement: null,
  setQuery: (query) => set({ query }),
  openPalette: (returnFocusTo) => set((state) => ({
    isOpen: true,
    query: state.isOpen ? state.query : '',
    returnFocusElement: returnFocusTo ?? (typeof document !== 'undefined' ? document.activeElement as HTMLElement : null),
  })),
  closePalette: () => set({ isOpen: false }),
  togglePalette: (returnFocusTo) => {
    if (get().isOpen) {
      set({ isOpen: false })
    } else {
      set({
        isOpen: true,
        query: '',
        returnFocusElement: returnFocusTo ?? (typeof document !== 'undefined' ? document.activeElement as HTMLElement : null),
      })
    }
  },
}))
