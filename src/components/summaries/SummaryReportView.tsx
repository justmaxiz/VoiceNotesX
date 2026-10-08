import { useState } from 'react'
import type {
  SummaryReport,
  SummaryMetrics,
  SummarySource,
} from '../../../server/src/summaryContracts'
import { addDays, localInstant } from '../../../server/src/summaryContracts'
import { useDrawerStore } from '../../store/useDrawerStore'
import { api } from '../../lib/api'
import type { Note } from '../../../server/src/contracts'
import { toItem } from '../../lib/repository'
import { useAppStore } from '../../store/useAppStore'
import { formatSummary, summaryFilename } from '../../lib/summaryExport'
import { triggerDownload } from '../../lib/export'

const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('ru-RU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
export const summaryPeriodLabel = (report: Pick<SummaryReport, 'period'>) => {
  const last = addDays(report.period.endDateExclusive, -1)
  return report.period.startDate === last
    ? dateLabel(last)
    : `${dateLabel(report.period.startDate)} — ${dateLabel(last)}`
}

export function SummaryMetricsRow({ metrics: m }: { metrics: SummaryMetrics }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 py-4 border-y border-outline-variant/30">
      {[
        [m.completed, 'Завершено за период'],
        [m.createdScheduled + m.createdUnscheduled, 'Создано за период'],
        [m.openScheduled, 'Открыто в расписании периода'],
        [m.overdue, 'Просрочено на момент сводки'],
      ].map(([value, label]) => (
        <div key={label}>
          <dt className="text-xs leading-relaxed text-outline">{label}</dt>
          <dd className="text-xl font-semibold text-on-surface mt-1">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function scheduleOrder(source: SummarySource | undefined, zone: string) {
  const s = source?.schedule
  if (!s) return Infinity
  if (s.deadline || s.startDate) return Date.parse(s.deadline || s.startDate!)
  if (s.dueDate)
    return localInstant(s.dueDate, s.dueTime || '23:59', s.timeZone || zone)
  return Infinity
}

function scheduleLabel(source: SummarySource, zone: string) {
  const s = source.schedule
  if (!s) return 'Дата не сохранена в этой сводке'
  if (s.dueDate && (s.isAllDay || (!s.dueTime && !s.startDate)))
    return `${dateLabel(s.dueDate)} · без времени`
  const instant = (value: string) =>
    new Date(value).toLocaleString('ru-RU', {
      timeZone: zone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  if (s.startDate && s.deadline && !s.isAllDay) {
    const localDay = (value: string) =>
      new Date(value).toLocaleDateString('ru-RU', { timeZone: zone })
    if (localDay(s.startDate) === localDay(s.deadline)) {
      const clock = new Date(s.deadline).toLocaleTimeString('ru-RU', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
      })
      return `${instant(s.startDate)} — ${clock}`
    }
    return `${instant(s.startDate)} — ${instant(s.deadline)}`
  }
  if (s.deadline && !s.isAllDay) return `Срок: ${instant(s.deadline)}`
  if (s.dueDate)
    return `${dateLabel(s.dueDate)}${s.dueTime ? `, ${s.dueTime} (${s.timeZone || zone})` : ' · без времени'}`
  if (s.startDate) return `Начало: ${instant(s.startDate)}`
  return 'Без срока'
}

export function SummaryReportView({
  report,
  compact = false,
}: {
  report: SummaryReport
  compact?: boolean
}) {
  const [error, setError] = useState(''),
    [copied, setCopied] = useState(false)
  const open = async (id: string) => {
    setError('')
    try {
      const { note } = await api<{ note: Note }>(
        `/notes/${encodeURIComponent(id)}`,
      )
      const items = useAppStore.getState().items
      useAppStore.setState({
        items: [...items.filter((i) => i.id !== id), toItem(note)],
      })
      useDrawerStore.getState().openDrawer(id)
    } catch {
      const s = report.sources.find((s) => s.id === id)
      setError(`Запись недоступна. В сводке: ${s?.title || id}.`)
    }
  }
  const sources = new Map(report.sources.map((s) => [s.id, s]))
  const factIds = (kind: string) => [
    ...new Set(
      report.facts.filter((f) => f.kind === kind).flatMap((f) => f.noteIds),
    ),
  ]
  const rows = (ids: string[], timed = true) => (
    <ul className="divide-y divide-outline-variant/20">
      {[...new Set(ids)]
        .sort(
          (a, b) =>
            scheduleOrder(sources.get(a), report.period.timeZone) -
            scheduleOrder(sources.get(b), report.period.timeZone),
        )
        .map((id) => {
          const source = sources.get(id)
          return (
            <li key={id}>
              <button
                onClick={() => void open(id)}
                className="group w-full flex items-center justify-between gap-4 py-3 text-left rounded-lg hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-on-surface group-hover:text-primary break-words">
                    {source?.title || 'Открыть запись'}
                  </span>
                  {timed && source && (
                    <span className="block mt-1 text-xs leading-relaxed text-on-surface-variant">
                      {scheduleLabel(source, report.period.timeZone)}
                    </span>
                  )}
                  {source && !source.available && (
                    <span className="block text-xs text-outline mt-1">
                      Запись больше недоступна
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-outline text-lg shrink-0"
                >
                  chevron_right
                </span>
              </button>
            </li>
          )
        })}
    </ul>
  )
  const m = report.metrics
  const copy = async () => {
    setError('')
    setCopied(false)
    try {
      await navigator.clipboard.writeText(formatSummary(report))
      setCopied(true)
    } catch {
      setError('Не удалось скопировать. Используйте экспорт в Markdown.')
    }
  }
  return (
    <article className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg sm:text-xl font-semibold text-on-surface">
          {summaryPeriodLabel(report)}
        </h2>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          {m.upcoming
            ? `Сроков в ближайшие 7 дней: ${m.upcoming}.`
            : 'В ближайшие 7 дней сроков нет.'}{' '}
          {m.overdue
            ? `Просрочено: ${m.overdue}.`
            : 'Просроченных записей нет.'}
        </p>
        <p className="text-xs text-outline">
          По данным на{' '}
          {new Date(report.asOf).toLocaleString('ru-RU', {
            timeZone: report.period.timeZone,
          })}{' '}
          ({report.period.timeZone}).
        </p>
        {report.freshness !== 'current' && (
          <p className="text-xs text-outline">
            {report.freshness === 'stale'
              ? 'Записи изменились после создания сводки. Обновите её, чтобы увидеть актуальные сроки.'
              : 'Сохранённая сводка: сроки и результаты показаны на момент её создания.'}
          </p>
        )}
      </div>
      <p className="text-sm leading-relaxed text-on-surface-variant">
        {report.overview.text}
      </p>
      {(m.overdue > 0 || m.overlaps > 0) && (
        <section className="border-l-2 border-error/60 pl-4 space-y-4">
          <h3 className="text-base font-semibold text-on-surface">
            Требует внимания
          </h3>
          {m.overdue > 0 && (
            <div>
              <p className="text-sm font-medium text-error">
                Просроченных записей: {m.overdue}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                Откройте запись, чтобы завершить её или изменить срок.
              </p>
              {rows(factIds('overdue'))}
            </div>
          )}
          {m.overlaps > 0 && (
            <div>
              <p className="text-sm font-medium text-on-surface">
                Пересечений в расписании периода: {m.overlaps}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                У этих записей пересекаются заданные интервалы. Сверьте время и
                при необходимости перенесите запись.
              </p>
              {rows(factIds('overlaps'))}
            </div>
          )}
        </section>
      )}
      {!compact && m.upcoming > 0 && (
        <section>
          <h3 className="text-base font-semibold text-on-surface">
            Ближайшие сроки
          </h3>
          <p className="mt-1 text-xs text-outline">
            На 7 дней от момента сводки, независимо от выбранного периода. Время
            — {report.period.timeZone}.
          </p>
          {rows(factIds('upcoming'))}
        </section>
      )}
      {!compact && m.openScheduled > 0 && (
        <details className="text-sm text-on-surface-variant">
          <summary className="cursor-pointer py-2">
            Все открытые записи в расписании периода ({m.openScheduled})
          </summary>
          {rows(factIds('openScheduled'))}
        </details>
      )}
      {!compact && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-on-surface">
            Итоги периода
          </h3>
          <SummaryMetricsRow metrics={m} />
          {m.completed ? (
            rows(factIds('completed'), false)
          ) : (
            <p className="text-sm text-on-surface-variant">
              За этот период нет завершённых записей.
            </p>
          )}
          {m.estimatedCount > 0 ? (
            <p className="text-sm leading-relaxed text-on-surface-variant">
              План в расписании периода:{' '}
              {Math.floor(m.plannedMinutes / 60) > 0
                ? `${Math.floor(m.plannedMinutes / 60)} ч `
                : ''}
              {m.plannedMinutes % 60 > 0 ? `${m.plannedMinutes % 60} мин` : ''}.
              Оценки указаны у {m.estimatedCount} из {m.scheduledCount} записей.
              Это план, фактическое время не учитывается.
            </p>
          ) : (
            <p className="text-sm text-outline">
              Оценки длительности для расписания периода не указаны.
            </p>
          )}
          {m.comparison && (
            <p className="text-sm text-on-surface-variant">
              {m.comparison.delta === 0
                ? 'Завершено столько же записей, сколько в сопоставимом периоде.'
                : `Завершено на ${Math.abs(m.comparison.delta)} ${m.comparison.delta < 0 ? 'меньше' : 'больше'}, чем в сопоставимом периоде.`}
            </p>
          )}
        </section>
      )}
      {!compact && (
        <details className="text-xs text-outline border-t border-outline-variant/30 pt-4">
          <summary className="cursor-pointer py-1">
            О сводке и ограничениях данных
          </summary>
          <div className="space-y-3 mt-3 leading-relaxed">
            <p>
              Учтено {report.coverage.total} записей.{' '}
              {report.generationMode === 'ai'
                ? `ИИ использовал ${report.coverage.selected} записей.`
                : 'Показана сводка по данным записей.'}
            </p>
            <ul className="space-y-2">
              {report.coverage.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            {report.coverage.truncatedTexts > 0 && (
              <p>
                Некоторые длинные поля не использованы при подготовке сводки.
              </p>
            )}
            <p>
              Создана{' '}
              {new Date(report.generatedAt).toLocaleString('ru-RU', {
                timeZone: report.period.timeZone,
              })}
              . Версия {report.version}.
            </p>
          </div>
        </details>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {!compact && (
        <div className="flex flex-wrap gap-3 border-t border-outline-variant/30 pt-4">
          <button
            className="rounded-lg px-3 py-2 text-sm text-primary hover:bg-surface-container-high"
            onClick={() => void copy()}
          >
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
          <button
            className="rounded-lg px-3 py-2 text-sm text-primary hover:bg-surface-container-high"
            onClick={() => {
              try {
                triggerDownload(formatSummary(report), summaryFilename(report))
              } catch {
                setError('Не удалось скачать файл.')
              }
            }}
          >
            Экспорт в .md
          </button>
        </div>
      )}
    </article>
  )
}
