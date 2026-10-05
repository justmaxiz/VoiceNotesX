import React from 'react'
import { useAudioStore } from '../../store/useAudioStore'

export interface MiniAudioPlayerProps {
  audioUrl?: string
  duration?: number
  className?: string
  ariaLabel?: string
  onEnded?: () => void
}

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({
  audioUrl,
  className = '',
  ariaLabel = 'Воспроизвести аудио',
}) => {
  const { currentAudioUrl, isPlaying, playAudio, pauseAudio } = useAudioStore()

  if (!audioUrl) return null

  const isCurrentActive = currentAudioUrl === audioUrl && isPlaying

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentActive) {
      pauseAudio()
    } else {
      playAudio(audioUrl)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isCurrentActive ? 'Пауза аудио' : ariaLabel}
      title={isCurrentActive ? 'Пауза' : 'Слушать'}
      data-testid="mini-audio-player"
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
        isCurrentActive
          ? 'bg-primary text-white shadow-sm ring-2 ring-primary/40'
          : 'bg-surface-container-high hover:bg-primary/20 text-on-surface hover:text-primary'
      } ${className}`}
    >
      <span className="material-symbols-outlined text-[14px] leading-none select-none">
        {isCurrentActive ? 'pause' : 'play_arrow'}
      </span>
    </button>
  )
}
