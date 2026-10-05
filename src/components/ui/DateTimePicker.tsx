import React from 'react'
import { Checkbox } from './Checkbox'

export interface DateTimePickerProps {
  dueDate?: string | null
  dueTime?: string | null
  isAllDay?: boolean
  estimatedMinutes?: number
  onChange: (updates: {
    dueDate?: string | null
    dueTime?: string | null
    isAllDay?: boolean
    estimatedMinutes?: number
  }) => void
}

const DURATION_PRESETS = [
  { label: '15м', value: 15 },
  { label: '30м', value: 30 },
  { label: '45м', value: 45 },
  { label: '1ч', value: 60 },
  { label: '2ч', value: 120 },
]

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  dueDate,
  dueTime,
  isAllDay = false,
  estimatedMinutes,
  onChange,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const getTomorrowStr = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  const getEndOfWeekStr = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = (7 - day) % 7 || 7 // Next Sunday
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  const handlePresetDate = (dateVal: string | null) => {
    onChange({ dueDate: dateVal })
  }

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-surface-container-low/70 border border-outline-variant/20">
      <div className="flex items-center justify-between">
        <label className="text-label-sm text-outline uppercase tracking-wider font-medium flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">event</span>
          <span>Дата и время дедлайна</span>
        </label>

        {dueDate && (
          <button
            type="button"
            onClick={() => handlePresetDate(null)}
            className="text-[11px] text-outline hover:text-error transition-colors cursor-pointer"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Quick Date Presets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => handlePresetDate(getTodayStr())}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            dueDate === getTodayStr()
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          Сегодня
        </button>
        <button
          type="button"
          onClick={() => handlePresetDate(getTomorrowStr())}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            dueDate === getTomorrowStr()
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          Завтра
        </button>
        <button
          type="button"
          onClick={() => handlePresetDate(getEndOfWeekStr())}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            dueDate === getEndOfWeekStr()
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          Конец недели
        </button>
      </div>

      {/* Date & Time Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <div>
          <label className="text-[11px] text-outline block mb-1">Дата</label>
          <input
            type="date"
            value={dueDate || ''}
            onChange={(e) => onChange({ dueDate: e.target.value || null })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] text-outline block mb-1">Время</label>
          <input
            type="time"
            disabled={isAllDay}
            value={dueTime || ''}
            onChange={(e) => onChange({ dueTime: e.target.value || null })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface focus:border-primary focus:outline-none disabled:opacity-40"
          />
        </div>
      </div>

      {/* All-Day switch */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={isAllDay}
            onChange={(checked) => onChange({ isAllDay: checked })}
            size="sm"
            ariaLabel="Событие на весь день"
          />
          <span className="text-xs text-on-surface">Весь день</span>
        </label>
      </div>

      {/* Duration Estimate */}
      <div className="pt-2 border-t border-outline-variant/15">
        <label className="text-[11px] text-outline block mb-1.5">
          Оценка длительности (для сетки календаря):
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() =>
                onChange({
                  estimatedMinutes: estimatedMinutes === d.value ? undefined : d.value,
                })
              }
              className={`px-2 py-0.5 rounded-md text-xs transition-colors cursor-pointer ${
                estimatedMinutes === d.value
                  ? 'bg-secondary text-on-secondary font-semibold'
                  : 'bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
