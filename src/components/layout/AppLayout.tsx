import React, { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useNavigationStore } from '../../store/navigationStore'
import { NavigationTab } from '../../types/navigation'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { setActiveTab } = useNavigationStore()

  // Sync state with browser hash navigation (e.g., back / forward history)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      const validTabs: NavigationTab[] = [
        'overview',
        'notes-and-audio',
        'tasks',
        'calendar',
        'ai-summaries',
        'settings',
      ]
      if (validTabs.includes(hash as NavigationTab)) {
        setActiveTab(hash as NavigationTab)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setActiveTab])

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Fixed Header */}
      <Header />

      {/* Main Content Area */}
      <main
        role="main"
        className="relative pl-72 pt-16 bg-surface min-h-screen w-full px-space-xl transition-all"
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

        {/* Dynamic Page Views */}
        <div className="flex flex-col w-full pb-space-xl">{children}</div>
      </main>
    </div>
  )
}
