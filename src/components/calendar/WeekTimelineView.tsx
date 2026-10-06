import React, { useState } from 'react'
import { Item } from '../../types/item'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { getTaskTemporalStatus } from '../../lib/focusLogic'
import { HOUR_HEIGHT, START_HOUR, END_HOUR, layoutDayTasks } from '../../lib/calendarLayout'
import { taskDeadline, localTime } from '../../lib/taskDates'
import { DayTasksPopover } from './DayTasksPopover'

export interface WeekTimelineViewProps {
  weekDays: Array<{ day: string; dateKey: string; isToday: boolean }>
  items: Item[]
  getCategoryBorder: (categoryTag: string, title: string) => string
}

export const WeekTimelineView: React.FC<WeekTimelineViewProps> = ({ weekDays, items, getCategoryBorder }) => {
  const { openDrawer } = useDrawerStore()
  const { openQuickCapture } = useQuickCaptureStore()
  const [activePopoverDay, setActivePopoverDay] = useState<{ dateLabel: string; tasks: Item[] } | null>(null)
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  return <>
    <div className="overflow-x-auto rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4">
    <div className="flex gap-2" style={{ minWidth: weekDays.length > 1 ? 760 : undefined }}>
      <div className="w-12 shrink-0 text-xs font-mono text-outline">
        <div className="h-24">Время</div>
        {hours.map((hour) => <div key={hour} style={{ height: HOUR_HEIGHT }}>{String(hour).padStart(2, '0')}:00</div>)}
        <div>22:00</div>
      </div>
      {weekDays.map((day) => {
        const { positionedTasks, allDayTasks, offHoursTasks } = layoutDayTasks(items, day.dateKey)
        return <div key={day.dateKey} className="flex-1 min-w-0">
          <div className="h-24 overflow-hidden text-on-surface">
            <div className={`text-xs font-semibold mb-1 ${day.isToday ? 'text-secondary' : ''}`}>{day.day}</div>
            {allDayTasks.slice(0, 2).map((task) => <button key={task.id} title={task.title} className="mb-0.5 block h-5 w-full truncate rounded bg-surface-container-high px-2 text-left text-xs leading-5 hover:bg-surface-container-highest" onClick={() => openDrawer(task.id)}>{task.title} · Весь день</button>)}
            {allDayTasks.length > 2 && <button type="button" onClick={() => setActivePopoverDay({ dateLabel: new Date(`${day.dateKey}T12:00:00`).toLocaleDateString('ru-RU'), tasks: allDayTasks })} className="mt-0.5 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-outline hover:text-primary transition-colors">+ еще {allDayTasks.length - 2}</button>}
          </div>
          <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
            {hours.map((hour) => <button key={hour} aria-label={`Создать задачу ${day.dateKey} ${hour}:00`}
              className="absolute w-full border-t border-outline-variant/20 hover:bg-surface-container/30 cursor-pointer"
              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              onClick={() => openQuickCapture({ entityType: 'task', dueDate: day.dateKey, dueTime: `${String(hour).padStart(2, '0')}:00` })} />)}
            {positionedTasks.map(({ task, top, height, column, totalColumns }) => {
              const status = getTaskTemporalStatus(task)
              return <button key={task.id} data-testid={`calendar-event-${task.id}`} onClick={() => openDrawer(task.id)}
                className={`absolute rounded-lg border-l-4 ${getCategoryBorder(task.categoryTag, task.title)} bg-surface-container text-on-surface text-left px-2 overflow-hidden border border-outline-variant/30 hover:bg-surface-container-high ${task.isFocus || task.isFocused ? 'ring-1 ring-primary' : ''}`}
                style={{ top, height, left: `${column * 100 / totalColumns}%`, width: `${100 / totalColumns}%` }}>
                <div className="text-xs font-medium truncate">{task.title}</div>
                {height > 35 && <div className="text-[11px] text-on-surface-variant">{localTime(taskDeadline(task)!)}{status === 'overdue' ? ' · Просрочена' : status === 'current' ? ' · Сейчас' : ''}</div>}
              </button>
            })}
          </div>
          {offHoursTasks.length > 0 && <div className="mt-2 border-t border-outline-variant/20 pt-2">
            <div className="text-xs text-on-surface-variant mb-1">Вне 08:00–22:00</div>
            {offHoursTasks.map((task) => <button key={task.id} data-testid={`calendar-event-${task.id}`}
              className="block w-full text-left text-xs rounded bg-surface-container-high p-2 mb-1 text-on-surface"
              onClick={() => openDrawer(task.id)}>{task.title} · {localTime(taskDeadline(task)!)}</button>)}
          </div>}
        </div>
      })}
    </div>
    </div>
    {activePopoverDay && <DayTasksPopover {...activePopoverDay} onClose={() => setActivePopoverDay(null)} />}
  </>
}
