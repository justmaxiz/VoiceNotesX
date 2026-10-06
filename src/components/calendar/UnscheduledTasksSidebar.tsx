import React from 'react'
import { localDateKey } from '../../lib/taskDates'
import { Item } from '../../types/item'
import { useDrawerStore } from '../../store/useDrawerStore'

export interface UnscheduledTasksSidebarProps {
  tasks: Item[]
  isOpen: boolean
  onToggle: () => void
  onAssignDate: (task: Item, dateStr: string) => void
}

export const UnscheduledTasksSidebar: React.FC<UnscheduledTasksSidebarProps> = ({
  tasks,
  isOpen,
  onToggle,
  onAssignDate,
}) => {
  const { openDrawer } = useDrawerStore()
  const todayStr = localDateKey()

  return (
    <aside
      className={`rounded-2xl bg-surface-container-low border border-outline-variant/20 transition-all flex flex-col ${
        isOpen ? 'w-full md:w-80 p-4' : 'w-auto p-2 self-start'
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-outline-variant/15">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base text-outline">inbox</span>
          {isOpen && <span>Бэклог без даты ({tasks.length})</span>}
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? 'Свернуть бэклог' : 'Развернуть бэклог'}
          className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">
            {isOpen ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-2 mt-3 max-h-[500px] overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-outline text-xs">
              Все задачи имеют даты дедлайнов!
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', task.id)
                }}
                onClick={() => openDrawer(task.id)}
                className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/15 hover:border-primary/40 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors truncate">
                    {task.title}
                  </span>
                  <span className="material-symbols-outlined text-xs text-outline opacity-40 group-hover:opacity-100">
                    drag_indicator
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-outline mt-1.5 pt-1 border-t border-outline-variant/15">
                  <span>{task.categoryTag}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAssignDate(task, todayStr)
                    }}
                    title="Запланировать на сегодня"
                    className="hover:text-primary transition-colors cursor-pointer text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest"
                  >
                    + На сегодня
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  )
}
