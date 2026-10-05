import React, { useMemo } from 'react'
import { TaskItemData, TaskFilter, ViewMode } from '../../../types/item'
import { DashboardTaskItem } from './DashboardTaskItem'
import { TaskSortMenu } from './TaskSortMenu'
import { EmptyState } from '../../ui/EmptyState'
import { useAppStore } from '../../../store/useAppStore'
import { useDrawerStore } from '../../../store/useDrawerStore'
import { BulkActionToolbar } from '../../tasks/BulkActionToolbar'

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
  const {
    sortBy,
    sortDirection,
    setSort,
    setFocusedTask,
    isSelectMode,
    setSelectMode,
    selectedTaskIds,
    toggleSelectTask,
    updateItem,
  } = useAppStore()

  const { openDrawer } = useDrawerStore()

  // Filter tasks based on active category tab
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'urgent') return t.isUrgent
      if (filter === 'voice') return t.hasAudio
      if (filter === 'summaries') return t.category === '#Аналитика' || t.isUrgent
      return true
    })
  }, [tasks, filter])

  // Sort tasks according to criteria and direction
  const { sortedTasks, unscheduledTasks } = useMemo(() => {
    const list = [...filteredTasks]

    if (sortBy === 'priority') {
      const pWeights: Record<string, number> = { high: 3, medium: 2, low: 1 }
      list.sort((a, b) => {
        const pA = a.isUrgent ? pWeights.high : pWeights.medium
        const pB = b.isUrgent ? pWeights.high : pWeights.medium
        return sortDirection === 'asc' ? pB - pA : pA - pB
      })
      return { sortedTasks: list, unscheduledTasks: [] }
    }

    if (sortBy === 'time') {
      const withTime: TaskItemData[] = []
      const withoutTime: TaskItemData[] = []

      list.forEach((t) => {
        if (t.time && t.time.includes(':')) {
          withTime.push(t)
        } else {
          withoutTime.push(t)
        }
      })

      withTime.sort((a, b) => {
        const timeA = a.time || ''
        const timeB = b.time || ''
        return sortDirection === 'asc'
          ? timeA.localeCompare(timeB)
          : timeB.localeCompare(timeA)
      })

      return { sortedTasks: withTime, unscheduledTasks: withoutTime }
    }

    if (sortBy === 'created') {
      // Invert or normal
      if (sortDirection === 'desc') {
        list.reverse()
      }
      return { sortedTasks: list, unscheduledTasks: [] }
    }

    if (sortBy === 'title') {
      list.sort((a, b) => {
        return sortDirection === 'asc'
          ? a.title.localeCompare(b.title, 'ru')
          : b.title.localeCompare(a.title, 'ru')
      })
      return { sortedTasks: list, unscheduledTasks: [] }
    }

    // 'manual' - preserve original order
    if (sortDirection === 'desc') {
      list.reverse()
    }
    return { sortedTasks: list, unscheduledTasks: [] }
  }, [filteredTasks, sortBy, sortDirection])

  const urgentCount = tasks.filter((t) => t.isUrgent).length
  const voiceCount = tasks.filter((t) => t.hasAudio).length

  const handleRescheduleToday = (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0]
    updateItem(id, { dueDate: todayStr }).catch(() => {})
  }

  return (
    <section className="flex flex-col gap-space-md">
      {/* Sub-navigation Tabs and Sort / Bulk Controls */}
      <div className="flex items-center justify-between pb-space-xs flex-wrap gap-2">
        {/* Filters */}
        <div className="flex items-center gap-space-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-primary-container text-on-primary-container shadow-xs'
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
                ? 'bg-primary-container text-on-primary-container shadow-xs'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Срочные <span className="text-xs text-error font-semibold">{urgentCount}</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('voice')}
            className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'voice'
                ? 'bg-primary-container text-on-primary-container shadow-xs'
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
                ? 'bg-primary-container text-on-primary-container shadow-xs'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Сводки <span className="text-xs opacity-75">1</span>
          </button>
        </div>

        {/* Right Controls: Multiselect & TaskSortMenu */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSelectMode(!isSelectMode)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              isSelectMode
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-outline hover:text-on-surface hover:bg-surface-container-low border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSelectMode ? 'close' : 'checklist'}
            </span>
            <span>{isSelectMode ? 'Отмена' : 'Выбрать'}</span>
          </button>

          <TaskSortMenu
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={(by, dir) => setSort(by, dir)}
          />
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
        {sortedTasks.length === 0 && unscheduledTasks.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="Нет задач в этой категории"
            description="Все задачи по выбранному фильтру выполнены или еще не созданы."
            className="col-span-full py-space-xl"
          />
        ) : (
          <>
            {sortedTasks.map((t) => (
              <DashboardTaskItem
                key={t.id}
                task={t}
                onToggle={onToggleTask}
                isCompact={viewMode === 'board'}
                isSelectMode={isSelectMode}
                isSelected={selectedTaskIds.includes(t.id)}
                onSelect={toggleSelectTask}
                onSetFocus={(id) => setFocusedTask(id)}
                onRescheduleToday={handleRescheduleToday}
                onClickItem={(id) => openDrawer(id)}
              />
            ))}

            {/* Separator for Unscheduled Tasks when sorting by time */}
            {sortBy === 'time' && unscheduledTasks.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-2 col-span-full">
                  <div className="h-px bg-outline-variant/30 flex-1" />
                  <span className="text-xs font-semibold text-outline uppercase tracking-wider">
                    Без точного времени ({unscheduledTasks.length})
                  </span>
                  <div className="h-px bg-outline-variant/30 flex-1" />
                </div>

                {unscheduledTasks.map((t) => (
                  <DashboardTaskItem
                    key={t.id}
                    task={t}
                    onToggle={onToggleTask}
                    isCompact={viewMode === 'board'}
                    isSelectMode={isSelectMode}
                    isSelected={selectedTaskIds.includes(t.id)}
                    onSelect={toggleSelectTask}
                    onSetFocus={(id) => setFocusedTask(id)}
                    onRescheduleToday={handleRescheduleToday}
                    onClickItem={(id) => openDrawer(id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Floating Toolbar for Bulk Operations */}
      <BulkActionToolbar />
    </section>
  )
}
