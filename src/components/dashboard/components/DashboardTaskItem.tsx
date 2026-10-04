import React from 'react'
import { TaskItemData } from '../../../types/item'

export interface DashboardTaskItemProps {
  task: TaskItemData
  onToggle: (id: string) => void
  isCompact?: boolean
}

export const DashboardTaskItem: React.FC<DashboardTaskItemProps> = ({
  task,
  onToggle,
  isCompact = false,
}) => {
  return (
    <div
      className={`flex ${
        isCompact ? 'flex-col gap-space-sm' : 'items-center justify-between'
      } p-space-md rounded-xl transition-all group shadow-sm border border-surface-container-high/20 ${
        task.isCompleted
          ? 'bg-surface-container-lowest/60 hover:bg-surface-container-low opacity-60'
          : 'bg-surface-container-low hover:bg-surface-container'
      }`}
    >
      <div className="flex items-center gap-space-md min-w-0">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={() => onToggle(task.id)}
          aria-label={`Отметить задачу: ${task.title}`}
          className="w-5 h-5 rounded bg-surface-container-highest checked:bg-secondary checked:text-on-secondary accent-secondary cursor-pointer shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span
            className={`font-headline-sm text-headline-sm truncate transition-colors ${
              task.isCompleted
                ? 'text-outline line-through'
                : 'text-on-surface group-hover:text-primary'
            }`}
          >
            {task.title}
          </span>
          <div className="flex items-center gap-space-xs mt-1 flex-wrap font-label-sm text-label-sm">
            <span
              className={`px-space-xs py-0.5 rounded bg-surface-container-highest ${task.categoryClass}`}
            >
              {task.category}
            </span>

            {task.hasAudio && (
              <span className="flex items-center gap-1 text-secondary px-space-xs py-0.5 rounded bg-surface-container">
                <span className="material-symbols-outlined text-label-sm">mic</span>
                {task.audioDuration}
              </span>
            )}

            {task.noteSubtitle && (
              <span className="text-outline">{task.noteSubtitle}</span>
            )}

            {task.completedTime && (
              <span className="text-secondary font-label-sm text-label-sm flex items-center gap-0.5">
                <span className="material-symbols-outlined text-label-sm">
                  check_circle
                </span>
                {task.completedTime}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-space-md shrink-0 ${isCompact ? 'justify-between pt-1' : ''}`}>
        {!task.isCompleted && (
          <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-body-md text-outline">
              alarm
            </span>
            <span>{task.time}</span>
          </div>
        )}
        <button
          type="button"
          aria-label="Опции задачи"
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-md">more_vert</span>
        </button>
      </div>
    </div>
  )
}
