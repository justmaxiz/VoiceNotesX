import React, { useState, useEffect, useCallback } from 'react'
import { TaskItemData, TaskFilter, ViewMode } from '../../types/item'
import { useNavigationStore } from '../../store/navigationStore'
import { DashboardHeader } from './components/DashboardHeader'
import { FocusHeroCard } from './components/FocusHeroCard'
import { DashboardTaskList } from './components/DashboardTaskList'
import { QuickInputBar } from './components/QuickInputBar'
import { ProductivityMetrics } from './components/ProductivityMetrics'
import { RecentAudioWidget } from './components/RecentAudioWidget'
import { DailySummaryCard } from './components/DailySummaryCard'
import { WorkspaceSyncCard } from './components/WorkspaceSyncCard'

const INITIAL_TASKS: TaskItemData[] = [
  {
    id: 't-1',
    title: 'Подготовить отчет по продуктовым метрикам Q3',
    category: '#Аналитика',
    categoryClass: 'text-tertiary',
    time: '16:00',
    isCompleted: false,
    hasAudio: true,
    audioDuration: '1:15',
    noteSubtitle: 'Встреча с инвесторами',
  },
  {
    id: 't-2',
    title: 'Провести ревью архитектуры микросервисов',
    category: '#Разработка',
    categoryClass: 'text-primary',
    time: '18:30',
    isCompleted: false,
    isUrgent: true,
    noteSubtitle: 'PR #142 • Саммари готово',
  },
  {
    id: 't-3',
    title: 'Записать идеи для дизайн-системы 2026',
    category: '#Дизайн',
    categoryClass: 'text-secondary',
    time: 'Завтра',
    isCompleted: false,
    hasAudio: true,
    audioDuration: '3 заметки',
  },
  {
    id: 't-4',
    title: 'Согласовать бюджет на AI API',
    category: '#Финансы',
    categoryClass: 'text-outline',
    time: '14:15',
    isCompleted: true,
    completedTime: 'Выполнено в 14:15',
  },
]

export const DashboardOverview: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItemData[]>(INITIAL_TASKS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isRecordingHeld, setIsRecordingHeld] = useState(false)

  const { activeTab, setActiveTab, setRecordingModalOpen } = useNavigationStore()

  // Toggle task completion
  const handleToggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    )
  }, [])

  // Quick task submit
  const handleAddQuickTask = useCallback((newTask: TaskItemData) => {
    setTasks((prev) => [newTask, ...prev])
  }, [])

  // Spacebar hotkey listener with strict scoping to overview tab and input protection
  useEffect(() => {
    if (activeTab !== 'overview') {
      setIsRecordingHeld(false)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.code !== 'Space') return

      const target = e.target as HTMLElement | null
      const isInteractive =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        Boolean(target?.closest('button, [role="button"], select, summary, a'))

      if (!isInteractive) {
        e.preventDefault()
        setIsRecordingHeld(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsRecordingHeld(false)
      }
    }

    const handleBlur = () => {
      setIsRecordingHeld(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [activeTab])

  const completedCount = tasks.filter((t) => t.isCompleted).length
  const totalCount = tasks.length
  const plannedCount = totalCount - completedCount

  return (
    <div className="flex flex-col w-full">
      {/* Header with Greetings and Quick Actions */}
      <DashboardHeader
        userName="Александр"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isRecordingHeld={isRecordingHeld}
        onStartRecording={() => setRecordingModalOpen(true)}
        onNewNote={() => setActiveTab('notes-and-audio')}
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Main Column */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* Hero Priority Focus Task & Audio */}
          <FocusHeroCard
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            onComplete={() => handleToggleTask('t-1')}
            onSummary={() => setActiveTab('ai-summaries')}
          />

          {/* Tasks List / Board with Filters */}
          <DashboardTaskList
            tasks={tasks}
            filter={filter}
            onFilterChange={setFilter}
            onToggleTask={handleToggleTask}
            viewMode={viewMode}
          />

          {/* Quick Input Bar */}
          <QuickInputBar
            onAddTask={handleAddQuickTask}
            onVoiceRecordClick={() => setRecordingModalOpen(true)}
          />
        </div>

        {/* Right Secondary Column */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          {/* Productivity Stats Bento Cards */}
          <ProductivityMetrics
            totalCount={totalCount}
            completedCount={completedCount}
            plannedCount={plannedCount}
          />

          {/* Recent Audio Memos Widget */}
          <RecentAudioWidget
            onViewAll={() => setActiveTab('notes-and-audio')}
          />

          {/* AI Daily Insights Card */}
          <DailySummaryCard
            onGenerateReport={() => setActiveTab('ai-summaries')}
          />

          {/* Context Devices Workspace Module */}
          <WorkspaceSyncCard />
        </div>
      </div>
    </div>
  )
}
