import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useSummaryStore,
  summaryStateKey,
  watchSummary,
} from '../useSummaryStore'
import { summaryRepository } from '../../lib/summaryRepository'
import { setSession } from '../../lib/api'
import {
  buildSummaryContext,
  factualSummary,
} from '../../../server/src/summaryFacts'
import {
  presetPeriod,
  type SummaryFactsResponse,
  type SummaryReport,
} from '../../../server/src/summaryContracts'
const p = presetPeriod('day', 'UTC'),
  key = summaryStateKey(p)
const c = buildSummaryContext([], p, new Date())
const report: SummaryReport = {
  ...factualSummary(c),
  id: 'snapshot',
  slotKey: 'slot',
  version: 1,
  period: p,
  asOf: c.asOf,
  generatedAt: c.asOf,
  metrics: c.metrics,
  facts: c.facts,
  coverage: c.coverage,
  sources: [],
  sourceFingerprint: c.sourceFingerprint,
  generationMode: 'empty',
  freshness: 'current',
}
const data: SummaryFactsResponse = { ...c, report }
describe('Shared server summary state', () => {
  beforeEach(() => {
    setSession({ accessToken: 'a', user: { id: 'a', email: 'a' } })
    useSummaryStore.setState({ entries: {} })
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('deduplicates page and dashboard reads, separates period keys', async () => {
    let finish!: (value: SummaryFactsResponse) => void
    const read = vi.spyOn(summaryRepository, 'facts').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const a = useSummaryStore.getState().load(p),
      b = useSummaryStore.getState().load(p)
    expect(a).toBe(b)
    expect(read).toHaveBeenCalledTimes(1)
    finish(data)
    await a
    expect(useSummaryStore.getState().entries[key].report?.id).toBe('snapshot')
    expect(
      useSummaryStore.getState().entries[
        summaryStateKey({ ...p, tags: ['other'] })
      ],
    ).toBeUndefined()
  })
  it('drops late owner A responses and removes A reports immediately on switch', async () => {
    let finish!: (value: SummaryFactsResponse) => void
    vi.spyOn(summaryRepository, 'facts').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const pending = useSummaryStore.getState().load(p)
    setSession({ accessToken: 'b', user: { id: 'b', email: 'b' } })
    finish(data)
    await pending
    expect(useSummaryStore.getState().entries).toEqual({})
  })
  it('retains successful report on offline and marks mutations stale without LLM', async () => {
    vi.spyOn(summaryRepository, 'facts')
      .mockResolvedValueOnce(data)
      .mockRejectedValueOnce(new TypeError('offline'))
    const generate = vi.spyOn(summaryRepository, 'generate')
    await useSummaryStore.getState().load(p)
    useSummaryStore.getState().invalidate()
    expect(useSummaryStore.getState().entries[key].report?.freshness).toBe(
      'stale',
    )
    expect(generate).not.toHaveBeenCalled()
    await useSummaryStore.getState().load(p)
    expect(useSummaryStore.getState().entries[key].offline).toBe(true)
    expect(useSummaryStore.getState().entries[key].report?.id).toBe('snapshot')
  })
  it('deduplicates generation, polls once to completion and shares the report', async () => {
    vi.useFakeTimers()
    const off = watchSummary(key)
    const generate = vi.spyOn(summaryRepository, 'generate').mockResolvedValue({
      job: { id: 'job', stage: 'queued', attempts: 0 },
      report: null,
    })
    const job = vi.spyOn(summaryRepository, 'job').mockResolvedValue({
      job: {
        id: 'job',
        stage: 'completed',
        attempts: 1,
        reportId: 'snapshot',
      },
    })
    vi.spyOn(summaryRepository, 'facts').mockResolvedValue(data)
    const a = useSummaryStore.getState().generate(p),
      b = useSummaryStore.getState().generate(p)
    expect(a).toBe(b)
    await vi.advanceTimersByTimeAsync(1000)
    await a
    expect(generate).toHaveBeenCalledTimes(1)
    expect(job).toHaveBeenCalledTimes(1)
    expect(useSummaryStore.getState().entries[key].report?.id).toBe('snapshot')
    off()
  })
  it('stops polling when the final interested component leaves', async () => {
    vi.useFakeTimers()
    const off = watchSummary(key)
    vi.spyOn(summaryRepository, 'generate').mockResolvedValue({
      job: { id: 'job', stage: 'running', attempts: 1 },
      report: null,
    })
    const job = vi.spyOn(summaryRepository, 'job')
    const pending = useSummaryStore.getState().generate(p)
    await vi.advanceTimersByTimeAsync(10)
    off()
    await pending
    await vi.advanceTimersByTimeAsync(30000)
    expect(job).not.toHaveBeenCalled()
    expect(useSummaryStore.getState().entries[key].generating).toBe(false)
  })
  it('preserves the specific provider error after refreshing facts', async () => {
    vi.spyOn(summaryRepository, 'generate').mockResolvedValue({
      job: {
        id: 'failed',
        stage: 'error',
        attempts: 1,
        error: 'AI_NOT_CONFIGURED',
      },
      report: null,
    })
    vi.spyOn(summaryRepository, 'facts').mockResolvedValue(data)
    await useSummaryStore.getState().generate(p)
    expect(useSummaryStore.getState().entries[key].error).toContain(
      'ИИ не настроен на сервере',
    )
    expect(useSummaryStore.getState().entries[key].report?.id).toBe('snapshot')
  })
})
