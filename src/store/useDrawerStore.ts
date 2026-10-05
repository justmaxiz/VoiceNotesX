import { create } from 'zustand'

export interface DrawerState {
  selectedItemId: string | null
  isDrawerOpen: boolean
  openDrawer: (id: string) => void
  closeDrawer: () => void
}

export const useDrawerStore = create<DrawerState>((set) => ({
  selectedItemId: null,
  isDrawerOpen: false,

  openDrawer: (id: string) => set({ selectedItemId: id, isDrawerOpen: true }),
  closeDrawer: () => set({ selectedItemId: null, isDrawerOpen: false }),
}))
