import React from 'react'

export interface DailySummaryCardProps {
  onGenerateReport?: () => void
  tags?: string[]
  notesAnalyzedCount?: number
  summaryText?: string
}


export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({
  onGenerateReport,
  tags = [],
  notesAnalyzedCount = 0,
  summaryText = 'Пока нет данных для отчета',
}) => {
  const uniqueTags = Array.from(new Map(
    tags
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean)
      .map((tag) => [tag.toLocaleLowerCase('ru-RU'), tag])
  ).values())

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
      {uniqueTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {uniqueTags.map((cleanTag) => {
            return (
              <span
                key={cleanTag.toLocaleLowerCase('ru-RU')}
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
        className="mt-0.5 w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-medium transition-colors flex items-center justify-center cursor-pointer"
      >
        <span>Полный отчет за день</span>
      </button>
    </section>
  )
}
