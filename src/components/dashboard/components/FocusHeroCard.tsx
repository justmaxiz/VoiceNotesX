import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import { MiniAudioPlayer } from '../../audio/MiniAudioPlayer'
import { ChecklistItem } from '../../../types/item'

export interface FocusHeroCardProps {
  isPlaying?: boolean
  onTogglePlay?: () => void
  title?: string
  description?: string
  deadlineText?: string
  categoryTag?: string
  priority?: 'low' | 'medium' | 'high'
  audioUrl?: string
  checklist?: ChecklistItem[]
  onComplete?: () => void
  onSummary?: () => void
  isCompleted?: boolean
}

const DEFAULT_SUBTASKS: ChecklistItem[] = [
  { id: 'sub-1', text: 'Собрать аналитику посещаемости и конверсий', isCompleted: false, sortOrder: 1 },
  { id: 'sub-2', text: 'Подготовить сводную презентацию для инвесторов', isCompleted: false, sortOrder: 2 },
  { id: 'sub-3', text: 'Согласовать выводы с продуктовой командой', isCompleted: false, sortOrder: 3 },
]

export const FocusHeroCard: React.FC<FocusHeroCardProps> = ({
  isPlaying = false,
  onTogglePlay,
  title = 'Подготовить отчет по продуктовым метрикам Q3',
  description = 'Собрать ключевые показатели продуктовой воронки, удержание и когортный анализ за третий квартал.',
  deadlineText = '21:00',
  categoryTag = '#Аналитика',
  priority = 'high',
  audioUrl = 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
  checklist: initialChecklist,
  onComplete,
  onSummary,
  isCompleted: initialCompleted = false,
}) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist || DEFAULT_SUBTASKS)
  const [completed, setCompleted] = useState(initialCompleted)

  const handleToggleSubtask = (subtaskId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === subtaskId ? { ...item, isCompleted: !item.isCompleted } : item
      )
    )
  }

  const handleMainComplete = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#4edea3', '#d0bcff', '#4fc3f7'],
      })
    } catch {
      // ignore
    }

    setCompleted(true)
    if (onComplete) {
      onComplete()
    }
  }

  if (completed) {
    return (
      <section
        data-testid="focus-hero-card"
        className="relative rounded-2xl bg-surface-container-low p-space-lg shadow-xl overflow-hidden border border-secondary/30 transition-all text-on-surface"
      >
        <div className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Все задачи в фокусе выполнены!
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Отличная работа. Выберите следующую задачу из списка или добавьте новую.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      data-testid="focus-hero-card"
      className="relative rounded-2xl bg-surface-container-low p-space-lg shadow-xl overflow-hidden group border border-surface-container-high/40 hover:border-primary/40 transition-all glass-panel"
    >
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
          <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-label-sm">auto_awesome</span>
            Whisper AI Транскрипция
          </span>
          <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
            {categoryTag}
          </span>
          {priority === 'high' && (
            <span className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-error font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-label-sm text-error">priority_high</span>
              Высокий приоритет
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
          {audioUrl && (
            <div className="flex items-center gap-1 bg-surface-container-high/60 px-2 py-0.5 rounded-full">
              <span className="text-label-sm text-outline">Аудио</span>
              <MiniAudioPlayer audioUrl={audioUrl} />
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-label-lg text-outline">schedule</span>
            <span>
              Дедлайн: <strong className="text-on-surface font-semibold">{deadlineText}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Task Title & Description */}
      <div className="mb-space-md">
        <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-snug font-semibold">
          {title}
        </h2>
        {description && (
          <p className="font-body-md text-body-md text-outline mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Checklist / Subtasks Section */}
      <div className="my-3 space-y-2 border-t border-b border-surface-container-high/30 py-3">
        <div className="text-label-sm text-outline uppercase tracking-wider font-medium">
          Ключевые подзадачи:
        </div>
        <div className="space-y-1.5">
          {checklist.map((sub) => (
            <label
              key={sub.id}
              className="flex items-center gap-2.5 cursor-pointer group text-sm select-none"
            >
              <input
                type="checkbox"
                checked={sub.isCompleted}
                onChange={() => handleToggleSubtask(sub.id)}
                className="w-4 h-4 rounded border-outline bg-surface-container text-secondary focus:ring-0 cursor-pointer accent-secondary transition-all"
              />
              <span
                className={`transition-all ${
                  sub.isCompleted
                    ? 'line-through text-outline opacity-60'
                    : 'text-on-surface group-hover:text-primary'
                }`}
              >
                {sub.text}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-space-sm pt-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Backwards-compatible play/pause button if requested */}
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Приостановить' : 'Воспроизвести'}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-md">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isPlaying ? 'Пауза' : 'Слушать'}</span>
            </button>
          )}

          {onSummary && (
            <button
              type="button"
              onClick={onSummary}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-md text-secondary">
                auto_awesome
              </span>
              <span>Сводка</span>
            </button>
          )}
        </div>

        {/* Complete Task Button */}
        <button
          type="button"
          onClick={handleMainComplete}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 font-label-md text-label-md font-semibold transition-all shadow-md cursor-pointer glow-emerald"
        >
          <span className="material-symbols-outlined text-body-md">check</span>
          <span>Завершить задачу</span>
        </button>
      </div>
    </section>
  )
}
