import React from 'react'

export const CalendarPage: React.FC = () => {
  const days = [
    { day: 'Пн, 30 Сен', events: ['Планирование спринта (11:00)'] },
    { day: 'Вт, 1 Окт', events: ['Интервью с пользователем (15:00)'] },
    { day: 'Ср, 2 Окт', events: ['Синхронизация дизайна (14:30)'] },
    { day: 'Чт, 3 Окт', events: ['Ревью PR #140 (17:00)'] },
    { day: 'Пт, 4 Окт (Сегодня)', events: ['Отчет по Q3 (16:00)', 'Ревью микросервисов (18:30)', 'Релиз VoiceNotes (21:00)'], current: true },
    { day: 'Сб, 5 Окт', events: ['Личные заметки'] },
    { day: 'Вс, 6 Окт', events: ['Отдых'] },
  ]

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {/* Header */}
      <div>
        <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
          <span className="material-symbols-outlined text-secondary text-sm">calendar_month</span>
          <span className="uppercase tracking-wider">Календарная сетка</span>
          <span>•</span>
          <span>Октябрь 2026</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
          Календарь
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Хронологическая привязка голосовых заметок и задач к временной шкале
        </p>
      </div>

      {/* Week Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-space-sm">
        {days.map((item, index) => (
          <div
            key={index}
            className={`p-space-md rounded-2xl flex flex-col gap-space-sm border transition-all ${
              item.current
                ? 'bg-surface-container-high border-primary/50 shadow-[0_0_15px_-3px_rgba(160,120,255,0.2)]'
                : 'bg-surface-container-low border-surface-container-high/30'
            }`}
          >
            <div className="flex items-center justify-between pb-1 border-b border-surface-container-high/20">
              <span className={`font-label-md text-label-md ${item.current ? 'text-primary font-bold' : 'text-on-surface'}`}>
                {item.day}
              </span>
              {item.current && (
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              )}
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              {item.events.map((ev, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-xl text-xs font-body-sm leading-tight ${
                    item.current
                      ? 'bg-primary/20 text-on-primary-container border border-primary/30'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {ev}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
