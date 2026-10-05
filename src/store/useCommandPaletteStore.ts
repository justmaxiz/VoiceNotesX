import { create } from 'zustand'

export interface CommandPaletteState {
  isOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  openPalette: () => set({ isOpen: true }),
  closePalette: () => set({ isOpen: false }),
  togglePalette: () => set({ isOpen: !get().isOpen }),
}))
