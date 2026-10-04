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

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />
      case 'notes-and-audio':
        return <NotesPage />
      case 'tasks':
        return <TasksPage />
      case 'calendar':
        return <CalendarPage />
      case 'ai-summaries':
        return <AiSummariesPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardOverview />
    }
  }

  return <AppLayout>{renderActiveView()}</AppLayout>
}

export default App
