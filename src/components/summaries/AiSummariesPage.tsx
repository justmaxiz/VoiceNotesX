import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { triggerDownload } from '../../lib/export'

interface SummaryReport {
  id: string
  title: string
  period: string
  date: string
  tags: string[]
  achievements: string[]
  bottlenecks: string[]
  recommendations: string[]
  rawText: string
}

const INITIAL_REPORTS: SummaryReport[] = [
  {
    id: 'rep-1',
    title: 'Дайджест дня: Понедельник, 5 октября',
    period: 'За сегодня',
    date: 'Сегодня, 18:30',
    tags: ['#Микросервисы', '#Q3 Метрики', '#Дизайн-система'],
    achievements: [
      'Согласован бюджет на AI API и проверена модель Gemini 2.0 Flash',
      'Завершен ревью PR #142 по микросервисной архитектуре',
    ],
    bottlenecks: [
      'Требуется финальное согласование дедлайна с продуктовой командой',
    ],
    recommendations: [
      'Зафиксировать релизный таймлайн до конца четверга',
      'Проверить локальный индекс MiniSearch на нагрузочных данных',
    ],
    rawText:
      'Сегодня обработано 6 аудиозаписей. Главный вектор усилий: финализация PR #142 по микросервисам и подготовка релиза VoiceNotes AI v2.5.',
  },
  {
    id: 'rep-2',
    title: 'Еженедельный отчет (W40)',
    period: 'Неделя 40',
    date: '3 октября, 19:00',
    tags: ['#Дизайн-система', '#Продуктивность', '#Календарь'],
    achievements: [
      'Закрыто 18 задач из спринта',
      'Внедрена высококонтрастная цветовая схема календаря (WCAG AAA)',
      'Интегрирован нативный захват аудио MediaRecorder и Web Speech STT',
    ],
    bottlenecks: [
      'Были задержки по тестированию стриминга аудио в Firefox',
    ],
    recommendations: [
      'Сфокусироваться на чистом тексте и быстром Quick Capture виджете',
    ],
    rawText:
      'Все ключевые цели спринта достигнуты. Переход на дизайн Obsidian Lumina 2.0 завершен успешно.',
  },
]

export const AiSummariesPage: React.FC = () => {
  const { items } = useAppStore()
  const [reports, setReports] = useState<SummaryReport[]>(INITIAL_REPORTS)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleGenerateSummary = (type: 'today' | 'weekly' | 'tag') => {
    setIsGenerating(true)
    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      const newRep: SummaryReport = {
        id: `rep-${Date.now()}`,
        title:
          type === 'today'
            ? `Свежий экспресс-дайджест дня (${nowStr})`
            : type === 'weekly'
            ? 'Ретроспектива текущей недели'
            : 'Анализ задач по тегу #Разработка',
        period: type === 'today' ? 'За сегодня' : type === 'weekly' ? 'За неделю' : 'По проекту',
        date: `Сегодня, ${nowStr}`,
        tags: ['#AI', '#Продуктивность', '#VoiceNotes'],
        achievements: [
          `Обработано ${items.length} активных записей в локальной базе`,
          'Высокий темп закрытия задач в фокусе дня',
        ],
        bottlenecks: ['Несколько несрочных идей в бэклоге требуют приоритизации'],
        recommendations: [
          'Продолжать фиксировать мысли через Space hotkey в Quick Capture',
          'Сформировать экспорт архива перед концом недели',
        ],
        rawText: `Автоматически сгенерированная сводка на основе ${items.length} элементов воркспейса. Фокус направлен на чистоту исполнения и реализацию ключевых фич.`,
      }

      setReports((prev) => [newRep, ...prev])
      setIsGenerating(false)
    }, 600)
  }

  const handleCopyReport = (report: SummaryReport) => {
    const textToCopy = `# ${report.title} (${report.date})\n\n${report.rawText}\n\n### Достижения:\n${report.achievements
      .map((a) => `- ${a}`)
      .join('\n')}\n\n### Рекомендации:\n${report.recommendations.map((r) => `- ${r}`).join('\n')}`

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
      setCopiedId(report.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleExportReport = (report: SummaryReport) => {
    const md = `# ${report.title}\n*Период: ${report.period} | ${report.date}*\n\n${report.rawText}\n\n## Достижения\n${report.achievements.map((a) => `- ${a}`).join('\n')}\n\n## Узкие места\n${report.bottlenecks.map((b) => `- ${b}`).join('\n')}\n\n## Рекомендации\n${report.recommendations.map((r) => `- ${r}`).join('\n')}`
    triggerDownload(md, `ai-summary-${report.id}.md`)
  }

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
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
            AI Сводки
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Аналитические дайджесты, ретроспективы недели и структурированные выжимки продуктивности
          </p>
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={() => handleGenerateSummary('today')}
          className="flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md font-medium transition-all shadow-md glow-violet cursor-pointer self-start md:self-end disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-body-lg ${isGenerating ? 'animate-spin' : ''}`}>
            {isGenerating ? 'sync' : 'auto_awesome'}
          </span>
          <span>{isGenerating ? 'Генерация...' : 'Сгенерировать дайджест дня'}</span>
        </button>
      </div>

      {/* Generation Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <button
          type="button"
          onClick={() => handleGenerateSummary('today')}
          className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary/40 text-left transition-all group cursor-pointer flex flex-col justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-secondary text-xl">today</span>
            <span className="text-xs text-outline group-hover:text-primary transition-colors">1 клик →</span>
          </div>
          <div>
            <h3 className="text-body-md font-semibold text-on-surface">Сводка за сегодня</h3>
            <p className="text-xs text-outline mt-0.5">Ключевые темы, закрытые дела и фокус дня</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleGenerateSummary('weekly')}
          className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary/40 text-left transition-all group cursor-pointer flex flex-col justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary text-xl">date_range</span>
            <span className="text-xs text-outline group-hover:text-primary transition-colors">1 клик →</span>
          </div>
          <div>
            <h3 className="text-body-md font-semibold text-on-surface">Еженедельный отчет</h3>
            <p className="text-xs text-outline mt-0.5">Ретроспектива недели, тренды и победы</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleGenerateSummary('tag')}
          className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary/40 text-left transition-all group cursor-pointer flex flex-col justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-[#4fc3f7] text-xl">tag</span>
            <span className="text-xs text-outline group-hover:text-primary transition-colors">1 клик →</span>
          </div>
          <div>
            <h3 className="text-body-md font-semibold text-on-surface">Анализ по проекту</h3>
            <p className="text-xs text-outline mt-0.5">Срез по тегам #Разработка и #Дизайн</p>
          </div>
        </button>
      </div>

      {/* Reports History */}
      <div className="flex flex-col gap-space-md mt-2">
        <h2 className="text-title-md font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-outline">history</span>
          <span>История сгенерированных отчетов</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {reports.map((report) => (
            <article
              key={report.id}
              className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between gap-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-title-md text-on-surface">
                    {report.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-label-sm font-medium">
                    {report.period}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {report.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-body-sm text-on-surface-variant leading-relaxed mb-3">
                  {report.rawText}
                </p>

                {/* Structured Sections */}
                <div className="space-y-2 text-xs bg-surface-container-high/30 p-3 rounded-xl border border-outline-variant/15">
                  <div>
                    <span className="text-secondary font-semibold uppercase tracking-wider block mb-1">
                      ✓ Достижения:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-on-surface">
                      {report.achievements.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1.5 border-t border-outline-variant/15">
                    <span className="text-primary font-semibold uppercase tracking-wider block mb-1">
                      → Рекомендации:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-on-surface">
                      {report.recommendations.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 text-xs text-outline">
                <span>{report.date}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyReport(report)}
                    className="hover:text-on-surface text-outline transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copiedId === report.id ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedId === report.id ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleExportReport(report)}
                    className="text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Экспорт в .md</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
