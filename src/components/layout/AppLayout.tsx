import React, { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { RecordingModal } from '../audio/RecordingModal'
import { useNavigationStore, normalizeTab } from '../../store/navigationStore'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { setActiveTab, isSidebarCollapsed, toggleSidebar } = useNavigationStore()

  // Sync state with browser hash navigation (e.g., back / forward history)
  useEffect(() => {
    const handleHashChange = () => {
      const target = normalizeTab(window.location.hash) || 'overview'
      if (useNavigationStore.getState().activeTab !== target) {
        setActiveTab(target)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setActiveTab])

  // Keyboard shortcut Ctrl+B / Cmd+B for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Sidebar with separation border and collapse support */}
      <Sidebar />

      {/* Header with sidebar toggle */}
      <Header />

      {/* Main Content Area - pl-72 offset never conflicts with content padding */}
      <main
        role="main"
        className={`relative ${
          isSidebarCollapsed ? 'pl-0' : 'pl-0 md:pl-72'
        } pt-16 bg-surface min-h-screen w-full transition-all duration-200`}
      >
        {/* Dynamic Ambient Auras */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none -z-10"
        />
        <div
          aria-hidden="true"
          className="absolute top-20 left-1/3 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10"
        />

        {/* Dynamic Page Views with isolated horizontal padding */}
        <div className="flex flex-col w-full pb-space-xl px-space-md md:px-space-xl">
          {children}
        </div>
      </main>

      {/* Quick Recording Modal Overlay */}
      <RecordingModal />
    </div>
  )
}
