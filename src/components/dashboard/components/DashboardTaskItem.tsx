import React from 'react'
import { TaskItemData } from '../../../types/item'
import { Checkbox } from '../../ui/Checkbox'

export interface DashboardTaskItemProps {
  task: TaskItemData
  onToggle: (id: string) => void
  isCompact?: boolean
  isSelectMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  onSetFocus?: (id: string) => void
  onRescheduleToday?: (id: string) => void
  onClickItem?: (id: string) => void
}

export const DashboardTaskItem: React.FC<DashboardTaskItemProps> = ({
  task,
  onToggle,
  isCompact = false,
  isSelectMode = false,
  isSelected = false,
  onSelect,
  onSetFocus,
  onRescheduleToday,
  onClickItem,
}) => {
  const todayStr = new Date().toISOString().split('T')[0]
  const isOverdue = Boolean(
    !task.isCompleted &&
    task.dueDate &&
    task.dueDate.includes('-') &&
    task.dueDate < todayStr
  )

  const handleCardClick = () => {
    if (isSelectMode && onSelect) {
      onSelect(task.id)
    } else if (onClickItem) {
      onClickItem(task.id)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`relative flex ${
        isCompact ? 'flex-col gap-space-sm' : 'items-center justify-between'
      } p-space-md rounded-2xl transition-all duration-200 group shadow-xs border ${
        task.isFocused
          ? 'border-primary/50 ring-1 ring-primary/30 bg-surface-container-low'
          : 'border-outline-variant/20 hover:border-outline-variant/40'
      } ${
        task.isCompleted
          ? 'bg-surface-container-lowest/40 hover:bg-surface-container-low/70'
          : 'bg-surface-container-low hover:bg-surface-container'
      } ${isSelectMode ? 'cursor-pointer' : ''}`}
    >
      <div className={`flex ${isCompact ? 'items-start' : 'items-center'} gap-3 min-w-0 flex-1`}>
        {/* Multi-selection Checkbox when select mode is active */}
        {isSelectMode && (
          <div onClick={(e) => e.stopPropagation()} className={`shrink-0 ${isCompact ? 'pt-0.5' : ''}`}>
            <Checkbox
              checked={isSelected}
              onChange={() => onSelect?.(task.id)}
              size="sm"
              ariaLabel={`Выбрать задачу для групповых действий: ${task.title}`}
            />
          </div>
        )}

        {/* Task Completion Checkbox */}
        <div onClick={(e) => e.stopPropagation()} className={`shrink-0 ${isCompact ? 'pt-0.5' : ''}`}>
          <Checkbox
            checked={task.isCompleted}
            onChange={() => onToggle(task.id)}
            size="md"
            ariaLabel={`Отметить задачу: ${task.title}`}
          />
        </div>

        {/* Task Title & Tags */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-headline-sm text-headline-sm truncate transition-colors ${
                task.isCompleted
                  ? 'line-through text-outline'
                  : 'text-on-surface group-hover:text-primary'
              }`}
            >
              {task.title}
            </span>

            {task.isFocused && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium flex items-center gap-1 border border-primary/20">
                В фокусе
              </span>
            )}
          </div>

          <div className="flex items-center gap-space-xs mt-1 flex-wrap font-label-sm text-label-sm">
            <span
              className={`px-2 py-0.5 rounded-md bg-surface-container-high/60 text-xs font-medium ${task.categoryClass}`}
            >
              {task.category}
            </span>

            {task.hasAudio && (
              <span className="inline-flex items-center gap-1 text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container text-xs">
                <span className="material-symbols-outlined text-[13px] text-primary">mic</span>
                {task.audioDuration}
              </span>
            )}

            {task.noteSubtitle && (
              <span className="text-outline text-xs truncate max-w-xs">{task.noteSubtitle}</span>
            )}

            {task.completedTime && task.completedTime !== 'Выполнено' && (
              <span className="text-outline/80 text-xs font-normal">
                {task.completedTime}
              </span>
            )}

            {isOverdue && (
              <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-[11px] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">warning</span>
                Просрочено
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions & Meta */}
      <div
        className={`flex items-center ${
          isCompact
            ? 'justify-between w-full pt-2 border-t border-surface-container-high/30 mt-1'
            : 'gap-space-md shrink-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side in Compact: Overdue + Time */}
        <div className="flex items-center gap-2">
          {isOverdue && onRescheduleToday && (
            <button
              type="button"
              onClick={() => onRescheduleToday(task.id)}
              className="text-xs px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-highest text-primary transition-colors cursor-pointer"
            >
              На сегодня
            </button>
          )}

          {!task.isCompleted && task.time && (
            <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
              <span className="material-symbols-outlined text-body-md text-outline">
                alarm
              </span>
              <span>{task.time}</span>
            </div>
          )}
        </div>

        {/* Right Side Actions: Focus target and More options grouped together */}
        <div className="flex items-center gap-1 ml-auto">
          {!task.isCompleted && onSetFocus && (
            <button
              type="button"
              onClick={() => onSetFocus(task.id)}
              title={task.isFocused ? 'Задача уже в фокусе' : 'Сделать главной задачей дня (В фокус)'}
              aria-label={task.isFocused ? 'Задача уже в фокусе' : 'Сделать главной задачей дня'}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                task.isFocused
                  ? 'text-primary bg-primary/15'
                  : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 text-outline hover:text-primary hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-body-md">target</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onClickItem?.(task.id)}
            aria-label="Открыть подробности задачи"
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded-lg hover:bg-surface-container-highest text-outline hover:text-on-surface transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-body-md">more_vert</span>
          </button>
        </div>
      </div>
    </div>
  )
}
