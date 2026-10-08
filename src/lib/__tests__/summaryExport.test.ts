import { describe, it, expect, beforeEach } from 'vitest'
import { formatSummary, summaryFilename } from '../summaryExport'
import { getLegacySummaries } from '../legacySummaries'
import { setSession } from '../api'
import {
  buildSummaryContext,
  factualSummary,
} from '../../../server/src/summaryFacts'
import {
  presetPeriod,
  type SummaryReport,
} from '../../../server/src/summaryContracts'
const c = buildSummaryContext([], presetPeriod('day', 'UTC'), new Date())
const r: SummaryReport = {
  ...factualSummary(c),
  id: 'report',
  slotKey: 'abc123',
  version: 1,
  period: c.period,
  asOf: c.asOf,
  generatedAt: c.asOf,
  metrics: c.metrics,
  facts: c.facts,
  sources: [],
  coverage: c.coverage,
  sourceFingerprint: c.sourceFingerprint,
  generationMode: 'facts',
  freshness: 'historical_snapshot',
  observations: [
    {
      kind: 'context',
      text: 'Внимание <script>',
      noteIds: [],
      factIds: ['fact:overdue'],
    },
  ],
}
describe('Snapshot export and read-only legacy', () => {
  beforeEach(() => localStorage.clear())
  it('includes attention, timestamp, source IDs and coverage, hides empty blocks', () => {
    const md = formatSummary(r)
    expect(md).toContain('## Требует внимания')
    expect(md).toContain('fact:overdue')
    expect(md).toContain('historical_snapshot')
    expect(md).toContain('## Покрытие')
    expect(md).not.toContain('## Результаты')
    expect(md).not.toContain('<script>')
    expect(summaryFilename(r)).toMatch(/^summary-.*\.md$/)
  })
  it('ignores malformed, anonymous, unscoped and different owner archives', () => {
    const legacy = {
      id: 'a',
      title: 'Archive',
      date: 'Date',
      period: 'За сегодня',
      dateKey: '2026-10-07',
      updatedAtTime: '21:00',
      rawText: 'Text',
      tags: [],
      achievements: [],
      bottlenecks: [],
      recommendations: [],
    }
    localStorage.setItem('voicenotes_ai_summaries', JSON.stringify([legacy]))
    localStorage.setItem(
      'voicenotes_ai_summaries:anonymous',
      JSON.stringify([legacy]),
    )
    setSession({ accessToken: 'a', user: { id: 'a', email: 'a' } })
    expect(getLegacySummaries()).toEqual([])
    localStorage.setItem('voicenotes_ai_summaries:a', '{')
    expect(getLegacySummaries()).toEqual([])
    localStorage.setItem('voicenotes_ai_summaries:a', JSON.stringify([legacy]))
    expect(getLegacySummaries()).toHaveLength(1)
    setSession({ accessToken: 'b', user: { id: 'b', email: 'b' } })
    expect(getLegacySummaries()).toEqual([])
    expect(localStorage.getItem('voicenotes_ai_summaries:a')).toBeTruthy()
  })
})
