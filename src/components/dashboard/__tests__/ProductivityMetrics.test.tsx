import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductivityMetrics } from '../components/ProductivityMetrics'

describe('ProductivityMetrics - Metrics & Terminology Cleanup (TASK-35)', () => {
  it('does NOT contain the sprint badge "Активный спринт"', () => {
    render(<ProductivityMetrics totalCount={5} completedCount={2} plannedCount={3} />)
    expect(screen.queryByText(/активный спринт/i)).toBeNull()
  })

  it('displays remaining count properly: "Осталось 3 из 5 задач на сегодня"', () => {
    render(<ProductivityMetrics totalCount={5} completedCount={2} plannedCount={3} />)
    expect(screen.getByText('Осталось 3 из 5 задач на сегодня')).toBeInTheDocument()
    expect(screen.getByText('В процессе')).toBeInTheDocument()
  })

  it('displays "День закрыт 🎉" and motivational banner when all tasks are completed', () => {
    render(<ProductivityMetrics totalCount={4} completedCount={4} plannedCount={0} />)
    expect(screen.getByText('День закрыт 🎉')).toBeInTheDocument()
    expect(screen.getByText(/все задачи закрыты!/i)).toBeInTheDocument()
    expect(
      screen.getByText('Все задачи дня закрыты! Время отдохнуть.')
    ).toBeInTheDocument()
  })

  it('handles empty state when totalCount is 0', () => {
    render(<ProductivityMetrics totalCount={0} completedCount={0} plannedCount={0} />)
    expect(screen.getByText('Нет задач на сегодня')).toBeInTheDocument()
    expect(screen.queryByTestId('metrics-all-done-banner')).toBeNull()
  })

  it('does NOT render the "В плане" card', () => {
    render(<ProductivityMetrics totalCount={5} completedCount={2} plannedCount={3} />)
    expect(screen.queryByTestId('metrics-planned-card')).toBeNull()
    expect(screen.queryByText(/^в плане$/i)).toBeNull()
  })
})
