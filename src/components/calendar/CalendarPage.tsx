import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'

type CalendarViewMode = 'month' | 'week' | 'day'

export const CalendarPage: React.FC = () => {
  const { items } = useAppStore()
  const { openDrawer } = useDrawerStore()
  const { openQuickCapture } = useQuickCaptureStore()

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')

  const tasksWithDue = items.filter((i) => i.dueDate || i.status !== 'archived')

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

  const weekDays = [
    { day: 'Пн, 5 Окт', dateKey: '2026-10-05', isToday: true },
    { day: 'Вт, 6 Окт', dateKey: '2026-10-06' },
    { day: 'Ср, 7 Окт', dateKey: '2026-10-07' },
    { day: 'Чт, 8 Окт', dateKey: '2026-10-08' },
    { day: 'Пт, 9 Окт', dateKey: '2026-10-09' },
    { day: 'Сб, 10 Окт', dateKey: '2026-10-10' },
    { day: 'Вс, 11 Окт', dateKey: '2026-10-11' },
  ]

  // Hourly slots for Day Timeline (08:00 - 22:00)
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
            <span>Октябрь 2026</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
            Календарь
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Контрастное расписание задач, дедлайнов и событий (WCAG AAA)
          </p>
        </div>

        {/* View Switcher & Navigation */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-end">
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

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-space-sm items-start">
          {weekDays.map((col, index) => {
            const dayTasks = tasksWithDue.slice(index % 3, (index % 3) + 2)

            return (
              <div
                key={col.dateKey}
                className={`p-space-md rounded-2xl flex flex-col gap-space-sm border transition-all min-h-[360px] ${
                  col.isToday
                    ? 'bg-surface-container-high/80 border-primary/50 ring-1 ring-primary/40 shadow-sm'
                    : 'bg-surface-container-low border-surface-container-high/30'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/20">
                  <span
                    className={`font-label-md text-label-md ${
                      col.isToday ? 'text-primary font-bold' : 'text-on-surface'
                    }`}
                  >
                    {col.day}
                  </span>
                  {col.isToday && (
                    <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)] animate-pulse" />
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {dayTasks.map((task) => {
                    const borderCategory = getCategoryBorder(task.categoryTag, task.title)
                    return (
                      <div
                        key={task.id}
                        onClick={() => openDrawer(task.id)}
                        className={`p-2.5 rounded-xl text-xs font-body-sm leading-snug border-l-[3px] ${borderCategory} bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer shadow-xs group`}
                      >
                        <div className="font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                          {task.title}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1.5 pt-1 border-t border-outline-variant/15">
                          <span>{task.categoryTag}</span>
                          <span>{task.priority === 'high' ? '16:00' : '18:30'}</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Quick slot click */}
                  <button
                    type="button"
                    onClick={() =>
                      openQuickCapture({
                        entityType: 'task',
                        initialText: `Запланировать на ${col.day}: `,
                      })
                    }
                    className="p-2 rounded-xl border border-dashed border-outline-variant/30 text-outline hover:text-on-surface hover:bg-surface-container/50 text-xs text-center transition-colors cursor-pointer mt-1"
                  >
                    + Запланировать
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
            {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => {
              const isToday = dayNum === 5
              const dayTasks = dayNum % 4 === 1 ? tasksWithDue.slice(0, 1) : []

              return (
                <div
                  key={dayNum}
                  onClick={() =>
                    openQuickCapture({
                      entityType: 'task',
                      initialText: `Задача на ${dayNum} октября: `,
                    })
                  }
                  className={`min-h-[90px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isToday
                      ? 'bg-surface-container-high/90 border-primary ring-1 ring-primary/40'
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
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          openDrawer(t.id)
                        }}
                        className={`text-[11px] p-1 rounded-sm border-l-2 ${getCategoryBorder(
                          t.categoryTag,
                          t.title
                        )} bg-surface-container-low text-on-surface truncate font-medium`}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Day Timeline View (08:00 - 22:00) */}
      {viewMode === 'day' && (
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <h2 className="text-title-md font-semibold text-on-surface">
              Понедельник, 5 октября 2026
            </h2>
            <span className="text-label-sm text-secondary font-medium">
              3 запланированных события
            </span>
          </div>

          <div className="flex flex-col divide-y divide-outline-variant/15">
            {hours.map((hour) => {
              const hourStr = `${hour.toString().padStart(2, '0')}:00`
              const taskForHour =
                hour === 16
                  ? tasksWithDue[0]
                  : hour === 18
                  ? tasksWithDue[1]
                  : hour === 21
                  ? tasksWithDue[2]
                  : null

              return (
                <div
                  key={hour}
                  className="flex items-start gap-4 py-3 group hover:bg-surface-container-high/30 px-2 rounded-lg transition-colors"
                >
                  <span className="text-xs font-mono text-outline w-12 shrink-0 pt-1">
                    {hourStr}
                  </span>

                  <div className="flex-1">
                    {taskForHour ? (
                      <div
                        onClick={() => openDrawer(taskForHour.id)}
                        className={`p-3 rounded-xl border-l-4 ${getCategoryBorder(
                          taskForHour.categoryTag,
                          taskForHour.title
                        )} bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface transition-all cursor-pointer shadow-xs`}
                      >
                        <div className="font-medium text-body-md text-on-surface">
                          {taskForHour.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
                          <span>{taskForHour.categoryTag}</span>
                          <span>•</span>
                          <span>Дедлайн: {hourStr}</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openQuickCapture({
                            entityType: 'task',
                            initialText: `Событие на ${hourStr}: `,
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
  )
}
