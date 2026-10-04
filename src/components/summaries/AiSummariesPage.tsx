import React from 'react'

export const AiSummariesPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
            <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
            <span className="uppercase tracking-wider">ИИ Дайджесты</span>
            <span>•</span>
            <span>Google Gemini Flash Engine</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            AI Сводки
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Аналитические отчеты, структурированные выжимки встреч и автоматические дайджесты дня
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all shadow-[0_0_20px_-3px_rgba(160,120,255,0.4)] cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">auto_awesome</span>
          <span>Сгенерировать дайджест дня</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {/* Card 1 */}
        <div className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Дайджест дня: Пятница, 4 октября
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm">
              Актуально
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm">
              #Микросервисы
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm">
              #Q3 Отчет
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm">
              #Архитектура
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Сегодня обработано 6 аудиозаписей. Главный вектор усилий: финализация PR #142 по
            микросервисам и подготовка релиза VoiceNotes AI v2.4. Согласованы параметры производительности.
          </p>
          <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/20 text-xs text-outline">
            <span>Модель: Gemini 2.0 Flash</span>
            <button type="button" className="text-primary hover:underline">
              Экспорт в Markdown
            </button>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Недельная ретроспектива (W40)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm">
              Архив
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm">
              #Дизайн-система
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm">
              #Продуктивность
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Выполнено 24 задачи из 28 запланированных (+18% к прошлой неделе). Записано 18 голосовых
            заметок суммарной длительностью 42 минуты. Все ключевые цели спринта достигнуты.
          </p>
          <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/20 text-xs text-outline">
            <span>Модель: Gemini 2.0 Flash</span>
            <button type="button" className="text-primary hover:underline">
              Экспорт в Markdown
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
