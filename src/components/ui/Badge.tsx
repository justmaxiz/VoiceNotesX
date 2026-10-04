import React from 'react'

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error' | 'outline'
  size?: 'sm' | 'md'
  pulse?: boolean
  icon?: string
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  pulse = false,
  icon,
  children,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-space-xs py-0.5 text-label-sm font-label-sm rounded',
    md: 'px-space-sm py-1 text-label-md font-label-md rounded-full',
  }

  const variantClasses = {
    default: 'bg-surface-container-high text-on-surface-variant',
    primary: 'bg-primary-container text-on-primary-container',
    secondary: 'bg-secondary-container text-on-secondary font-semibold glow-emerald',
    tertiary: 'bg-surface-container-highest text-tertiary',
    error: 'bg-error-container text-on-error-container font-semibold',
    outline: 'border border-outline-variant text-outline bg-transparent',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
      )}
      {icon && (
        <span className="material-symbols-outlined text-label-sm shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </span>
  )
}
