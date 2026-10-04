import React from 'react'

export interface SegmentProgressProps {
  total: number
  completed: number
  maxSegments?: number
  className?: string
}

export const SegmentProgress: React.FC<SegmentProgressProps> = ({
  total,
  completed,
  maxSegments = 12,
  className = '',
}) => {
  const safeTotal = Math.max(0, Math.min(maxSegments, Number.isFinite(total) ? total : 0))
  const safeCompleted = Math.max(
    0,
    Math.min(safeTotal, Number.isFinite(completed) ? completed : 0)
  )

  if (safeTotal === 0) {
    return (
      <div
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Прогресс выполнения задач"
        className={`h-1.5 w-full rounded-full bg-surface-container-highest ${className}`}
      />
    )
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={safeCompleted}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-label="Сегментный прогресс выполнения задач"
      className={`flex gap-1 ${className}`}
    >
      {Array.from({ length: safeTotal }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < safeCompleted ? 'bg-secondary' : 'bg-surface-container-highest'
          }`}
        />
      ))}
    </div>
  )
}
