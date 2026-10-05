import React, { useEffect, useRef } from 'react'
import { Item } from '../../types/item'
import { Checkbox } from '../ui/Checkbox'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useAppStore } from '../../store/useAppStore'

export interface DayTasksPopoverProps {
  dateLabel: string
  tasks: Item[]
  onClose: () => void
}

export const DayTasksPopover: React.FC<DayTasksPopoverProps> = ({
  dateLabel,
  tasks,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const { openDrawer } = useDrawerStore()
  const { toggleTask } = useAppStore()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Все задачи на ${dateLabel}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/30 shadow-2xl p-5 flex flex-col gap-3 text-on-surface animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div>
            <h3 className="text-title-md font-semibold">{dateLabel}</h3>
            <span className="text-xs text-outline">
              Всего {tasks.length} {tasks.length === 1 ? 'дело' : tasks.length < 5 ? 'дела' : 'дел'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                openDrawer(task.id)
                onClose()
              }}
              className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={task.status === 'completed'}
                    onChange={() => toggleTask(task.id)}
                    size="sm"
                    ariaLabel={`Выполнить: ${task.title}`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs font-medium truncate ${
                      task.status === 'completed'
                        ? 'line-through text-outline opacity-60'
                        : 'text-on-surface group-hover:text-primary transition-colors'
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-outline mt-0.5">
                    <span>{task.categoryTag}</span>
                    {task.dueTime && <span>• {task.dueTime}</span>}
                  </div>
                </div>
              </div>

              <span className="material-symbols-outlined text-outline group-hover:text-primary text-sm opacity-50 group-hover:opacity-100">
                arrow_forward
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
