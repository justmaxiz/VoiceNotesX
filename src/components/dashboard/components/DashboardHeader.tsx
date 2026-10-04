import React from 'react'
import { ViewMode } from '../../../types/item'

export interface DashboardHeaderProps {
  userName?: string
  dateText?: string
  aiSessionsText?: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isRecordingHeld: boolean
  onStartRecording: () => void
  onNewNote: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName = 'Александр',
  dateText = 'Пятница, 4 октября',
  aiSessionsText = '3 сессии обработаны AI',
  viewMode,
  onViewModeChange,
  isRecordingHeld,
  onStartRecording,
  onNewNote,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
          <span className="inline-flex w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
          <span className="uppercase tracking-wider">Готово к синхронизации</span>
          <span className="text-surface-container-highest">•</span>
          <span className="text-on-surface-variant">Облако активно</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
          Добрый вечер, {userName}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-outline text-body-md">calendar_today</span>
          <span>{dateText}</span>
          <span className="text-surface-container-highest">•</span>
          <span className="text-secondary font-label-md text-label-md">{aiSessionsText}</span>
        </p>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex items-center flex-wrap gap-space-sm">
        {/* View switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface-container-low shadow-sm">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-surface-container-high text-on-surface shadow-sm'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-md">view_agenda</span>
            <span>Список</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('board')}
            className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'board'
                ? 'bg-surface-container-high text-on-surface shadow-sm'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-md">dashboard</span>
            <span>Доска</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onNewNote}
          className="flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-primary text-body-md">add</span>
          <span>Новая заметка</span>
        </button>

        <button
          type="button"
          id="record-trigger-btn"
          onClick={onStartRecording}
          aria-label={isRecordingHeld ? 'Идет запись аудио' : 'Начать запись аудио'}
          className={`flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all glow-violet cursor-pointer ${
            isRecordingHeld ? 'scale-95 ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
          }`}
        >
          <span className="material-symbols-outlined text-body-md animate-pulse">mic</span>
          <span>{isRecordingHeld ? 'Идет запись...' : 'Начать запись'}</span>
          <span className="px-1.5 py-0.5 rounded bg-on-primary/20 text-on-primary font-label-sm text-label-sm ml-1">
            Space
          </span>
        </button>
      </div>
    </div>
  )
}
