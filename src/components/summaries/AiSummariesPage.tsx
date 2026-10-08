import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useSummary, useSummaryTimeZone } from '../../hooks/useSummary'
import {
  addDays,
  presetPeriod,
  normalizeTag,
  type SummaryPeriod,
  type SummaryPreset,
  type SummaryReport,
} from '../../../server/src/summaryContracts'
import {
  SummaryMetricsRow,
  SummaryReportView,
  summaryPeriodLabel,
} from './SummaryReportView'
import { summaryRepository } from '../../lib/summaryRepository'
import { getSession, onSessionChange } from '../../lib/api'
import {
  getLegacySummaries,
  formatLegacySummary,
} from '../../lib/legacySummaries'
import { triggerDownload } from '../../lib/export'
import { useSummaryStore } from '../../store/useSummaryStore'

const control =
  'bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface border border-outline-variant/30 min-w-0'
export const AiSummariesPage = () => {
  const zone = useSummaryTimeZone(),
    items = useAppStore((s) => s.items)
  const [preset, setPreset] = useState<SummaryPreset | 'custom'>('day'),
    [quickTag, setQuickTag] = useState(''),
    [tag, setTag] = useState(''),
    [category, setCategory] = useState(''),
    [comparison, setComparison] = useState(false)
  const [start, setStart] = useState(presetPeriod('day', zone).startDate),
    [end, setEnd] = useState(presetPeriod('day', zone).startDate)
  const [minute, setMinute] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setMinute((m) => m + 1), 60000)
    return () => clearInterval(timer)
  }, [])
  const period: SummaryPeriod = useMemo(
    () => ({
      ...presetPeriod(preset === 'custom' ? 'day' : preset, zone),
      ...(preset === 'custom'
        ? { startDate: start, endDateExclusive: addDays(end, 1) }
        : {}),
      tags: tag ? [tag] : [],
      ...(category ? { category } : {}),
      ...(comparison ? { comparison: true } : {}),
    }),
    [preset, zone, tag, category, comparison, start, end, minute],
  )
  const valid =
    period.startDate < period.endDateExclusive &&
    Date.parse(period.endDateExclusive) - Date.parse(period.startDate) <=
      366 * 86400000
  // Keep a valid key while editing an incomplete date range; no request until valid.
  const state = useSummary(valid ? period : presetPeriod('day', zone), valid)
  const [archive, setArchive] = useState<SummaryReport[]>([]),
    [next, setNext] = useState<number | null>(0),
    [archiveError, setArchiveError] = useState(''),
    [archiveLoading, setArchiveLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<SummaryReport | null>(
      null,
    ),
    [legacy, setLegacy] = useState(getLegacySummaries)
  const [owner, setOwner] = useState(getSession()?.user.id)
  const [archiveOwner, setArchiveOwner] = useState(owner)
  useEffect(() => onSessionChange((s) => setOwner(s?.user.id)), [])
  const entries = useSummaryStore((s) => s.entries)
  const reportVersions = Object.values(entries)
    .map((e) => e.report?.id || '')
    .join('|')
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    if (archiveOwner !== owner) setArchive([])
    setNext(0)
    setSelectedReport(null)
    setLegacy(getLegacySummaries())
    setArchiveError('')
    setArchiveOwner(owner)
    if (owner) {
      setArchiveLoading(true)
      summaryRepository
        .archive(0, controller.signal)
        .then((r) => {
          if (active) {
            setArchive(r.reports)
            setNext(r.nextOffset)
          }
        })
        .catch((e) => {
          if (active) setArchiveError(e.message)
        })
        .finally(() => {
          if (active) setArchiveLoading(false)
        })
    }
    return () => {
      active = false
      controller.abort()
    }
  }, [owner, reportVersions])
  const selected = archiveOwner === owner ? selectedReport : null
  const report = selected || state.report || state.fallback
  const displayedMetrics = report?.metrics || state.data?.metrics
  const tags = [
    ...new Set(
      items
        .flatMap((n) => [n.categoryTag, ...(n.tags || [])])
        .map(normalizeTag)
        .filter(Boolean),
    ),
  ].sort()
  const categories = [
    ...new Set(items.map((n) => normalizeTag(n.categoryTag)).filter(Boolean)),
  ].sort()
  const loadMore = async () => {
    if (next === null || archiveLoading) return
    const currentOwner = owner
    setArchiveLoading(true)
    try {
      const page = await summaryRepository.archive(next)
      if (getSession()?.user.id === currentOwner) {
        setArchive((a) => [
          ...a,
          ...page.reports.filter(
            (r) => !a.some((x) => x.slotKey === r.slotKey),
          ),
        ])
        setNext(page.nextOffset)
      }
    } catch (e) {
      if (getSession()?.user.id === currentOwner)
        setArchiveError((e as Error).message)
    } finally {
      if (getSession()?.user.id === currentOwner) setArchiveLoading(false)
    }
  }
  const generating = Object.values(entries).some((entry) => entry.generating)
  const generateQuick = (kind: 'day' | 'rolling7' | 'tag') => {
    const selectedTag = quickTag || tags[0] || ''
    const nextPreset = kind === 'day' ? 'day' : 'rolling7'
    const nextPeriod = {
      ...presetPeriod(nextPreset, zone),
      tags: kind === 'tag' ? [selectedTag] : [],
    }
    setPreset(nextPreset)
    setTag(kind === 'tag' ? selectedTag : '')
    setCategory('')
    setComparison(false)
    setSelectedReport(null)
    void useSummaryStore.getState().generate(nextPeriod)
  }
  const select = async (id: string) => {
    const current = owner
    try {
      const r = await summaryRepository.report(id)
      if (current === getSession()?.user.id) setSelectedReport(r)
    } catch (e) {
      if (current === getSession()?.user.id)
        setArchiveError((e as Error).message)
    }
  }
  return (
    <div className="flex flex-col gap-6 pt-4 max-w-4xl pb-12">
      <header>
        <h1 className="text-headline-xl font-semibold text-on-surface">
          AI Сводки
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Ближайшие сроки, конфликты расписания и итоги выбранного периода.
        </p>
      </header>
      <section
        aria-label="Создать сводку"
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        {(
          [
            [
              'day',
              'today',
              'Сводка за день',
              'Результаты и открытые дела за сегодня.',
              'Сформировать за день',
            ],
            [
              'rolling7',
              'date_range',
              'Сводка за неделю',
              'Итоги и записи за последние 7 дней.',
              'Сформировать за неделю',
            ],
            [
              'tag',
              'tag',
              'Сводка по тегу',
              'Выбранное направление за последние 7 дней.',
              'Сформировать по тегу',
            ],
          ] as const
        ).map(([kind, icon, title, description, action]) => (
          <div
            key={kind}
            className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 flex flex-col gap-3"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary text-2xl"
            >
              {icon}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                {description}
              </p>
            </div>
            {kind === 'tag' && (
              <label className="grid gap-1 text-xs text-outline">
                Тег для отчёта
                <select
                  className={control}
                  value={quickTag || tags[0] || ''}
                  onChange={(e) => setQuickTag(e.target.value)}
                >
                  {!tags.length && (
                    <option value="">Нет тегов в записях</option>
                  )}
                  {tags.map((value) => (
                    <option key={value} value={value}>
                      #{value}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              disabled={generating || (kind === 'tag' && !tags.length)}
              onClick={() => generateQuick(kind)}
              className="mt-auto w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              {action}
            </button>
          </div>
        ))}
      </section>
      <section
        aria-label="Параметры сводки"
        className="flex flex-wrap items-end gap-3"
      >
        <label className="grid gap-1 text-xs text-outline">
          Период
          <select
            className={control}
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value as typeof preset)
              setSelectedReport(null)
            }}
          >
            {[
              ['day', 'День'],
              ['rolling7', 'Последние 7 дней'],
              ['week', 'Календарная неделя'],
              ['month', 'Месяц'],
              ['custom', 'Диапазон'],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {preset === 'custom' && (
          <>
            <label className="grid gap-1 text-xs text-outline">
              Начало
              <input
                type="date"
                className={control}
                value={start}
                onChange={(e) => {
                  if (e.target.value) setStart(e.target.value)
                  setSelectedReport(null)
                }}
              />
            </label>
            <label className="grid gap-1 text-xs text-outline">
              Последний день
              <input
                type="date"
                className={control}
                value={end}
                onChange={(e) => {
                  if (e.target.value) setEnd(e.target.value)
                  setSelectedReport(null)
                }}
              />
            </label>
          </>
        )}
        <label className="grid gap-1 text-xs text-outline">
          Тег
          <select
            className={control}
            value={tag}
            onChange={(e) => {
              setTag(e.target.value)
              setSelectedReport(null)
            }}
          >
            <option value="">Все теги</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-outline">
          Категория
          <select
            className={control}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setSelectedReport(null)
            }}
          >
            <option value="">Все категории</option>
            {categories.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-on-surface-variant flex items-center gap-2 py-2">
          <input
            type="checkbox"
            checked={comparison}
            onChange={(e) => {
              setComparison(e.target.checked)
              setSelectedReport(null)
            }}
          />
          Сравнить закрытия
        </label>
      </section>
      {!valid && (
        <p role="alert" className="text-error">
          Выберите диапазон от 1 до 366 дней.
        </p>
      )}
      <section
        aria-label="Отчёт"
        className="bg-surface-container-low rounded-2xl p-4 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-outline">
            {selected ? 'Сохранённая сводка' : 'Сводка выбранного периода'}
          </p>
          <button
            type="button"
            className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            disabled={!valid || generating || !!selected}
            onClick={() => void state.generate()}
          >
            {state.generating
              ? 'Генерация…'
              : report
                ? 'Обновить сводку'
                : 'Сформировать сводку'}
          </button>
        </div>
        {state.error &&
          !selected &&
          (report && /проверку источников|формата/.test(state.error) ? (
            <details className="text-xs text-outline">
              <summary className="cursor-pointer py-2">
                ИИ-сводка недоступна. Показаны данные записей.
              </summary>
              <p className="mt-2" role="alert">
                {state.error}
              </p>
            </details>
          ) : (
            <p role="alert" className="text-error text-sm">
              {state.error}
            </p>
          ))}
        {state.offline && !selected && (
          <p role="status" className="text-sm text-outline">
            Нет связи. Показан сохранённый снимок.
          </p>
        )}
        {displayedMetrics && !report && (
          <div>
            <p className="text-xs text-outline">
              {`Данные на ${new Date(state.data!.asOf).toLocaleString('ru-RU', { timeZone: zone })}`}
            </p>
            <SummaryMetricsRow metrics={displayedMetrics} />
          </div>
        )}
        {state.loading && (
          <p role="status" className="text-xs text-outline">
            Загрузка фактов…
          </p>
        )}
        {report ? (
          <SummaryReportView key={report.id} report={report} />
        ) : state.generating ? (
          <div role="status" className="space-y-3 motion-safe:animate-pulse">
            <p className="text-sm text-outline">ИИ готовит наблюдения…</p>
            <div className="h-4 bg-surface-container-high rounded w-3/4" />
            <div className="h-4 bg-surface-container-high rounded w-1/2" />
          </div>
        ) : (
          state.data && (
            <p className="text-sm text-on-surface-variant">
              {state.data.coverage.total
                ? 'Факты готовы. Сформируйте сводку, чтобы выбрать результаты и источники.'
                : 'В периоде нет записей и текущих сроков для внимания.'}
            </p>
          )
        )}
        {state.data &&
          !report &&
          state.data.facts
            .filter((f) => f.kind === 'overdue' && f.value > 0)
            .map((f) => (
              <p className="text-sm text-error" key={f.id}>
                {f.text}
              </p>
            ))}
        {displayedMetrics && !report && (
          <p className="text-xs text-outline">
            План: {displayedMetrics.plannedMinutes} мин; оценки у{' '}
            {displayedMetrics.estimatedCount} из{' '}
            {displayedMetrics.scheduledCount} записей. Фактическое время
            неизвестно.
          </p>
        )}
        {!report && displayedMetrics?.comparison && (
          <p className="text-xs text-outline">
            Изменение закрытий в сопоставимом срезе:{' '}
            {displayedMetrics.comparison.delta}. Это не оценка продуктивности.
          </p>
        )}
        {comparison && displayedMetrics && !displayedMetrics.comparison && (
          <p className="text-xs text-outline">
            Для этого среза нет сопоставимого периода одинаковой длительности.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {selected && (
            <button
              className="text-primary text-sm rounded-lg px-3 py-2 hover:bg-surface-container-high"
              onClick={() => setSelectedReport(null)}
            >
              Вернуться к выбранному периоду
            </button>
          )}
          {!selected && (
            <button
              className="text-primary text-sm rounded-lg px-3 py-2 hover:bg-surface-container-high"
              onClick={() => void state.load()}
              disabled={state.loading}
            >
              Обновить данные
            </button>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-on-surface">
          Архив и сохранённые отчёты
        </h2>
        {archiveError && (
          <p role="alert" className="text-error">
            {archiveError}
          </p>
        )}
        <div className="divide-y divide-outline-variant/30">
          {archiveOwner === owner &&
            archive.map((r) => (
              <button
                key={r.slotKey}
                className="w-full text-left flex flex-wrap justify-between gap-2 py-3 text-sm text-on-surface-variant hover:text-primary"
                onClick={() => void select(r.id)}
              >
                <span>
                  {summaryPeriodLabel(r)}
                  {r.period.tags.length ? ` · ${r.period.tags.join(', ')}` : ''}
                </span>
                <span className="text-xs text-outline">
                  {r.generationMode === 'ai' ? 'ИИ' : 'Факты'} · версия{' '}
                  {r.version}
                </span>
              </button>
            ))}
        </div>
        {next !== null && (
          <button
            className="text-primary text-sm"
            disabled={archiveLoading}
            onClick={() => void loadMore()}
          >
            {archiveLoading ? 'Загрузка…' : 'Загрузить ещё'}
          </button>
        )}
      </section>
      {archiveOwner === owner && legacy.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg text-on-surface font-semibold">
            Локальные отчёты прежней версии
          </h2>
          {legacy.map((r) => (
            <details key={r.id} className="text-sm text-on-surface-variant">
              <summary className="cursor-pointer py-2">
                {r.title} · {r.date}
              </summary>
              <pre className="whitespace-pre-wrap font-sans text-xs">
                {formatLegacySummary(r)}
              </pre>
              <button
                className="text-primary py-2"
                onClick={() => {
                  try {
                    triggerDownload(
                      formatLegacySummary(r),
                      `legacy-summary-${r.id.replace(/[^a-zA-Z0-9-]/g, '')}.md`,
                    )
                  } catch {
                    setArchiveError('Не удалось скачать локальный отчёт.')
                  }
                }}
              >
                Экспорт в .md
              </button>
            </details>
          ))}
        </section>
      )}
    </div>
  )
}
