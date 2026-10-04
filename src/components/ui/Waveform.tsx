import React from 'react'

export interface WaveformProps {
  bars?: number[]
  progress?: number // 0 to 1
  isPlaying?: boolean
  interactive?: boolean
  onSeek?: (ratio: number) => void
  ariaLabel?: string
  className?: string
  barWidth?: string
  heightClass?: string
}

const DEFAULT_BARS = [
  3, 5, 8, 6, 9, 7, 10, 6, 4, 7, 5, 8, 3, 6, 9, 5, 7, 4, 6, 8, 3, 5, 4, 2,
]

export const Waveform: React.FC<WaveformProps> = ({
  bars = DEFAULT_BARS,
  progress = 0.42,
  isPlaying = false,
  interactive = false,
  onSeek,
  ariaLabel = 'Шкала воспроизведения аудиозаписи',
  className = '',
  barWidth = 'w-1',
  heightClass = 'h-10',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    onSeek(ratio)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onSeek(Math.min(1, progress + 0.05))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onSeek(Math.max(0, progress - 0.05))
    }
  }

  const activeIndex = Math.floor(bars.length * progress)

  return (
    <div
      role={interactive ? 'slider' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      aria-valuenow={interactive ? Math.round(progress * 100) : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`flex items-center gap-1 ${heightClass} ${
        interactive ? 'cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary rounded' : ''
      } ${className}`}
    >
      {bars.map((height, i) => {
        const isPassed = i <= activeIndex
        const isCurrent = i === activeIndex && isPlaying

        let colorClass = 'bg-surface-container-highest'
        if (isPassed) {
          colorClass = i < activeIndex * 0.5 ? 'bg-secondary' : 'bg-primary'
        }

        return (
          <span
            key={i}
            style={{ height: `${Math.max(8, height * 4)}px` }}
            className={`${barWidth} rounded-full transition-all ${colorClass} ${
              isCurrent ? 'animate-pulse' : ''
            }`}
          />
        )
      })}
    </div>
  )
}
