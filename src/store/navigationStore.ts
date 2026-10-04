import { create } from 'zustand'
import { NavigationTab } from '../types/navigation'

interface NavigationState {
  activeTab: NavigationTab
  setActiveTab: (tab: NavigationTab) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  isRecordingModalOpen: boolean
  setRecordingModalOpen: (open: boolean) => void
}

const getInitialTab = (): NavigationTab => {
  if (typeof window === 'undefined') return 'overview'
  const hash = window.location.hash.replace('#', '')
  const validTabs: NavigationTab[] = [
    'overview',
    'notes-and-audio',
    'tasks',
    'calendar',
    'ai-summaries',
    'settings',
  ]
  return validTabs.includes(hash as NavigationTab) ? (hash as NavigationTab) : 'overview'
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: getInitialTab(),
  setActiveTab: (tab) => {
    if (typeof window !== 'undefined') {
      window.location.hash = tab
    }
    set({ activeTab: tab })
  },
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isRecordingModalOpen: false,
  setRecordingModalOpen: (open) => set({ isRecordingModalOpen: open }),
}))
