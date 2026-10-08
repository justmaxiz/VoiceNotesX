import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AiSummariesPage } from '../AiSummariesPage'
import { useSummaryStore } from '../../../store/useSummaryStore'
import { summaryRepository } from '../../../lib/summaryRepository'
import { useAppStore } from '../../../store/useAppStore'

describe('Server summaries', () => {
  beforeEach(() => {
    localStorage.clear()
    useSummaryStore.setState({ entries: {} })
  })
  it('reads facts without generation; contains real period and filter controls', async () => {
    const generate = vi.spyOn(summaryRepository, 'generate')
    render(<AiSummariesPage />)
    await screen.findByText(
      'В периоде нет записей и текущих сроков для внимания.',
    )
    expect(generate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Период')).toHaveValue('day')
    expect(screen.getByLabelText('Тег')).toHaveValue('')
    expect(screen.getByLabelText('Категория')).toHaveValue('')
    expect(screen.getByText('Архив и сохранённые отчёты')).toBeInTheDocument()
  })
  it('generates on click, uses shared snapshot and no browser cooldown', async () => {
    render(<AiSummariesPage />)
    await screen.findByText(
      'В периоде нет записей и текущих сроков для внимания.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать сводку' }))
    await screen.findByRole('button', { name: 'Копировать' })
    expect(
      Object.values(useSummaryStore.getState().entries).some(
        (e) => e.report?.generationMode === 'empty',
      ),
    ).toBe(true)
    expect(screen.queryByText(/Кулдаун/)).not.toBeInTheDocument()
  })
  it('preserves facts and successful report on failed refresh', async () => {
    render(<AiSummariesPage />)
    await screen.findByText(
      'В периоде нет записей и текущих сроков для внимания.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать сводку' }))
    await screen.findByRole('button', { name: 'Копировать' })
    vi.spyOn(summaryRepository, 'generate').mockRejectedValueOnce(
      new Error('Лимит сводок: повторите через час.'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Обновить сводку' }))
    await screen.findByText('Лимит сводок: повторите через час.')
    expect(
      screen.getByRole('button', { name: 'Копировать' }),
    ).toBeInTheDocument()
  })
  it('rejects clipboard failure without a false success message', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    render(<AiSummariesPage />)
    await screen.findByText(
      'В периоде нет записей и текущих сроков для внимания.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать сводку' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Копировать' }))
    await screen.findByText(
      'Не удалось скопировать. Используйте экспорт в Markdown.',
    )
    expect(
      screen.queryByRole('button', { name: 'Скопировано' }),
    ).not.toBeInTheDocument()
  })
  it('range and independent tag filters select a different server key', async () => {
    const read = vi.spyOn(summaryRepository, 'facts')
    render(<AiSummariesPage />)
    fireEvent.change(screen.getByLabelText('Период'), {
      target: { value: 'custom' },
    })
    fireEvent.change(screen.getByLabelText('Начало'), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText('Последний день'), {
      target: { value: '2026-10-07' },
    })
    await waitFor(() =>
      expect(read).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-10-01',
          endDateExclusive: '2026-10-08',
        }),
        expect.any(AbortSignal),
      ),
    )
  })
  it('restores explicit day, week and tag generation actions', async () => {
    useAppStore.setState({
      items: [
        {
          id: 'tagged',
          type: 'note',
          title: 'Тест',
          status: 'todo',
          priority: 'medium',
          categoryTag: '#Проект',
          tags: ['#Дизайн'],
          isFocus: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })
    const generate = vi.spyOn(summaryRepository, 'generate')
    render(<AiSummariesPage />)
    expect(
      screen.getByRole('button', { name: 'Сформировать за день' }),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Сформировать за неделю' }),
    )
    await screen.findByRole('button', { name: 'Копировать' })
    expect(generate.mock.calls[0][0].tags).toEqual([])
    expect(screen.getByLabelText('Период')).toHaveValue('rolling7')
    fireEvent.change(screen.getByLabelText('Тег для отчёта'), {
      target: { value: 'дизайн' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Сформировать по тегу' }),
    )
    await waitFor(() =>
      expect(generate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['дизайн'] }),
        expect.any(AbortSignal),
      ),
    )
  })
})
