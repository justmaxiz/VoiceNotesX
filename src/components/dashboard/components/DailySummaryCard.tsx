import React from 'react'

export interface DailySummaryCardProps {
  onGenerateReport?: () => void
  tags?: string[]
  notesAnalyzedCount?: number
  summaryText?: string
}

const DEFAULT_TAGS = ['Микросервисы', 'Метрики Q3', 'Дизайн-система', 'Бюджет']

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({
  onGenerateReport,
  tags = DEFAULT_TAGS,
  notesAnalyzedCount = 6,
  summaryText = 'Основной упор сегодня сделан на архитектурную стабильность и подготовку к запуску версии 2.5. Рекомендуется согласовать таймлайн до конца недели.',
}) => {
  return (
    <section className="rounded-2xl bg-surface-container-low p-space-md shadow-xs flex flex-col gap-3.5 border border-surface-container-high/40">
      {/* Header: Title & Count */}
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
          Сводка дня
        </h3>
        <span className="text-xs text-outline font-medium">
          {notesAnalyzedCount} заметок
        </span>
      </div>

      {/* Summary Text */}
      <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
        {summaryText}
      </p>

      {/* Key Topics / Tags without hashtag spam */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tags.map((rawTag) => {
            const cleanTag = rawTag.replace(/^#/, '')
            return (
              <span
                key={rawTag}
                className="px-2.5 py-0.5 rounded-lg bg-surface-container-high/70 text-on-surface-variant text-[11px] font-medium transition-colors"
              >
                {cleanTag}
              </span>
            )
          })}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={onGenerateReport}
        className="mt-0.5 w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-outline-variant/20"
      >
        <span>Полный отчет за день</span>
        <span className="material-symbols-outlined text-[15px] text-outline">
          arrow_forward
        </span>
      </button>
    </section>
  )
}
