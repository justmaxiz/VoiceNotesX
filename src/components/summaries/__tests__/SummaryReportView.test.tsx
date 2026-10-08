import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SummaryReportView } from '../SummaryReportView'
import {
  buildSummaryContext,
  factualSummary,
} from '../../../../server/src/summaryFacts'
import {
  presetPeriod,
  type SummaryReport,
} from '../../../../server/src/summaryContracts'
import type { Note } from '../../../../server/src/contracts'
import { useAppStore } from '../../../store/useAppStore'
import { useDrawerStore } from '../../../store/useDrawerStore'
import { api } from '../../../lib/api'
vi.mock('../../../lib/api', () => ({ api: vi.fn() }))
const now = new Date('2026-10-08T07:00:00Z')
const note = (
  id: string,
  title: string,
  startDate: string,
  deadline: string,
): Note => ({
  id,
  title,
  startDate,
  deadline,
  status: 'todo',
  priority: 'medium',
  categoryTag: '',
  isFocus: false,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
})
function fixture() {
  const notes = [
    note(
      'later',
      'Поздняя встреча',
      '2026-10-08T11:00:00Z',
      '2026-10-08T12:00:00Z',
    ),
    note(
      'first',
      'Первая встреча',
      '2026-10-08T10:00:00Z',
      '2026-10-08T11:30:00Z',
    ),
    note('tomorrow', 'Завтра', '2026-10-09T10:00:00Z', '2026-10-09T11:00:00Z'),
  ]
  const c = buildSummaryContext(
    notes,
    presetPeriod('day', 'Europe/Saratov', now),
    now,
  )
  const report: SummaryReport = {
    ...factualSummary(c),
    ...c,
    id: 'r',
    slotKey: 'r',
    version: 1,
    generatedAt: c.asOf,
    generationMode: 'ai',
    freshness: 'current',
    themes: [{ text: 'Первая встреча', noteIds: ['first'], factIds: [] }],
    suggestions: [
      {
        text: 'Можно уточнить следующий шаг: Первая встреча',
        noteIds: ['first'],
        factIds: [],
      },
    ],
  }
  return { report, notes }
}
describe('Actionable summary', () => {
  it('shows conflicts from facts even if AI omitted them, with saved times and independently scoped upcoming deadlines', () => {
    const { report } = fixture()
    render(<SummaryReportView report={report} />)
    expect(
      screen.getByText('Пересечений в расписании периода: 1'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Сроков в ближайшие 7 дней: 3. Просроченных записей нет.',
      ),
    ).toBeInTheDocument()
    const upcoming = screen.getByRole('heading', {
      name: 'Ближайшие сроки',
    }).parentElement!
    const buttons = [...upcoming.querySelectorAll('button')]
    expect(buttons.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Первая встреча'),
      expect.stringContaining('Поздняя встреча'),
      expect.stringContaining('Завтра'),
    ])
    expect(buttons[0].textContent).toContain('14:00')
    expect(buttons[0].textContent).toContain('15:30')
    expect(screen.queryByText(/Можно уточнить/)).not.toBeInTheDocument()
    expect(screen.queryByText('Серверный факт')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '8 октября 2026 г.' }),
    ).toBeInTheDocument()
  })
  it('keeps historical dates from the report, and explains missing dates in older reports', () => {
    const { report, notes } = fixture()
    useAppStore.setState({
      items: [{ ...notes[1], type: 'task', deadline: '2027-01-01T10:00:00Z' }],
    })
    report.freshness = 'historical_snapshot'
    delete report.sources.find((s) => s.id === 'tomorrow')!.schedule
    render(<SummaryReportView report={report} />)
    expect(screen.queryByText(/2027/)).not.toBeInTheDocument()
    expect(
      screen.getByText('Дата не сохранена в этой сводке'),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/15:30/).length).toBeGreaterThan(0)
  })
  it('opens the current record for editing from a deadline row', async () => {
    const { report, notes } = fixture()
    vi.mocked(api).mockResolvedValueOnce({ note: notes[1] })
    render(<SummaryReportView report={report} compact />)
    fireEvent.click(screen.getByRole('button', { name: /Первая встреча/ }))
    await vi.waitFor(() =>
      expect(useDrawerStore.getState().selectedItemId).toBe('first'),
    )
    expect(api).toHaveBeenCalledWith('/notes/first')
  })
})
