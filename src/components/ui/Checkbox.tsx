import React, { useState } from 'react'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'sm' | 'md'
  label?: React.ReactNode
  disabled?: boolean
  className?: string
  ariaLabel?: string
  id?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  size = 'md',
  label,
  disabled = false,
  className = '',
  ariaLabel,
  id,
}) => {
  const [bouncing, setBouncing] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return

    // Trigger haptic feedback on mobile if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15)
      } catch {
        // Ignore haptic failures
      }
    }

    if (!checked) {
      setBouncing(true)
      setTimeout(() => setBouncing(false), 200)
    }

    onChange(!checked)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleClick(e as any)
    }
  }

  const isSmall = size === 'sm'
  const boxDimension = isSmall ? 'w-[18px] h-[18px] min-w-[18px] min-h-[18px]' : 'w-[22px] h-[22px] min-w-[22px] min-h-[22px]'
  const roundedClass = isSmall ? 'rounded-md' : 'rounded-lg'

  return (
    <div
      className={`inline-flex items-center gap-2 select-none cursor-pointer ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      id={id}
    >
      <div
        className={`relative flex items-center justify-center border transition-all duration-150 ease-out shrink-0 ${boxDimension} ${roundedClass} ${
          bouncing ? 'scale-110' : 'scale-100'
        } ${
          checked
            ? 'bg-secondary border-secondary text-on-secondary shadow-[0_0_12px_rgba(78,222,163,0.35)]'
            : 'bg-surface-container-high/40 border-outline-variant/50 hover:border-primary/60 hover:bg-surface-container-high/70'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill-none stroke-current stroke-[3] transition-all duration-150 ease-out`}
          style={{
            strokeDasharray: 24,
            strokeDashoffset: checked ? 0 : 24,
            transition: 'stroke-dashoffset 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      {label && (
        <span
          className={`text-sm transition-all duration-200 ${
            checked ? 'line-through text-outline opacity-60' : 'text-on-surface'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}
