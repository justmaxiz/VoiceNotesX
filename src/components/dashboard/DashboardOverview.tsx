import React, { useState, useCallback } from 'react'
import { TaskItemData, TaskFilter, ViewMode } from '../../types/item'
import { useNavigationStore } from '../../store/navigationStore'
import { useDashboardConfigStore } from '../../store/dashboardConfigStore'
import { DashboardHeader } from './components/DashboardHeader'
import { FocusHeroCard } from './components/FocusHeroCard'
import { DashboardTaskList } from './components/DashboardTaskList'
import { QuickInputBar } from './components/QuickInputBar'
import { ProductivityMetrics } from './components/ProductivityMetrics'
import { RecentAudioWidget } from './components/RecentAudioWidget'
import { DailySummaryCard } from './components/DailySummaryCard'
import { DashboardCustomizerModal } from './DashboardCustomizerModal'

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
  const { setActiveTab, setRecordingModalOpen } = useNavigationStore()
  const { modules } = useDashboardConfigStore()

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

  const completedCount = tasks.filter((t) => t.isCompleted).length
  const totalCount = tasks.length
  const plannedCount = totalCount - completedCount

  return (
    <div className="flex flex-col w-full">
      {/* Header with Greetings and Actions */}
      <DashboardHeader
        userName="Александр"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onStartRecording={() => setRecordingModalOpen(true)}
        onNewNote={() => setActiveTab('notes')}
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Main Column */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* Hero Priority Focus Task */}
          {modules.focusTask && (
            <FocusHeroCard
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((prev) => !prev)}
              title="Добавить новую фичу в VoiceNotes"
              description="Whisper AI Транскрипция и контекстное связывание голосовых заметок с календарем"
              onComplete={() => handleToggleTask('t-1')}
              onSummary={() => setActiveTab('ai-summaries')}
            />
          )}

          {/* Tasks List / Board with Filters */}
          {modules.taskList && (
            <DashboardTaskList
              tasks={tasks}
              filter={filter}
              onFilterChange={setFilter}
              onToggleTask={handleToggleTask}
              viewMode={viewMode}
            />
          )}

          {/* Quick Input Bar */}
          <QuickInputBar
            onAddTask={handleAddQuickTask}
            onVoiceRecordClick={() => setRecordingModalOpen(true)}
          />
        </div>

        {/* Right Secondary Column */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          {/* Productivity Stats Bento Cards */}
          {modules.metrics && (
            <ProductivityMetrics
              totalCount={totalCount}
              completedCount={completedCount}
              plannedCount={plannedCount}
            />
          )}

          {/* Recent Audio Memos Widget (modular, shown when enabled) */}
          {modules.recentAudio && (
            <RecentAudioWidget
              onViewAll={() => setActiveTab('notes')}
            />
          )}

          {/* AI Daily Insights Card */}
          {modules.dailySummary && (
            <DailySummaryCard
              onGenerateReport={() => setActiveTab('ai-summaries')}
            />
          )}
        </div>
      </div>

      {/* Modular Dashboard Customizer Modal */}
      <DashboardCustomizerModal />
    </div>
  )
}
