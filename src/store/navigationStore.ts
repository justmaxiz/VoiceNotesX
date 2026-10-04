import { create } from 'zustand'
import { NavigationTab } from '../types/navigation'

export const normalizeTab = (rawHash?: string | null): NavigationTab | null => {
  if (rawHash === undefined || rawHash === null) return null
  const clean = rawHash.replace(/^#\/?/, '').trim().toLowerCase()
  if (clean === 'overview' || clean === 'home' || clean === '') return 'overview'
  if (clean === 'notes' || clean === 'notes-and-audio') return 'notes-and-audio'
  if (clean === 'tasks') return 'tasks'
  if (clean === 'calendar') return 'calendar'
  if (clean === 'ai-summaries' || clean === 'summaries') return 'ai-summaries'
  if (clean === 'settings') return 'settings'
  return null
}

interface NavigationState {
  activeTab: NavigationTab
  setActiveTab: (tab: NavigationTab) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  isRecordingModalOpen: boolean
  setRecordingModalOpen: (open: boolean) => void
  isMobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

const getInitialTab = (): NavigationTab => {
  if (typeof window === 'undefined') return 'overview'
  return normalizeTab(window.location.hash) ?? 'overview'
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: getInitialTab(),
  setActiveTab: (tab) => {
    if (typeof window !== 'undefined') {
      const currentCleanHash = window.location.hash.replace(/^#\/?/, '')
      if (currentCleanHash !== tab) {
        window.location.hash = tab
      }
    }
    set({ activeTab: tab, isMobileMenuOpen: false })
  },
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isRecordingModalOpen: false,
  setRecordingModalOpen: (open) => set({ isRecordingModalOpen: open }),
  isMobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
}))
