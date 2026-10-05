import React from 'react'
import { ViewMode } from '../../../types/item'
import { useDashboardConfigStore } from '../../../store/dashboardConfigStore'

export interface DashboardHeaderProps {
  userName?: string
  dateText?: string
  aiSessionsText?: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  // Optional backwards-compatible props for older tests
  isRecordingHeld?: boolean
  onStartRecording?: () => void
  onNewNote?: () => void
}

export function getGreeting(userName = 'Алексей'): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return `Доброе утро, ${userName}`
  if (hour >= 12 && hour < 18) return `Добрый день, ${userName}`
  if (hour >= 18 && hour < 23) return `Добрый вечер, ${userName}`
  return `Доброй ночи, ${userName}`
}

export function getFormattedDate(): string {
  try {
    const formatted = new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date())
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  } catch {
    return 'Сегодня'
  }
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName = 'Алексей',
  dateText,
  aiSessionsText = '3 сессии обработаны AI',
  viewMode,
  onViewModeChange,
}) => {
  const { setCustomizerOpen } = useDashboardConfigStore()
  const greeting = getGreeting(userName)
  const displayDate = dateText || getFormattedDate()

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
          <span className="inline-flex w-2 h-2 rounded-full bg-secondary/80" />
          <span className="uppercase tracking-wider">Готово к синхронизации</span>
          <span className="text-surface-container-highest">•</span>
          <span className="text-on-surface-variant">Облако активно</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
          {greeting}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-outline text-body-md">calendar_today</span>
          <span>{displayDate}</span>
          <span className="text-surface-container-highest">•</span>
          <span className="text-secondary font-label-md text-label-md">{aiSessionsText}</span>
        </p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center flex-wrap gap-space-sm">
        {/* View switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/20">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-label="Переключить на вид список"
            className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-surface-container-high text-on-surface shadow-sm font-medium'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-md">view_agenda</span>
            <span>Список</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('board')}
            aria-label="Переключить на вид доска"
            className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'board'
                ? 'bg-surface-container-high text-on-surface shadow-sm font-medium'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-md">dashboard</span>
            <span>Доска</span>
          </button>
        </div>

        {/* Dashboard Customizer Toggle */}
        <button
          type="button"
          onClick={() => setCustomizerOpen(true)}
          aria-label="Настроить виджеты дашборда"
          title="Настроить виджеты"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md border border-outline-variant/30 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-md text-primary">tune</span>
          <span>Виджеты</span>
        </button>
      </div>
    </div>
  )
}
