import { useProfile } from '../../hooks/useProfile'
import { tasksForToday } from '../../lib/taskDates'
import React, { useState, useMemo } from 'react'
import { TaskItemData, TaskFilter, ViewMode } from '../../types/item'
import { useNavigationStore } from '../../store/navigationStore'
import { useDashboardConfigStore } from '../../store/dashboardConfigStore'
import { useAppStore } from '../../store/useAppStore'
import { DashboardHeader } from './components/DashboardHeader'
import { FocusHeroCard } from './components/FocusHeroCard'
import { DashboardTaskList } from './components/DashboardTaskList'
import { ProductivityMetrics } from './components/ProductivityMetrics'
import { RecentAudioWidget } from './components/RecentAudioWidget'
import { DailySummaryCard } from './components/DailySummaryCard'
import { DashboardCustomizerModal } from './DashboardCustomizerModal'

export const DashboardOverview: React.FC = () => {
  const { name: userName } = useProfile()
  const { items, toggleTask } = useAppStore()
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const { setActiveTab } = useNavigationStore()
  const { modules } = useDashboardConfigStore()

  // Convert real store tasks to TaskItemData
  const tasks: TaskItemData[] = useMemo(() => {
    return items
      .filter((i) => {
        if (i.type !== 'task') return false
        return true
      })
      .map((item) => {
        let categoryClass = 'text-outline'
        if (item.categoryTag.includes('Аналитик') || item.categoryTag.includes('Метрик')) {
          categoryClass = 'text-tertiary'
        } else if (item.categoryTag.includes('Разработк') || item.categoryTag.includes('Код')) {
          categoryClass = 'text-primary'
        } else if (item.categoryTag.includes('Дизайн')) {
          categoryClass = 'text-secondary'
        }

        return {
          id: item.id,
          title: item.title,
          category: item.categoryTag,
          categoryClass,
          time: item.dueTime || item.dueDate || '',
          priority: item.priority,
          dueDate: item.dueDate,
          dueTime: item.dueTime,
          startDate: item.startDate,
          deadline: item.deadline,
          isCompleted: item.status === 'completed',
          hasAudio: Boolean(item.audioUrl || item.audioDuration),
          audioDuration: item.audioDuration ? `${Math.floor(item.audioDuration / 60)}:${String(item.audioDuration % 60).padStart(2, '0')}` : undefined,
          noteSubtitle: item.description,
          completedTime: item.completedAt ? `Выполнено` : undefined,
          isFocused: Boolean(item.isFocus || item.isFocused),
          tags: item.tags,
          estimatedMinutes: item.estimatedMinutes,
        }
      })
  }, [items])

  const handleToggleTask = (id: string) => {
    toggleTask(id).catch(() => {})
  }

  const todayTasks = tasksForToday(items)
  const completedCount = todayTasks.filter((t) => t.status === 'completed').length
  const totalCount = todayTasks.length
  const plannedCount = totalCount - completedCount

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Header with Greetings and Actions */}
      <DashboardHeader
        userName={userName}
        onNewNote={() => setActiveTab('notes')}
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Main Column */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* Hero Priority Focus Task */}
          {modules.focusTask && (
            <FocusHeroCard
              onSummary={() => setActiveTab('ai-summaries')}
            />
          )}

          {/* Tasks List / Board with Filters & Interactive Sorting */}
          {modules.taskList && (
            <DashboardTaskList
              tasks={tasks}
              filter={filter}
              onFilterChange={setFilter}
              onToggleTask={handleToggleTask}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </div>

        {/* Right Secondary Column */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          {/* Productivity Stats Bento Cards (Cleaned up, no sprint badge) */}
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
              memos={items.filter((item) => item.audioUrl && item.status !== 'archived').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3).map((item) => ({ id: item.id, title: item.title, audioUrl: item.audioUrl, duration: `${Math.floor((item.audioDuration || 0) / 60)}:${String((item.audioDuration || 0) % 60).padStart(2, '0')}`, time: new Date(item.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }))}
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
