import React, { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { UnscheduledTasksSidebar } from './UnscheduledTasksSidebar'
import { DayTasksPopover } from './DayTasksPopover'
import { WeekTimelineView } from './WeekTimelineView'
import { Item } from '../../types/item'

type CalendarViewMode = 'month' | 'week' | 'day'

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export const CalendarPage: React.FC = () => {
  const { items, updateItem } = useAppStore()
  const { openDrawer } = useDrawerStore()
  const { openQuickCapture } = useQuickCaptureStore()

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(9) // 0-indexed: 9 = October
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activePopoverDay, setActivePopoverDay] = useState<{ dateLabel: string; tasks: Item[] } | null>(null)

  const todayStr = '2026-10-05' // Matching app context

  const getCategoryBorder = (categoryTag: string, title: string): string => {
    const text = (categoryTag + ' ' + title).toLowerCase()
    if (text.includes('релиз') || text.includes('деплой') || text.includes('разработк')) {
      return 'border-l-[#4edea3]' // Emerald
    }
    if (text.includes('ревью') || text.includes('встреч') || text.includes('интервью')) {
      return 'border-l-[#ffb74d]' // Amber
    }
    if (text.includes('аналитик') || text.includes('метрик') || text.includes('отчет')) {
      return 'border-l-[#4fc3f7]' // Cyan
    }
    return 'border-l-[#d0bcff]' // Violet
  }

  // Backlog tasks (no dueDate)
  const unscheduledTasks = useMemo(() => {
    return items.filter(
      (i) => i.type === 'task' && i.status !== 'archived' && !i.dueDate
    )
  }, [items])

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const handleGoToday = () => {
    setSelectedYear(2026)
    setSelectedMonth(9)
  }

  // Days count and start weekday for month view
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  // Weekday of 1st day (Monday = 0)
  const firstDayWeekday = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7

  const handleDropTaskOnDay = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      updateItem(taskId, { dueDate: dateKey }).catch(() => {})
    }
  }

  // Week days for week view
  const weekDays = [
    { day: 'Пн, 5 Окт', dateKey: '2026-10-05', isToday: true },
    { day: 'Вт, 6 Окт', dateKey: '2026-10-06', isToday: false },
    { day: 'Ср, 7 Окт', dateKey: '2026-10-07', isToday: false },
    { day: 'Чт, 8 Окт', dateKey: '2026-10-08', isToday: false },
    { day: 'Пт, 9 Окт', dateKey: '2026-10-09', isToday: false },
    { day: 'Сб, 10 Окт', dateKey: '2026-10-10', isToday: false },
    { day: 'Вс, 11 Окт', dateKey: '2026-10-11', isToday: false },
  ]

  // Hourly slots for Day view
  const hours = Array.from({ length: 15 }, (_, i) => i + 8)

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
            <span className="material-symbols-outlined text-secondary text-sm">calendar_month</span>
            <span className="uppercase tracking-wider">Календарная сетка</span>
            <span>•</span>
            <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
            Календарь
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Контрастное расписание задач, дедлайнов и событий с реальными датами (WCAG AAA)
          </p>
        </div>

        {/* View Switcher & Month Navigation */}
        <div className="flex items-center gap-3 flex-wrap self-start md:self-end">
          {/* Month Stepper */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/20">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Предыдущий месяц"
              className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="px-2 py-0.5 rounded-lg text-xs text-on-surface font-medium hover:bg-surface-container cursor-pointer"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Следующий месяц"
              className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center p-0.5 rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/20">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-label-md font-medium transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-surface-container-high text-on-surface shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Месяц
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-label-md font-medium transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-surface-container-high text-on-surface shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Неделя
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-label-md font-medium transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-surface-container-high text-on-surface shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              День
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Area + Backlog Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        <div className="flex-1 w-full min-w-0">
          {/* Month View */}
          {viewMode === 'month' && (
            <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4">
              <div className="grid grid-cols-7 gap-2 pb-2 mb-2 text-center text-xs font-semibold text-outline uppercase tracking-wider border-b border-outline-variant/20">
                <span>Пн</span>
                <span>Вт</span>
                <span>Ср</span>
                <span>Чт</span>
                <span>Пт</span>
                <span>Сб</span>
                <span>Вс</span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Starting Weekday Padding */}
                {Array.from({ length: firstDayWeekday }).map((_, idx) => (
                  <div
                    key={`pad-${idx}`}
                    className="min-h-[100px] p-2 rounded-xl bg-surface-container-lowest/30 border border-transparent opacity-30"
                  />
                ))}

                {/* Real Days of Month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                  const dayDateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  const isToday = dayDateKey === todayStr

                  // Strictly filter tasks belonging to this date!
                  const dayTasks = items.filter((item) => {
                    if (item.type !== 'task' || item.status === 'archived') return false
                    if (item.dueDate && item.dueDate.startsWith(dayDateKey)) return true
                    // Fallback: seed tasks with plain time on today (2026-10-05)
                    if (isToday && item.dueDate && item.dueDate.includes(':') && !item.dueDate.includes('-')) {
                      return true
                    }
                    return false
                  })

                  const visibleTasks = dayTasks.slice(0, 3)
                  const hiddenCount = dayTasks.length - 3

                  return (
                    <div
                      key={dayNum}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropTaskOnDay(e, dayDateKey)}
                      onClick={() =>
                        openQuickCapture({
                          entityType: 'task',
                          initialText: `Задача на ${dayNum} ${MONTH_NAMES[selectedMonth].toLowerCase()}: `,
                        })
                      }
                      className={`min-h-[105px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isToday
                          ? 'bg-surface-container-high/90 border-primary ring-1 ring-primary/40 shadow-sm'
                          : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isToday ? 'text-primary' : 'text-on-surface'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1 mt-1 flex-1">
                        {visibleTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              openDrawer(t.id)
                            }}
                            className={`text-[11px] p-1 rounded-sm border-l-2 ${getCategoryBorder(
                              t.categoryTag,
                              t.title
                            )} bg-surface-container-low text-on-surface truncate font-medium hover:opacity-90`}
                          >
                            {t.title}
                          </div>
                        ))}

                        {/* More Tasks Button Popover Trigger */}
                        {hiddenCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActivePopoverDay({
                                dateLabel: `${dayNum} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
                                tasks: dayTasks,
                              })
                            }}
                            className="text-[10px] text-primary hover:underline text-left font-medium mt-0.5 cursor-pointer"
                          >
                            + еще {hiddenCount}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Week Timeline View */}
          {viewMode === 'week' && (
            <WeekTimelineView
              weekDays={weekDays}
              items={items}
              getCategoryBorder={getCategoryBorder}
            />
          )}

          {/* Day View */}
          {viewMode === 'day' && (
            <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <h2 className="text-title-md font-semibold text-on-surface">
                  Понедельник, 5 октября 2026
                </h2>
                <span className="text-label-sm text-secondary font-medium">
                  {items.filter((i) => i.type === 'task' && i.dueDate && i.dueDate.startsWith(todayStr)).length} запланированных дел
                </span>
              </div>

              <div className="flex flex-col divide-y divide-outline-variant/15">
                {hours.map((hour) => {
                  const hourStr = `${hour.toString().padStart(2, '0')}:00`
                  const tasksForHour = items.filter((item) => {
                    if (item.type !== 'task' || item.status === 'archived') return false
                    const time = item.dueTime || (item.dueDate?.includes(':') ? item.dueDate : null)
                    if (!time) return false
                    return parseInt(time.split(':')[0], 10) === hour
                  })

                  return (
                    <div
                      key={hour}
                      className="flex items-start gap-4 py-3 group hover:bg-surface-container-high/30 px-2 rounded-lg transition-colors"
                    >
                      <span className="text-xs font-mono text-outline w-12 shrink-0 pt-1">
                        {hourStr}
                      </span>

                      <div className="flex-1 flex flex-col gap-1.5">
                        {tasksForHour.length > 0 ? (
                          tasksForHour.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => openDrawer(task.id)}
                              className={`p-3 rounded-xl border-l-4 ${getCategoryBorder(
                                task.categoryTag,
                                task.title
                              )} bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface transition-all cursor-pointer shadow-xs`}
                            >
                              <div className="font-medium text-body-md text-on-surface">
                                {task.title}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
                                <span>{task.categoryTag}</span>
                                <span>•</span>
                                <span>Дедлайн: {task.dueTime || task.dueDate}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              openQuickCapture({
                                entityType: 'task',
                                initialText: `Дело на ${hourStr}: `,
                              })
                            }
                            className="opacity-0 group-hover:opacity-100 text-xs text-outline hover:text-primary transition-opacity py-1 flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            <span>Добавить дело на {hourStr}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Unscheduled Backlog Sidebar */}
        <UnscheduledTasksSidebar
          tasks={unscheduledTasks}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          onAssignDate={(task, dateStr) => updateItem(task.id, { dueDate: dateStr })}
        />
      </div>

      {/* Popover for days with > 3 tasks */}
      {activePopoverDay && (
        <DayTasksPopover
          dateLabel={activePopoverDay.dateLabel}
          tasks={activePopoverDay.tasks}
          onClose={() => setActivePopoverDay(null)}
        />
      )}
    </div>
  )
}
