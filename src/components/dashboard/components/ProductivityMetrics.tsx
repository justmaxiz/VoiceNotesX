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

  return (
    <div className="grid grid-cols-2 gap-space-md">
      {/* Progress Card */}
      <div
        data-testid="metrics-completed-card"
        className={`p-space-md rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between gap-space-md border transition-all ${
          isAllDone
            ? 'border-secondary shadow-[0_0_15px_rgba(78,222,163,0.3)] ring-1 ring-secondary/50'
            : 'border-surface-container-high/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-medium">
            Выполнено
          </span>
          <span
            className={`material-symbols-outlined text-body-lg transition-transform ${
              isAllDone ? 'text-secondary scale-110' : 'text-secondary'
            }`}
          >
            check_circle
          </span>
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
        <div className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
          {isAllDone ? (
            <span className="text-secondary font-medium">Все задачи закрыты! 🎉</span>
          ) : (
            <span>
              {totalCount > 0
                ? `${Math.round((completedCount / totalCount) * 100)}% плана выполнено`
                : 'Нет запланированных задач'}
            </span>
          )}
        </div>
      </div>

      {/* Planned Tasks Card */}
      <div
        data-testid="metrics-planned-card"
        className="p-space-md rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between gap-space-md border border-surface-container-high/30"
      >
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-medium">
            В плане
          </span>
          <span className="material-symbols-outlined text-primary text-body-lg">
            assignment
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">
              {plannedCount}
            </span>
            <span className="font-body-md text-body-md text-outline">задач на сегодня</span>
          </div>
          <div className="flex items-center gap-space-xs mt-space-xs">
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              Активный спринт
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between font-label-sm text-label-sm text-outline">
          <span>Текущий статус</span>
          <span className="text-on-surface font-medium">
            {plannedCount === 0 ? 'Завершено' : 'В работе'}
          </span>
        </div>
      </div>
    </div>
  )
}
