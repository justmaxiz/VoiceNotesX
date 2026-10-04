import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'low' | 'standard' | 'high' | 'glass'
  glow?: 'none' | 'violet' | 'emerald'
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({
  variant = 'low',
  glow = 'none',
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    low: 'bg-surface-container-low border border-surface-container-high/30',
    standard: 'bg-surface-container border border-surface-container-high/40',
    high: 'bg-surface-container-high border border-surface-container-highest/50',
    glass: 'glass-panel',
  }

  const glowClasses = {
    none: '',
    violet: 'glow-violet',
    emerald: 'glow-emerald',
  }

  return (
    <div
      className={`rounded-2xl p-space-md shadow-sm ${variantClasses[variant]} ${glowClasses[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
