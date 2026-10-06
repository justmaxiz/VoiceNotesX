import { localDateKey } from '../../lib/taskDates'
import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { triggerDownload } from '../../lib/export'
import {
  GeneratedDigest,
  getStoredSummaries,
  saveStoredSummaries,
  generateDigestData,
} from '../../lib/dailyDigestScheduler'

export const AiSummariesPage: React.FC = () => {
  const { items } = useAppStore()
  const [reports, setReports] = useState<GeneratedDigest[]>(() => {
    const stored = getStoredSummaries()
    return stored
  })

  const [generationError, setGenerationError] = useState<string | null>(null)
  useEffect(() => {
    const refresh = () => setReports(getStoredSummaries())
    window.addEventListener('voicenotes:summaries-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('voicenotes:summaries-updated', refresh); window.removeEventListener('storage', refresh) }
  }, [])
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState('#Разработка')

  const todayKey = localDateKey()
  const todayReport = reports.find((r) => r.dateKey === todayKey && r.period === 'За сегодня')

  const tasksCount = items.filter((i) => i.type === 'task').length
  const notesCount = items.filter((i) => i.type === 'note').length

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  const handleGenerate = (type: 'today' | 'weekly' | 'tag') => {
    if (cooldownSeconds > 0) return

    setGenerationError(null)
    try {
      const generated = generateDigestData(type, items, selectedTag)
      const current = getStoredSummaries()
      const updated = [generated, ...current.filter((report) => report.id !== generated.id)]
      saveStoredSummaries(updated)
      setReports(updated)
      setCooldownSeconds(30)
    } catch (error) { setGenerationError((error as Error).message) }
  }

  const handleCopyReport = (report: GeneratedDigest) => {
    const textToCopy = `# ${report.title} (${report.date})\n\n${report.rawText}\n\n### Достижения:\n${report.achievements
      .map((a) => `- ${a}`)
      .join('\n')}\n\n### Рекомендации:\n${report.recommendations.map((r) => `- ${r}`).join('\n')}`

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
      setCopiedId(report.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleExportReport = (report: GeneratedDigest) => {
    const md = `# ${report.title}\n*Период: ${report.period} | ${report.date}*\n\n${report.rawText}\n\n## Достижения\n${report.achievements.map((a) => `- ${a}`).join('\n')}\n\n## Узкие места\n${report.bottlenecks.map((b) => `- ${b}`).join('\n')}\n\n## Рекомендации\n${report.recommendations.map((r) => `- ${r}`).join('\n')}`
    triggerDownload(md, `ai-summary-${report.id}.md`)
  }

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {generationError && <p role="alert" className="text-error">{generationError}</p>}
      <p className="text-xs text-outline">Локальные отчеты по вашим записям. Семантический AI-анализ не подключен.</p>
      {/* Header - Duplicate button removed per TASK-39 DoD */}
      <div>
        <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
          <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
          <span className="uppercase tracking-wider">ИИ Дайджесты</span>
          <span>•</span>
          <span>Локальные итоги</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
          AI Сводки
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Аналитические дайджесты, ретроспективы недели и структурированные выжимки продуктивности
        </p>
      </div>

      {/* SECTION 1: Generator Action Cards */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">psychology</span>
            <span>Генератор аналитических отчетов</span>
          </h2>

          {cooldownSeconds > 0 && (
            <span className="text-xs text-outline font-mono flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/30">
              <span className="material-symbols-outlined text-xs text-primary animate-spin">
                timer
              </span>
              <span>Кулдаун: {cooldownSeconds}с</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* Today Digest Card */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-secondary text-2xl">today</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-semibold">
                  AI Сводка
                </span>
              </div>
              <h3 className="text-body-md font-semibold text-on-surface">Сводка за сегодня</h3>
              <p className="text-xs text-outline mt-1 leading-relaxed">
                Анализ закрытых дел, текущих блокеров и фокуса дня
              </p>
              <div className="text-[11px] text-on-surface-variant mt-2">
                К анализу: {tasksCount} задач и {notesCount} заметок
              </div>
              {todayReport && (
                <div className="text-[11px] text-secondary mt-1 flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-xs">check</span>
                  <span>Обновлено в {todayReport.updatedAtTime}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={cooldownSeconds > 0}
              onClick={() => handleGenerate('today')}
              className="w-full py-2 px-3 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs glow-emerald"
            >
              <span className={`material-symbols-outlined text-sm `}>
                auto_awesome
              </span>
              <span>
                {todayReport
                  ? 'Обновить сводку за сегодня'
                  : 'Сформировать за сегодня'}
              </span>
            </button>
          </div>

          {/* Weekly Retrospective Card */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-primary text-2xl">date_range</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary text-[10px] font-semibold">
                  AI Ретро
                </span>
              </div>
              <h3 className="text-body-md font-semibold text-on-surface">Еженедельная ретроспектива</h3>
              <p className="text-xs text-outline mt-1 leading-relaxed">
                Сводка результатов за последние 7 дней, тренды и победы
              </p>
              <div className="text-[11px] text-on-surface-variant mt-2">
                Глубокий анализ истории
              </div>
            </div>

            <button
              type="button"
              disabled={cooldownSeconds > 0}
              onClick={() => handleGenerate('weekly')}
              className="w-full py-2 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs glow-violet"
            >
              <span className={`material-symbols-outlined text-sm `}>
                auto_awesome
              </span>
              <span>
                Сформировать ретро недели
              </span>
            </button>
          </div>

          {/* Project Tag Analysis Card */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-[#4fc3f7] text-2xl">tag</span>
                <span className="px-2 py-0.5 rounded-full bg-[#4fc3f7]/20 text-[#4fc3f7] text-[10px] font-semibold">
                  AI Срез
                </span>
              </div>
              <h3 className="text-body-md font-semibold text-on-surface">Анализ проекта по тегу</h3>
              <p className="text-xs text-outline mt-1 leading-relaxed">
                Детальный отчет по выбранному направлению деятельности
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                {['#Разработка', '#Дизайн', '#Финансы'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-surface-container-highest text-primary font-semibold border border-primary/40'
                        : 'bg-surface-container text-outline hover:text-on-surface'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={cooldownSeconds > 0}
              onClick={() => handleGenerate('tag')}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <span className={`material-symbols-outlined text-sm `}>
                analytics
              </span>
              <span>
                {`Сформировать отчет ${selectedTag}`}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: Saved Reports & Archive */}
      <section className="flex flex-col gap-space-md mt-4">
        <h2 className="text-title-md font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-outline">history</span>
          <span>Архив и сохраненные отчеты ({reports.length})</span>
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
                      ✓ Главные результаты:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-on-surface">
                      {report.achievements.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1.5 border-t border-outline-variant/15">
                    <span className="text-error font-semibold uppercase tracking-wider block mb-1">
                      ! Блокеры и открытые дела:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-on-surface">
                      {report.bottlenecks.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1.5 border-t border-outline-variant/15">
                    <span className="text-primary font-semibold uppercase tracking-wider block mb-1">
                      → План и рекомендации:
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
      </section>
    </div>
  )
}
