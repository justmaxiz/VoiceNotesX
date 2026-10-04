import React, { useState } from 'react'
import { Waveform } from '../../ui/Waveform'

export interface AudioWaveformPlayerProps {
  isPlaying: boolean
  onTogglePlay: () => void
  durationText?: string
  currentTimeText?: string
  transcriptText?: string
  onComplete?: () => void
  onSummary?: () => void
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  isPlaying,
  onTogglePlay,
  durationText = '0:42 мин',
  currentTimeText,
  transcriptText = '«Синхронизировать транскрипцию в реальном времени с векторной базой и контекстом пользователя для точных AI-ответов. Проверить задержку вебсокета на мобильных устройствах...»',
  onComplete,
  onSummary,
}) => {
  const [progress, setProgress] = useState(isPlaying ? 0.57 : 0.42)
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(transcriptText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const displayedCurrentTime =
    currentTimeText || (isPlaying ? '0:24' : '0:18')

  return (
    <div className="rounded-xl bg-surface-container p-space-md shadow-inner flex flex-col gap-space-md border border-surface-container-high/40">
      {/* Player Telemetry Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary text-body-md">graphic_eq</span>
          <span className="font-label-md text-label-md text-on-surface">Голосовой исходник</span>
          <span className="text-outline text-label-sm font-label-sm">• {durationText}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-tertiary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-label-sm">auto_awesome</span>
          <span>Whisper AI Транскрипция</span>
        </div>
      </div>

      {/* Live Interactive Waveform Visualization */}
      <div className="flex items-center gap-space-md py-1">
        <button
          type="button"
          id="playback-btn"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Приостановить' : 'Воспроизвести'}
          className="w-11 h-11 shrink-0 rounded-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container flex items-center justify-center transition-all glow-violet cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <div className="flex-1 overflow-hidden">
          <Waveform
            progress={progress}
            isPlaying={isPlaying}
            interactive
            onSeek={(val) => setProgress(val)}
            ariaLabel="Шкала аудиозаписи голосовой заметки"
          />
        </div>

        <div className="text-right shrink-0">
          <span className="font-label-md text-label-md text-on-surface">
            {displayedCurrentTime}
          </span>
          <span className="text-outline text-label-sm font-label-sm"> / 0:42</span>
        </div>
      </div>

      {/* Verbatim Transcription Snippet */}
      <div className="p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant font-body-md text-body-md leading-relaxed italic border border-surface-container-high/30">
        {transcriptText}
      </div>

      {/* Audio Action Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-space-sm pt-space-xs">
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={onComplete}
            className="flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-fixed font-label-md text-label-md transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-body-md">check</span>
            <span>Завершить</span>
          </button>
          <button
            type="button"
            onClick={onSummary}
            className="flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-label-md text-label-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-body-md">auto_awesome</span>
            <span>AI Сводка</span>
          </button>
        </div>
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            title={isCopied ? 'Скопировано!' : 'Копировать транскрипцию'}
            aria-label="Копировать транскрипцию"
          >
            <span className="material-symbols-outlined text-body-md">
              {isCopied ? 'done' : 'content_copy'}
            </span>
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            title="Экспорт в Notion/Markdown"
            aria-label="Экспорт в Notion или Markdown"
          >
            <span className="material-symbols-outlined text-body-md">ios_share</span>
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            title="Параметры"
            aria-label="Дополнительные параметры"
          >
            <span className="material-symbols-outlined text-body-md">more_horiz</span>
          </button>
        </div>
      </div>
    </div>
  )
}
