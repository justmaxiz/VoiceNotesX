import React, { useState } from 'react'

export interface AudioMemoItemData {
  id: string
  title: string
  duration: string
  time: string
  bars: number[]
}

const DEFAULT_MEMOS: AudioMemoItemData[] = [
  {
    id: 'memo-1',
    title: 'План редизайна мобильного экрана',
    duration: '0:42 мин',
    time: '14:30',
    bars: [2, 3, 4, 1.5, 3],
  },
  {
    id: 'memo-2',
    title: 'Брейншторм фичи Voice-to-SQL',
    duration: '2:18 мин',
    time: '12:10',
    bars: [3, 2, 4, 2.5, 1],
  },
  {
    id: 'memo-3',
    title: 'Заметки к встрече 1-на-1 с тимлидом',
    duration: '1:05 мин',
    time: '10:45',
    bars: [1, 3.5, 4, 2, 3],
  },
]

export interface RecentAudioWidgetProps {
  memos?: AudioMemoItemData[]
  onViewAll?: () => void
  onPlayMemo?: (id: string) => void
}

export const RecentAudioWidget: React.FC<RecentAudioWidgetProps> = ({
  memos = DEFAULT_MEMOS,
  onViewAll,
  onPlayMemo,
}) => {
  const [activeMemoId, setActiveMemoId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    setActiveMemoId((prev) => (prev === id ? null : id))
    onPlayMemo?.(id)
  }

  return (
    <section className="rounded-2xl bg-surface-container-low p-space-md shadow-sm flex flex-col gap-space-md border border-surface-container-high/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-body-md">graphic_eq</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Недавние аудиозаписи
          </h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
        >
          Смотреть все
        </button>
      </div>

      <div className="flex flex-col gap-space-xs">
        {memos.map((memo) => {
          const isCurrentActive = activeMemoId === memo.id
          return (
            <div
              key={memo.id}
              onClick={() => handleToggle(memo.id)}
              className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggle(memo.id)
                  }}
                  aria-label={isCurrentActive ? 'Приостановить запись' : 'Воспроизвести запись'}
                  className={`w-8 h-8 rounded-lg ${
                    isCurrentActive
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-highest group-hover:bg-primary group-hover:text-on-primary text-primary'
                  } flex items-center justify-center transition-all shrink-0 cursor-pointer`}
                >
                  <span className="material-symbols-outlined text-body-md">
                    {isCurrentActive ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface truncate">
                    {memo.title}
                  </span>
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-outline">
                    <span>{memo.duration}</span>
                    <span>•</span>
                    <span>{memo.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 h-4 shrink-0 px-2 opacity-60 group-hover:opacity-100">
                {memo.bars.map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h * 4}px` }}
                    className={`w-0.5 rounded ${
                      isCurrentActive && i % 2 === 0 ? 'bg-primary animate-pulse' : 'bg-secondary'
                    }`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
