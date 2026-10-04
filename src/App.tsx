import React from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { useNavigationStore } from './store/navigationStore'
import { DashboardOverview } from './components/dashboard/DashboardOverview'
import { NotesPage } from './components/notes/NotesPage'
import { TasksPage } from './components/tasks/TasksPage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { AiSummariesPage } from './components/summaries/AiSummariesPage'
import { SettingsPage } from './components/settings/SettingsPage'

export const App: React.FC = () => {
  const { activeTab } = useNavigationStore()

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
        data-testid="view-notes-and-audio"
        className={activeTab === 'notes-and-audio' ? 'block' : 'hidden'}
        style={{ display: activeTab === 'notes-and-audio' ? 'block' : 'none' }}
      >
        <NotesPage />
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
