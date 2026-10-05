import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'surface' | 'ghost' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
  icon?: string
  children?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'surface',
  size = 'md',
  glow = false,
  icon,
  children,
  className = '',
  type = 'button',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-label-md text-label-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const sizeClasses = {
    sm: 'px-space-sm py-1 rounded-lg text-label-sm gap-1',
    md: 'px-space-md py-2 rounded-xl text-label-md gap-space-xs',
    lg: 'px-space-lg py-2.5 rounded-xl text-label-lg gap-space-sm',
  }

  const variantClasses = {
    primary:
      'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container' +
      (glow ? ' glow-violet' : ''),
    secondary:
      'bg-secondary text-on-secondary hover:bg-secondary-fixed' +
      (glow ? ' glow-emerald' : ''),
    surface:
      'bg-surface-container-high hover:bg-surface-container-highest text-on-surface shadow-sm',
    ghost:
      'bg-transparent hover:bg-surface-container text-on-surface-variant hover:text-on-surface',
    icon:
      'p-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface',
  }

  const iconSizeClasses = {
    sm: 'text-[15px]',
    md: 'text-[18px]',
    lg: 'text-[20px]',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variant === 'icon' ? variantClasses.icon : `${sizeClasses[size]} ${variantClasses[variant]}`} ${className}`}
      {...props}
    >
      {icon && (
        <span className={`material-symbols-outlined ${variant === 'icon' ? 'text-[20px]' : iconSizeClasses[size]} select-none`}>{icon}</span>
      )}
      {children}
    </button>
  )
}
