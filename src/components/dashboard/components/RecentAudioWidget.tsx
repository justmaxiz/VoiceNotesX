import React from 'react'
import { MiniAudioPlayer } from '../../audio/MiniAudioPlayer'

export interface AudioMemoItemData {
  id: string
  title: string
  duration: string
  time: string
  audioUrl?: string
  bars?: number[]
}

export interface RecentAudioWidgetProps {
  memos?: AudioMemoItemData[]
  onViewAll?: () => void
  onPlayMemo?: (id: string) => void
}

export const RecentAudioWidget: React.FC<RecentAudioWidgetProps> = ({
  memos = [],
  onViewAll,
}) => {
  return (
    <section
      data-testid="recent-audio-widget"
      className="rounded-2xl bg-surface-container-low p-space-md shadow-sm flex flex-col gap-space-md border border-surface-container-high/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-body-md">graphic_eq</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Недавние аудиозаписи
          </h3>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
          >
            Смотреть все
          </button>
        )}
      </div>

      <div className="flex flex-col gap-space-xs">
        {memos.length === 0 && <p className="text-xs text-outline">Аудиозаписей пока нет</p>}
      {memos.map((memo) => (
          <div
            key={memo.id}
            className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group"
          >
            <div className="flex items-center gap-space-sm min-w-0">
              <MiniAudioPlayer audioUrl={memo.audioUrl} ariaLabel={`Воспроизвести ${memo.title}`} />
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface truncate font-medium">
                  {memo.title}
                </span>
                <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-outline">
                  <span>{memo.duration}</span>
                  <span>•</span>
                  <span>{memo.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
