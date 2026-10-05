import { create } from 'zustand'
import { NavigationTab } from '../types/navigation'

export const normalizeTab = (rawHash?: string | null): NavigationTab | null => {
  if (rawHash === undefined || rawHash === null) return null
  const clean = rawHash.replace(/^#\/?/, '').trim().toLowerCase()
  if (clean === 'overview' || clean === 'home' || clean === '') return 'overview'
  if (clean === 'notes' || clean === 'notes-and-audio') return 'notes'
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
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

const getInitialTab = (): NavigationTab => {
  if (typeof window === 'undefined') return 'overview'
  return normalizeTab(window.location.hash) ?? 'overview'
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: getInitialTab(),
  setActiveTab: (tab) => {
    const normalized = normalizeTab(tab) ?? tab
    if (typeof window !== 'undefined') {
      const currentCleanHash = window.location.hash.replace(/^#\/?/, '')
      if (currentCleanHash !== normalized) {
        window.location.hash = normalized
      }
    }
    set({ activeTab: normalized, isMobileMenuOpen: false })
  },
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isRecordingModalOpen: false,
  setRecordingModalOpen: (open) => set({ isRecordingModalOpen: open }),
  isMobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return { isMobileMenuOpen: !state.isMobileMenuOpen }
      }
      return {
        isSidebarCollapsed: !state.isSidebarCollapsed,
        isMobileMenuOpen: false,
      }
    }),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
}))
