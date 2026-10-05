import React from 'react'
import { SegmentProgress } from '../../ui/SegmentProgress'

export interface ProductivityMetricsProps {
  totalCount: number
  completedCount: number
  plannedCount: number
  // Backwards-compatible optional props (ignored for rendering pseudo-text)
  productivityDeltaText?: string
  estimatedHours?: string
}

export const ProductivityMetrics: React.FC<ProductivityMetricsProps> = ({
  totalCount,
  completedCount,
  plannedCount,
}) => {
  const isAllDone = totalCount > 0 && completedCount === totalCount
  const remainingText =
    totalCount > 0
      ? `Осталось ${plannedCount} из ${totalCount} задач на сегодня`
      : 'Нет задач на сегодня'

  const dayStatusText =
    totalCount > 0 && plannedCount === 0 ? 'День закрыт 🎉' : 'В процессе'

  return (
    <div className="flex flex-col gap-3">
      {/* Progress Card */}
      <div
        data-testid="metrics-completed-card"
        className={`p-space-md rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between gap-space-md border transition-all ${
          isAllDone
            ? 'border-secondary/60 shadow-[0_0_20px_rgba(78,222,163,0.3)] ring-1 ring-secondary/50'
            : 'border-surface-container-high/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-medium">
            Выполнено
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full ${
                isAllDone
                  ? 'bg-secondary/15 text-secondary font-medium'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {dayStatusText}
            </span>
            <span
              className={`material-symbols-outlined text-body-lg transition-transform ${
                isAllDone ? 'text-secondary scale-110' : 'text-secondary'
              }`}
            >
              check_circle
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">
              {completedCount}
            </span>
            <span className="font-body-md text-body-md text-outline">
              из {totalCount} задач
            </span>
          </div>

          {/* Segment Progress Bar */}
          <div className="mt-space-sm">
            <SegmentProgress total={totalCount} completed={completedCount} maxSegments={10} />
          </div>
        </div>

        <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant pt-1 border-t border-outline-variant/15">
          {isAllDone ? (
            <span className="text-secondary font-medium">Все задачи закрыты! 🎉</span>
          ) : (
            <span>
              {totalCount > 0
                ? `${Math.round((completedCount / totalCount) * 100)}% плана выполнено`
                : '0% плана'}
            </span>
          )}
          {!isAllDone && (
            <span className="text-outline">
              {remainingText}
            </span>
          )}
        </div>
      </div>

      {/* Motivational Completion Banner */}
      {isAllDone && (
        <div
          data-testid="metrics-all-done-banner"
          className="p-3 rounded-xl bg-secondary-container/20 border border-secondary/40 text-on-surface flex items-center gap-2.5 animate-in fade-in duration-200"
        >
          <span className="material-symbols-outlined text-secondary text-lg">celebration</span>
          <span className="text-xs font-medium text-secondary">
            Все задачи дня закрыты! Время отдохнуть.
          </span>
        </div>
      )}
    </div>
  )
}
