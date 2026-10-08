import { create } from 'zustand'
import { getSession, onSessionChange, ApiError } from '../lib/api'
import { summaryRepository } from '../lib/summaryRepository'
import {
  normalizePeriod,
  isSummaryReport,
  type SummaryPeriod,
  type SummaryFactsResponse,
  type SummaryReport,
} from '../../server/src/summaryContracts'

export interface SummaryStateEntry {
  data?: SummaryFactsResponse
  report?: SummaryReport
  fallback?: SummaryReport
  loading: boolean
  generating: boolean
  error?: string
  offline: boolean
}
interface SummaryState {
  entries: Record<string, SummaryStateEntry>
  load: (period: SummaryPeriod) => Promise<void>
  generate: (period: SummaryPeriod) => Promise<void>
  invalidate: () => void
}
export const summaryStateKey = (p: SummaryPeriod) =>
  JSON.stringify(normalizePeriod(p))
let owner = getSession()?.user.id
let epoch = 0
const inflight = new Map<string, Promise<void>>()
const controllers = new Map<string, AbortController>()
const watchers = new Map<string, number>()
export function watchSummary(key: string) {
  watchers.set(key, (watchers.get(key) || 0) + 1)
  return () => {
    const n = (watchers.get(key) || 1) - 1
    if (n <= 0) {
      watchers.delete(key)
      controllers.get(`generate:${key}`)?.abort()
    } else watchers.set(key, n)
  }
}
const empty = (): SummaryStateEntry => ({
  loading: false,
  generating: false,
  offline: false,
})
function cached(key: string): SummaryStateEntry {
  if (!owner) return empty()
  try {
    const value = JSON.parse(
      localStorage.getItem(`summary-v1:${owner}:${key}`) || 'null',
    )
    if (
      value?.schemaVersion === 1 &&
      value.owner === owner &&
      isSummaryReport(value.data?.report) &&
      summaryStateKey(value.data.report.period) === key
    ) {
      const r = value.data.report
      return {
        ...empty(),
        data: {
          period: r.period,
          asOf: r.asOf,
          metrics: r.metrics,
          facts: r.facts,
          coverage: r.coverage,
          sourceFingerprint: r.sourceFingerprint,
          report: r,
        },
        report: r,
        offline: true,
      }
    }
  } catch {}
  return empty()
}
function saveCache(key: string, data: SummaryFactsResponse) {
  if (!owner || !data.report) return
  try {
    localStorage.setItem(
      `summary-v1:${owner}:${key}`,
      JSON.stringify({
        schemaVersion: 1,
        owner,
        savedAt: new Date().toISOString(),
        data,
      }),
    )
  } catch {}
}
const errorText = (e: unknown) =>
  e instanceof ApiError && e.retryAfter
    ? `${e.message} Повтор доступен через ${Math.ceil(e.retryAfter / 60)} мин.`
    : e instanceof Error
      ? e.message
      : 'Не удалось загрузить сводку.'
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal.addEventListener('abort', abort, { once: true })
  })
const generationError = (code?: string) =>
  (
    ({
      AI_NOT_CONFIGURED:
        'ИИ не настроен на сервере. Показан фактический отчёт.',
      AI_UNAVAILABLE:
        'Сервис ИИ недоступен. Показан фактический отчёт. Попробуйте позже.',
      AI_TIMEOUT:
        'ИИ не ответил вовремя. Показан фактический отчёт. Попробуйте ещё раз.',
      AI_RATE_LIMIT:
        'Достигнут лимит запросов ИИ-провайдера. Показан фактический отчёт. Попробуйте позже.',
      AI_AUTH_ERROR:
        'Сервис ИИ отклонил серверный ключ. Показан фактический отчёт.',
      AI_INVALID_REQUEST:
        'Сервис ИИ отклонил формат запроса. Показан фактический отчёт.',
      SUMMARY_INVALID_RESPONSE:
        'Ответ ИИ не прошёл проверку источников или формата. Показан фактический отчёт.',
      SUMMARY_ATTEMPTS_EXHAUSTED:
        'Повторная генерация не удалась. Показан сохранённый отчёт.',
    }) as Record<string, string>
  )[code || ''] || 'ИИ не смог подготовить сводку. Показан фактический отчёт.'
export const useSummaryStore = create<SummaryState>((set, get) => {
  const patch = (key: string, value: Partial<SummaryStateEntry>) =>
    set((s) => ({
      entries: {
        ...s.entries,
        [key]: { ...(s.entries[key] || cached(key)), ...value },
      },
    }))
  return {
    entries: {},
    invalidate: () =>
      set((s) => ({
        entries: Object.fromEntries(
          Object.entries(s.entries).map(([key, e]) => [
            key,
            {
              ...e,
              report: e.report
                ? { ...e.report, freshness: 'stale' }
                : undefined,
            },
          ]),
        ),
      })),
    load: (period) => {
      if (!getSession()) return Promise.resolve()
      const key = summaryStateKey(period),
        requestKey = `load:${key}`
      if (inflight.has(requestKey)) return inflight.get(requestKey)!
      const started = epoch
      const controller = new AbortController()
      controllers.set(requestKey, controller)
      patch(key, { loading: true, error: undefined })
      const promise = summaryRepository
        .facts(normalizePeriod(period), controller.signal)
        .then((data) => {
          if (epoch !== started) return
          patch(key, {
            data,
            report: data.report || undefined,
            loading: false,
            offline: false,
          })
          saveCache(key, data)
        })
        .catch((e) => {
          if (epoch === started)
            patch(key, {
              loading: false,
              error: errorText(e),
              offline: !(e instanceof ApiError),
            })
        })
        .finally(() => {
          if (epoch === started) {
            inflight.delete(requestKey)
            controllers.delete(requestKey)
          }
        })
      inflight.set(requestKey, promise)
      return promise
    },
    generate: (period) => {
      if (!getSession()) return Promise.resolve()
      const key = summaryStateKey(period),
        requestKey = `generate:${key}`
      if (inflight.has(requestKey)) return inflight.get(requestKey)!
      const started = epoch
      const controller = new AbortController()
      controllers.set(requestKey, controller)
      patch(key, { generating: true, error: undefined, fallback: undefined })
      const promise = (async () => {
        const result = await summaryRepository.generate(
          normalizePeriod(period),
          controller.signal,
        )
        let job = result.job
        for (
          let attempt = 0;
          ['queued', 'running'].includes(job.stage) && attempt < 30;
          attempt++
        ) {
          if (epoch !== started || controller.signal.aborted) return
          await wait(Math.min(1000 * 1.3 ** attempt, 10000), controller.signal)
          job = (await summaryRepository.job(job.id, controller.signal)).job
        }
        if (epoch !== started) return
        if (job.stage === 'error') {
          const fallback = job.reportId
            ? await summaryRepository.report(job.reportId, controller.signal)
            : undefined
          if (epoch === started)
            patch(key, {
              fallback,
              error: generationError(job.error),
            })
        } else if (job.stage !== 'completed')
          patch(key, {
            error: 'Генерация продолжается на сервере. Обновите данные позже.',
          })
        await get().load(period)
        if (epoch === started && job.stage === 'error')
          patch(key, {
            error: generationError(job.error),
          })
      })()
        .catch((e) => {
          if (epoch === started && (e as Error).name !== 'AbortError')
            patch(key, { error: errorText(e) })
        })
        .finally(() => {
          if (epoch === started) {
            patch(key, { generating: false })
            inflight.delete(requestKey)
            controllers.delete(requestKey)
          }
        })
      inflight.set(requestKey, promise)
      return promise
    },
  }
})
onSessionChange((session) => {
  if (session?.user.id === owner) return
  epoch++
  owner = session?.user.id
  controllers.forEach((c) => c.abort())
  controllers.clear()
  inflight.clear()
  watchers.clear()
  useSummaryStore.setState({ entries: {} })
})
