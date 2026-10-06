import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { UnscheduledTasksSidebar } from './UnscheduledTasksSidebar'
import { DayTasksPopover } from './DayTasksPopover'
import { WeekTimelineView } from './WeekTimelineView'
import { Item } from '../../types/item'
import { itemsForDay } from '../../lib/calendarLayout'
import { localDateKey, taskDeadline } from '../../lib/taskDates'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type CalendarViewMode = 'month' | 'week' | 'day'

export const CalendarPage: React.FC = () => {
  const { items, updateItem } = useAppStore()
  const { openDrawer } = useDrawerStore()
  const { openQuickCapture } = useQuickCaptureStore()
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activePopoverDay, setActivePopoverDay] = useState<{ dateLabel: string; tasks: Item[] } | null>(null)
  const todayStr = localDateKey()
  const selectedYear = selectedDate.getFullYear()
  const selectedMonth = selectedDate.getMonth()
  const unscheduledTasks = items.filter((i) => i.type === 'task' && i.status !== 'archived' && !taskDeadline(i))
  const move = (direction: number) => {
    const date = new Date(selectedDate)
    if (viewMode === 'month') { date.setDate(1); date.setMonth(date.getMonth() + direction) }
    else date.setDate(date.getDate() + direction * (viewMode === 'week' ? 7 : 1))
    setSelectedDate(date)
  }
  const weekStart = new Date(selectedDate)
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const periodLabel = viewMode === 'month'
    ? selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : viewMode === 'day'
      ? selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : `${weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const weekDays = Array.from({ length: viewMode === 'day' ? 1 : 7 }, (_, index) => {
    const date = new Date(viewMode === 'day' ? selectedDate : weekStart)
    date.setDate(date.getDate() + index)
    const dateKey = localDateKey(date)
    return { dateKey, day: date.toLocaleDateString('ru-RU', { weekday: viewMode === 'day' ? 'long' : 'short', day: 'numeric', month: 'long', year: viewMode === 'day' ? 'numeric' : undefined }), isToday: dateKey === todayStr }
  })
  const getCategoryBorder = (category: string, title: string) => {
    const text = `${category} ${title}`.toLowerCase()
    return /релиз|деплой|разработк/.test(text) ? 'border-l-[#4edea3]' : /ревью|встреч/.test(text) ? 'border-l-[#ffb74d]' : 'border-l-[#4fc3f7]'
  }
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const firstDay = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7
  return <div className="flex flex-col w-full gap-space-lg pt-space-md">
    <div className="flex flex-wrap justify-between gap-3 text-on-surface">
      <div><span className="text-xs text-outline">Календарная сетка</span><h1 className="text-headline-lg font-semibold">Календарь</h1><p className="text-sm font-medium capitalize text-on-surface-variant">{periodLabel}</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-outline-variant/25 bg-surface-container-low p-1">
          <button type="button" aria-label="Предыдущий период" title="Предыдущий период" onClick={() => move(-1)} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="h-9 cursor-pointer rounded-lg px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">Сегодня</button>
          <button type="button" aria-label="Следующий период" title="Следующий период" onClick={() => move(1)} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
        </div>
        <div role="group" aria-label="Режим календаря" className="inline-flex items-center gap-1 rounded-xl border border-outline-variant/25 bg-surface-container-low p-1">
          {(['month', 'week', 'day'] as const).map((mode, i) => <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)} className={`h-9 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${viewMode === mode ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>{['Месяц', 'Неделя', 'День'][i]}</button>)}
        </div>
      </div>
    </div>
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        {viewMode === 'month' ? <div className="grid grid-cols-7 rounded-2xl bg-surface-container-low overflow-hidden border border-outline-variant/20">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <div key={day} className="p-2 text-outline text-xs">{day}</div>)}
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const date = new Date(selectedYear, selectedMonth, day)
            const key = localDateKey(date)
            const tasks = itemsForDay(items, key)
            return <div key={key} data-testid={`calendar-day-${key}`} className={`min-h-32 border border-outline-variant/15 p-2 cursor-pointer text-on-surface ${key === todayStr ? 'bg-primary/10' : ''}`}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) void updateItem(id, { dueDate: key }).catch(() => {}) }}
              onClick={() => { setSelectedDate(date); openQuickCapture({ entityType: 'task', dueDate: key }) }}>
              <div className="text-xs mb-2">{day}</div>
              {tasks.slice(0, 3).map((task) => <button key={task.id} onClick={(e) => { e.stopPropagation(); openDrawer(task.id) }} className={`w-full min-w-0 text-left text-xs leading-4 text-on-surface bg-surface-container rounded border-l-4 ${getCategoryBorder(task.categoryTag, task.title)} px-1.5 py-1 mb-1 whitespace-normal break-words [overflow-wrap:anywhere] transition-colors hover:bg-surface-container-high`}>{task.title}</button>)}
              {tasks.length > 3 && <button onClick={(e) => { e.stopPropagation(); setActivePopoverDay({ dateLabel: date.toLocaleDateString('ru-RU'), tasks }) }} className="mt-0.5 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-outline hover:text-primary transition-colors">+ еще {tasks.length - 3}</button>}
            </div>
          })}
        </div> : <WeekTimelineView weekDays={weekDays} items={items} getCategoryBorder={getCategoryBorder} />}
      </div>
      <UnscheduledTasksSidebar tasks={unscheduledTasks} isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((value) => !value)} onAssignDate={(task, date) => { void updateItem(task.id, { dueDate: date }).catch(() => {}) }} />
    </div>
    {activePopoverDay && <DayTasksPopover {...activePopoverDay} onClose={() => setActivePopoverDay(null)} />}
  </div>
}
