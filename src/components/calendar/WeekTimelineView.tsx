import React from 'react'
import { Item } from '../../types/item'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'

export interface WeekTimelineViewProps {
  weekDays: Array<{ day: string; dateKey: string; isToday: boolean }>
  items: Item[]
  getCategoryBorder: (categoryTag: string, title: string) => string
}

export const WeekTimelineView: React.FC<WeekTimelineViewProps> = ({
  weekDays,
  items,
  getCategoryBorder,
}) => {
  const { openDrawer } = useDrawerStore()
  const { openQuickCapture } = useQuickCaptureStore()
  const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00 - 22:00

  // Filter tasks per day
  const getTasksForDay = (dateKey: string) => {
    return items.filter((item) => {
      if (item.type !== 'task' || item.status === 'archived') return false
      if (item.dueDate && item.dueDate.startsWith(dateKey)) return true
      // fallback for seed tasks with plain times on today
      const todayStr = new Date().toISOString().split('T')[0]
      if (dateKey === todayStr && item.dueDate && item.dueDate.includes(':') && !item.dueDate.includes('-')) {
        return true
      }
      return false
    })
  }

  return (
    <div className="flex flex-col rounded-2xl bg-surface-container-low border border-outline-variant/20 overflow-x-auto">
      {/* Week Header */}
      <div className="grid grid-cols-8 border-b border-outline-variant/20 min-w-[760px] bg-surface-container-high/40">
        <div className="p-3 text-xs text-outline font-mono text-center border-r border-outline-variant/15 flex items-center justify-center">
          Время
        </div>

        {weekDays.map((col) => (
          <div
            key={col.dateKey}
            className={`p-3 text-center border-r border-outline-variant/15 last:border-r-0 ${
              col.isToday ? 'bg-primary/10' : ''
            }`}
          >
            <div
              className={`text-xs font-semibold ${
                col.isToday ? 'text-primary' : 'text-on-surface'
              }`}
            >
              {col.day}
            </div>
            {col.isToday && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary mt-1 shadow-[0_0_6px_rgba(78,222,163,0.8)]" />
            )}
          </div>
        ))}
      </div>

      {/* All-Day Section */}
      <div className="grid grid-cols-8 border-b border-outline-variant/20 min-w-[760px] bg-surface-container/30">
        <div className="p-2 text-[11px] text-outline text-center border-r border-outline-variant/15 flex items-center justify-center font-medium">
          Весь день
        </div>
        {weekDays.map((col) => {
          const allDayTasks = getTasksForDay(col.dateKey).filter((t) => t.isAllDay)
          return (
            <div
              key={`allday-${col.dateKey}`}
              className="p-1.5 border-r border-outline-variant/15 last:border-r-0 min-h-[36px] flex flex-col gap-1"
            >
              {allDayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => openDrawer(task.id)}
                  className="px-2 py-1 rounded bg-secondary-container/20 text-secondary border border-secondary/30 text-[10px] font-semibold truncate cursor-pointer hover:opacity-90"
                >
                  {task.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Hourly Grid (08:00 - 22:00) */}
      <div className="min-w-[760px] divide-y divide-outline-variant/15">
        {hours.map((hour) => {
          const hourStr = `${hour.toString().padStart(2, '0')}:00`

          return (
            <div key={hour} className="grid grid-cols-8 min-h-[56px] group">
              {/* Hour Label */}
              <div className="p-2 text-xs font-mono text-outline text-center border-r border-outline-variant/15 bg-surface-container-low/60 flex items-start justify-center">
                {hourStr}
              </div>

              {/* Day cells for this hour */}
              {weekDays.map((col) => {
                const dayTasks = getTasksForDay(col.dateKey).filter((t) => {
                  if (t.isAllDay) return false
                  const time = t.dueTime || (t.dueDate?.includes(':') ? t.dueDate : null)
                  if (!time) return false
                  const taskHour = parseInt(time.split(':')[0], 10)
                  return taskHour === hour
                })

                return (
                  <div
                    key={`${col.dateKey}-${hour}`}
                    onClick={() =>
                      openQuickCapture({
                        entityType: 'task',
                        initialText: `Задача на ${col.day} в ${hourStr}: `,
                      })
                    }
                    className={`p-1.5 border-r border-outline-variant/15 last:border-r-0 relative hover:bg-surface-container/50 cursor-pointer transition-colors ${
                      col.isToday ? 'bg-primary/5' : ''
                    }`}
                  >
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          openDrawer(task.id)
                        }}
                        className={`p-1.5 rounded-lg text-[11px] leading-snug border-l-[3px] ${getCategoryBorder(
                          task.categoryTag,
                          task.title
                        )} bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 shadow-xs cursor-pointer truncate font-medium text-on-surface`}
                      >
                        <div className="truncate">{task.title}</div>
                        <div className="text-[10px] text-outline mt-0.5">
                          {task.dueTime || task.dueDate}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
