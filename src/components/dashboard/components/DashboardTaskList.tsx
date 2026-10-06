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
  onViewModeChange?: (mode: ViewMode) => void
}

export const DashboardTaskList: React.FC<DashboardTaskListProps> = ({
  tasks,
  filter,
  onFilterChange,
  onToggleTask,
  viewMode = 'list',
  onViewModeChange,
}) => {
  const {
    sortBy,
    sortDirection,
    setSort,
    setFocusedTask,
    isSelectMode,
    selectedTaskIds,
    toggleSelectTask,
    updateItem,
  } = useAppStore()

  const { openDrawer } = useDrawerStore()

  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return tasks.filter((t) => {
      if (filter === 'urgent') return t.isUrgent
      if (filter === 'overdue') return t.dueDate && t.dueDate < todayStr && !t.isCompleted
      return true
    })
  }, [tasks, filter])

  // Sort tasks according to criteria and direction
  const { sortedTasks, unscheduledTasks } = useMemo(() => {
    let list = [...filteredTasks]

    if (sortBy === 'priority') {
      const pWeights: Record<string, number> = { high: 3, medium: 2, low: 1 }
      list.sort((a, b) => {
        const pA = a.isUrgent ? pWeights.high : pWeights.medium
        const pB = b.isUrgent ? pWeights.high : pWeights.medium
        return sortDirection === 'asc' ? pB - pA : pA - pB
      })
    } else if (sortBy === 'created') {
      if (sortDirection === 'desc') {
        list.reverse()
      }
    } else if (sortBy === 'title') {
      list.sort((a, b) => {
        return sortDirection === 'asc'
          ? a.title.localeCompare(b.title, 'ru')
          : b.title.localeCompare(a.title, 'ru')
      })
    } else if (sortBy === 'manual') {
      if (sortDirection === 'desc') {
        list.reverse()
      }
    }

    let finalSorted = list
    let finalUnscheduled: TaskItemData[] = []

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

      finalSorted = withTime
      finalUnscheduled = withoutTime
    }

    // Move completed to bottom, overdue to top (sorted by date/time ascending)
    const sortSpecial = (arr: TaskItemData[]) => {
      const todayStr = new Date().toISOString().split('T')[0]
      
      return [...arr].sort((a, b) => {
        if (a.isCompleted && !b.isCompleted) return 1
        if (!a.isCompleted && b.isCompleted) return -1
        if (a.isCompleted && b.isCompleted) return 0

        const isOverdueA = a.dueDate && a.dueDate < todayStr
        const isOverdueB = b.dueDate && b.dueDate < todayStr

        if (isOverdueA && !isOverdueB) return -1
        if (!isOverdueA && isOverdueB) return 1

        if (isOverdueA && isOverdueB) {
          const dateA = a.dueDate || ''
          const dateB = b.dueDate || ''
          if (dateA !== dateB) return dateA.localeCompare(dateB)
          
          const timeA = a.time || ''
          const timeB = b.time || ''
          return timeA.localeCompare(timeB)
        }

        return 0
      })
    }

    return { 
      sortedTasks: sortSpecial(finalSorted), 
      unscheduledTasks: sortSpecial(finalUnscheduled) 
    }
  }, [filteredTasks, sortBy, sortDirection])

  const urgentCount = tasks.filter((t) => t.isUrgent).length
  const todayStr = new Date().toISOString().split('T')[0]
  const overdueCount = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && !t.isCompleted).length

  const handleRescheduleToday = (id: string) => {
    updateItem(id, { dueDate: todayStr }).catch(() => {})
  }


  return (
    <section className="flex flex-col gap-space-md">
      {/* Sub-navigation Tabs and Sort / Bulk Controls */}
      <div className="flex items-center justify-between pb-space-xs flex-wrap gap-2">
        {/* Filters */}
        <div className="flex items-center gap-space-xs overflow-x-auto" role="group" aria-label="Фильтры задач">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded-xl font-label-md text-label-md transition-all duration-200 cursor-pointer border ${
              filter === 'all'
                ? 'bg-primary/15 text-primary font-medium border-primary/25 shadow-xs'
                : 'border-transparent text-outline hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            Все <span className="text-xs opacity-75">{tasks.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === 'urgent'}
            onClick={() => onFilterChange('urgent')}
            className={`px-3 py-1 rounded-xl font-label-md text-label-md transition-all duration-200 cursor-pointer border ${
              filter === 'urgent'
                ? 'bg-primary/15 text-primary font-medium border-primary/25 shadow-xs'
                : 'border-transparent text-outline hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            Срочные <span className={`text-xs ${urgentCount > 0 ? 'text-error font-medium' : 'opacity-75'}`}>{urgentCount}</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === 'overdue'}
            onClick={() => onFilterChange('overdue')}
            className={`px-3 py-1 rounded-xl font-label-md text-label-md transition-all duration-200 flex items-center gap-1 cursor-pointer border ${
              filter === 'overdue'
                ? 'bg-primary/15 text-primary font-medium border-primary/25 shadow-xs'
                : 'border-transparent text-outline hover:text-on-surface hover:bg-surface-container-high/40'
            }`}
          >
            <span>Просроченные</span>
            <span className={`text-xs ${overdueCount > 0 ? 'text-error font-medium' : 'opacity-75'}`}>{overdueCount}</span>
          </button>
        </div>

        {/* Right Controls: Multiselect & TaskSortMenu */}
        <div className="flex items-center gap-2.5">
          {/* View switcher */}
          {onViewModeChange && (
            <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hidden sm:flex">
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                aria-label="Переключить на вид список"
                className={`px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-surface-container-high text-on-surface shadow-sm font-medium'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">view_agenda</span>
                <span>Список</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('board')}
                aria-label="Переключить на вид доска"
                className={`px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-surface-container-high text-on-surface shadow-sm font-medium'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">dashboard</span>
                <span>Доска</span>
              </button>
            </div>
          )}

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
