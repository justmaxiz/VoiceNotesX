import React from 'react'
import { SegmentProgress } from '../../ui/SegmentProgress'

export interface ProductivityMetricsProps {
  totalCount: number
  completedCount: number
  plannedCount: number
  productivityDeltaText?: string
  estimatedHours?: string
}

export const ProductivityMetrics: React.FC<ProductivityMetricsProps> = ({
  totalCount,
  completedCount,
  plannedCount,
  productivityDeltaText = '+14%',
  estimatedHours = '~2.5 ч',
}) => {
  return (
    <div className="grid grid-cols-2 gap-space-md">
      {/* Progress Card */}
      <div className="p-space-md rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between gap-space-md border border-surface-container-high/30">
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-outline uppercase tracking-wider">
            Выполнено
          </span>
          <span className="material-symbols-outlined text-secondary text-body-lg">
            task_alt
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-lg text-headline-lg text-on-surface">
              {completedCount}
            </span>
            <span className="font-body-md text-body-md text-outline">
              из {totalCount} задач
            </span>
          </div>
          {/* Safe Segment Progress Bar */}
          <div className="mt-space-sm">
            <SegmentProgress total={totalCount} completed={completedCount} maxSegments={12} />
          </div>
        </div>
        <div className="font-label-sm text-label-sm text-on-surface-variant">
          Продуктивность <strong className="text-secondary">{productivityDeltaText}</strong> к среде
        </div>
      </div>

      {/* Planned Tasks Card */}
      <div className="p-space-md rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between gap-space-md border border-surface-container-high/30">
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-outline uppercase tracking-wider">
            В плане
          </span>
          <span className="material-symbols-outlined text-primary text-body-lg">
            pending_actions
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-lg text-headline-lg text-on-surface">
              {plannedCount}
            </span>
            <span className="font-body-md text-body-md text-outline">задачи</span>
          </div>
          <div className="flex items-center gap-space-xs mt-space-xs">
            <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
              1 высокий фокус
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between font-label-sm text-label-sm text-outline">
          <span>Оценка времени</span>
          <span className="text-on-surface font-semibold">{estimatedHours}</span>
        </div>
      </div>
    </div>
  )
}
