import { api } from './api'
import type {
  SummaryPeriod,
  SummaryFactsResponse,
  SummaryReport,
  SummaryJob,
  SummarySettings,
} from '../../server/src/summaryContracts'
export const summaryRepository = {
  facts: (period: SummaryPeriod, signal?: AbortSignal) =>
    api<SummaryFactsResponse>(
      `/summaries/facts?period=${encodeURIComponent(JSON.stringify(period))}`,
      { signal },
    ),
  generate: (period: SummaryPeriod, signal?: AbortSignal) =>
    api<{ job: SummaryJob; report: SummaryReport | null }>(
      '/summaries/generate',
      { method: 'POST', body: JSON.stringify(period), signal },
    ),
  job: (id: string, signal?: AbortSignal) =>
    api<{ job: SummaryJob }>(`/summaries/jobs/${encodeURIComponent(id)}`, {
      signal,
    }),
  report: (id: string, signal?: AbortSignal) =>
    api<SummaryReport>(`/summaries/reports/${encodeURIComponent(id)}`, {
      signal,
    }),
  archive: (offset = 0, signal?: AbortSignal) =>
    api<{ reports: SummaryReport[]; nextOffset: number | null }>(
      `/summaries/archive?offset=${offset}`,
      { signal },
    ),
  settings: () => api<SummarySettings>('/summaries/settings'),
  saveSettings: (patch: Partial<SummarySettings> & { initialize?: boolean }) =>
    api<SummarySettings>('/summaries/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
}
