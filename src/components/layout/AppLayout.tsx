import React, { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { QuickCaptureWidget } from './QuickCaptureWidget'
import { SlideOverDrawer } from './SlideOverDrawer'
import { useNavigationStore, normalizeTab } from '../../store/navigationStore'
import { useQuickCaptureHotkey } from '../../hooks/useQuickCaptureHotkey'
import { startReminderScheduler } from '../../lib/remindersService'
import { useAppStore } from '../../store/useAppStore'
import { LocalMigration } from '../auth/LocalMigration'
import { AudioProcessingWidget } from '../audio/AudioProcessingWidget'
import { useSummaryTimeZone } from '../../hooks/useSummary'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  useSummaryTimeZone()
  const {
    setActiveTab,
    isSidebarCollapsed,
    toggleSidebar,
  } = useNavigationStore()

  const error = useAppStore((state) => state.error)
  const clearError = useAppStore((state) => state.clearError)

  // Hotkey / or C for quick capture (TASK-40)
  useQuickCaptureHotkey()

  useEffect(() => {
    const onError = (event: Event) => useAppStore.setState({ error: (event as CustomEvent<string>).detail })
    window.addEventListener('voicenotes:storage-error', onError)
    return () => window.removeEventListener('voicenotes:storage-error', onError)
  }, [])

  // Browser reminders only; summaries run on the backend even with a closed client.
  useEffect(() => {
    const stopReminders = startReminderScheduler(() => useAppStore.getState().items)
    return () => {
      stopReminders()
    }
  }, [])



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
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const handleQuickCaptureSave = (text: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('voicenotes:quick-capture', {
          detail: { text, timestamp: Date.now() },
        })
      )
    }
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Sidebar with separation border and collapse support */}
      <Sidebar />

      {/* Header with sidebar toggle */}
      <Header />

      {/* Main content offsets to the full sidebar or its compact icon rail. */}
      <main
        role="main"
        className={`relative ${
          isSidebarCollapsed ? 'pl-0 md:pl-20' : 'pl-0 md:pl-72'
        } pt-16 bg-surface min-h-screen w-full overflow-x-clip transition-all duration-200`}
      >
        {error && <div role="alert" className="mx-4 mt-4 rounded-xl bg-error-container text-on-error-container p-3">{error}<button className="ml-4 underline" onClick={clearError}>Закрыть</button></div>}
        {/* Dynamic Ambient Auras */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none -z-10"
        />
        <div
          aria-hidden="true"
          className="absolute top-20 left-1/3 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10"
        />

        {/* Dynamic Page Views with bottom spacing for floating QuickCaptureWidget */}
        <div className="flex flex-col w-full pb-36 px-space-md md:px-space-xl">
          <LocalMigration />
          {children}
        </div>
      </main>

      {/* Global Bottom Quick Capture Floating Widget */}
      <QuickCaptureWidget onSave={handleQuickCaptureSave} />

      {/* Global Slide-Over Details Drawer */}
      <SlideOverDrawer />
      <AudioProcessingWidget />

    </div>
  )
}
