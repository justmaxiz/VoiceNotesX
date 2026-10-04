import React from 'react'

export interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-space-lg rounded-2xl bg-surface-container-low border border-dashed border-surface-container-highest/60 text-outline ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant mb-space-sm">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">{title}</h3>
      {description && (
        <p className="font-body-sm text-body-sm text-outline max-w-sm mb-space-md">
          {description}
        </p>
      )}
      {action && <div className="mt-space-xs">{action}</div>}
    </div>
  )
}
