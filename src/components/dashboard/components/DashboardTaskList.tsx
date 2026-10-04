import React from 'react'
import { TaskItemData, TaskFilter, ViewMode } from '../../../types/item'
import { DashboardTaskItem } from './DashboardTaskItem'
import { EmptyState } from '../../ui/EmptyState'

export interface DashboardTaskListProps {
  tasks: TaskItemData[]
  filter: TaskFilter
  onFilterChange: (filter: TaskFilter) => void
  onToggleTask: (id: string) => void
  viewMode?: ViewMode
}

export const DashboardTaskList: React.FC<DashboardTaskListProps> = ({
  tasks,
  filter,
  onFilterChange,
  onToggleTask,
  viewMode = 'list',
}) => {
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'urgent') return t.isUrgent
    if (filter === 'voice') return t.hasAudio
    if (filter === 'summaries') return t.category === '#Аналитика' || t.isUrgent
    return true
  })

  const urgentCount = tasks.filter((t) => t.isUrgent).length
  const voiceCount = tasks.filter((t) => t.hasAudio).length

  return (
    <section className="flex flex-col gap-space-md">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center justify-between pb-space-xs flex-wrap gap-space-xs">
        <div className="flex items-center gap-space-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Все <span className="text-xs opacity-75">{tasks.length}</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('urgent')}
            className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
              filter === 'urgent'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Срочные{' '}
            <span className="text-xs text-error">{urgentCount}</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('voice')}
            className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'voice'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>Голосовые</span>
            <span className="text-xs opacity-75">{voiceCount}</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('summaries')}
            className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
              filter === 'summaries'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Сводки <span className="text-xs opacity-75">1</span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
          <span>Сортировка:</span>
          <button
            type="button"
            className="text-on-surface hover:text-primary flex items-center gap-0.5 cursor-pointer"
          >
            <span>По приоритету</span>
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
        </div>
      </div>

      {/* Task Items Container */}
      <div
        id="tasks-container"
        className={
          viewMode === 'board'
            ? 'grid grid-cols-1 sm:grid-cols-2 gap-space-sm'
            : 'flex flex-col gap-space-sm'
        }
      >
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="Нет задач в этой категории"
            description="Все задачи по выбранному фильтру выполнены или еще не созданы."
            className="col-span-full py-space-xl"
          />
        ) : (
          filteredTasks.map((t) => (
            <DashboardTaskItem
              key={t.id}
              task={t}
              onToggle={onToggleTask}
              isCompact={viewMode === 'board'}
            />
          ))
        )}
      </div>
    </section>
  )
}
