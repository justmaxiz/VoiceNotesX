import React from 'react'

export interface DailySummaryCardProps {
  onGenerateReport?: () => void
  tags?: string[]
  notesAnalyzedCount?: number
  summaryText?: string
}

const DEFAULT_TAGS = ['#Микросервисы', '#Q3 Метрики', '#Дизайн-система', '#Бюджет']

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({
  onGenerateReport,
  tags = DEFAULT_TAGS,
  notesAnalyzedCount = 6,
  summaryText = 'Основной упор сегодня сделан на архитектурную стабильность и подготовку к запуску версии 2.5. Рекомендуется согласовать таймлайн до конца недели.',
}) => {
  return (
    <section className="rounded-2xl bg-surface-container-low p-space-md shadow-sm relative overflow-hidden flex flex-col gap-space-md border border-surface-container-high/30">
      {/* Diffused Subtle Violet Light */}
      <div
        aria-hidden="true"
        className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-tertiary text-body-md">psychology</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">AI Сводка дня</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-tertiary font-label-sm text-label-sm">
          Анализ {notesAnalyzedCount} заметок
        </span>
      </div>

      {/* Takeaways Block */}
      <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-space-sm border border-surface-container-high/20">
        <div className="font-label-md text-label-md text-on-surface flex items-center gap-1">
          <span className="material-symbols-outlined text-secondary text-label-lg">hub</span>
          <span>Ключевые темы и паттерны</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          {summaryText}
        </p>
      </div>

      <button
        type="button"
        onClick={onGenerateReport}
        className="w-full py-2.5 px-space-md rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-label-md text-label-md transition-all flex items-center justify-center gap-space-xs shadow-sm cursor-pointer"
      >
        <span className="material-symbols-outlined text-body-md">auto_awesome</span>
        <span>Сгенерировать полный отчет за день</span>
      </button>
    </section>
  )
}
