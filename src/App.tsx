import React, { useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { useNavigationStore } from './store/navigationStore'
import { useAppStore } from './store/useAppStore'
import { db } from './lib/db'
import { DashboardOverview } from './components/dashboard/DashboardOverview'

// Expose store and database to window for convenient debugging and verification in DevTools
if (typeof window !== 'undefined') {
  ;(window as any).db = db
  ;(window as any).useAppStore = useAppStore
}
import { NotesPage } from './components/notes/NotesPage'
import { TasksPage } from './components/tasks/TasksPage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { AiSummariesPage } from './components/summaries/AiSummariesPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { useThemeSync } from './hooks/useThemeSync'

export const App: React.FC = () => {
  useThemeSync()
  const { activeTab } = useNavigationStore()

  useEffect(() => {
    void useAppStore.getState().loadItems().catch(console.error)
  }, [])

  return (
    <AppLayout>
      <div
        data-testid="view-overview"
        className={activeTab === 'overview' ? 'block' : 'hidden'}
        style={{ display: activeTab === 'overview' ? 'block' : 'none' }}
      >
        <DashboardOverview />
      </div>

      <div
        data-testid="view-notes"
        className={activeTab === 'notes' || activeTab === 'notes-and-audio' ? 'block' : 'hidden'}
        style={{ display: activeTab === 'notes' || activeTab === 'notes-and-audio' ? 'block' : 'none' }}
      >
        <div data-testid="view-notes-and-audio" className="w-full">
          <NotesPage />
        </div>
      </div>

      <div
        data-testid="view-tasks"
        className={activeTab === 'tasks' ? 'block' : 'hidden'}
        style={{ display: activeTab === 'tasks' ? 'block' : 'none' }}
      >
        <TasksPage />
      </div>

      <div
        data-testid="view-calendar"
        className={activeTab === 'calendar' ? 'block' : 'hidden'}
        style={{ display: activeTab === 'calendar' ? 'block' : 'none' }}
      >
        <CalendarPage />
      </div>

      <div
        data-testid="view-ai-summaries"
        className={activeTab === 'ai-summaries' ? 'block' : 'hidden'}
        style={{ display: activeTab === 'ai-summaries' ? 'block' : 'none' }}
      >
        <AiSummariesPage />
      </div>

      <div
        data-testid="view-settings"
        className={activeTab === 'settings' ? 'block' : 'hidden'}
        style={{ display: activeTab === 'settings' ? 'block' : 'none' }}
      >
        <SettingsPage />
      </div>
    </AppLayout>
  )
}

export default App
