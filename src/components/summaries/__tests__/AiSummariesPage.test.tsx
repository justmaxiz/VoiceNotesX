import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { AiSummariesPage } from '../AiSummariesPage'
import { useAppStore } from '../../../store/useAppStore'

describe('AiSummariesPage - Section Separation & Cooldown (TASK-39)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      items: [
        {
          id: 'test-item-1',
          type: 'task',
          title: 'Завершенный отчет',
          categoryTag: '#Аналитика',
          status: 'completed',
          priority: 'high',
          isFocus: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })
  })

  it('does NOT contain redundant header button "Сгенерировать дайджест дня"', () => {
    render(<AiSummariesPage />)
    expect(
      screen.queryByRole('button', { name: /сгенерировать дайджест дня/i })
    ).toBeNull()
  })

  it('renders Generator section and Archive section clearly separated', () => {
    render(<AiSummariesPage />)
    expect(screen.getByText('Генератор аналитических отчетов')).toBeInTheDocument()
    expect(screen.getByText(/Архив и сохраненные отчеты/)).toBeInTheDocument()
  })

  it('generates a summary and activates 30-second cooldown timer', async () => {
    render(<AiSummariesPage />)

    const genButton = screen.getByRole('button', { name: /сформировать за сегодня|обновить сводку/i })
    fireEvent.click(genButton)

    await waitFor(() => {
      expect(screen.getByText(/Кулдаун: \d+с/)).toBeInTheDocument()
    })
  })
})
