import React from 'react'
import { AudioWaveformPlayer } from './AudioWaveformPlayer'

export interface FocusHeroCardProps {
  isPlaying: boolean
  onTogglePlay: () => void
  title?: string
  description?: string
  deadlineText?: string
  categoryTag?: string
  onComplete?: () => void
  onSummary?: () => void
}

export const FocusHeroCard: React.FC<FocusHeroCardProps> = ({
  isPlaying,
  onTogglePlay,
  title = 'Добавить новую фичу в VoiceNotes',
  description = 'Контекстное связывание голосовых заметок с календарем и автогенерация задач',
  deadlineText = '21:00',
  categoryTag = 'Работа',
  onComplete,
  onSummary,
}) => {
  return (
    <section className="relative rounded-2xl bg-surface-container-low p-space-lg shadow-xl overflow-hidden group border border-surface-container-high/30">
      {/* Visual Accent Glow */}
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 w-56 h-56 bg-primary-container/15 rounded-full blur-2xl pointer-events-none"
      />

      {/* Meta Header */}
      <div className="flex items-center justify-between gap-space-sm flex-wrap mb-space-md">
        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm font-semibold glow-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-on-secondary animate-pulse" />
            В фокусе
          </span>
          <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
            {categoryTag}
          </span>
          <span className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-error font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-label-sm text-error">
              priority_high
            </span>
            Высокий приоритет
          </span>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-label-lg text-outline">
            schedule
          </span>
          <span>
            Дедлайн: <strong className="text-on-surface font-semibold">{deadlineText}</strong>
          </span>
        </div>
      </div>

      {/* Main Task Title */}
      <div className="mb-space-lg">
        <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-snug">
          {title}
        </h2>
        <p className="font-body-md text-body-md text-outline mt-1">
          {description}
        </p>
      </div>

      {/* Embedded Audio Player & Transcription Module */}
      <AudioWaveformPlayer
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onComplete={onComplete}
        onSummary={onSummary}
      />
    </section>
  )
}
