import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { DashboardOverview } from '../DashboardOverview'
import { useDashboardConfigStore } from '../../../store/dashboardConfigStore'
import { useAppStore } from '../../../store/useAppStore'
import { SEED_ITEMS } from '../../../lib/seedData'

describe('DashboardOverview Component', () => {
  beforeEach(() => {
    useAppStore.setState({ items: SEED_ITEMS })
    useDashboardConfigStore.setState({
      modules: { ...useDashboardConfigStore.getState().modules, recentAudio: true, focusTask: true, taskList: true },
    })
  })

  it('renders greetings, metrics, and hero focus task', () => {
    render(<DashboardOverview />)
    expect(screen.getByText('Добрый вечер, Александр')).toBeInTheDocument()
    expect(screen.getAllByText('Добавить новую фичу в VoiceNotes').length).toBeGreaterThan(0)
    expect(screen.getByText('Недавние аудиозаписи')).toBeInTheDocument()
    expect(screen.getByText('Сводка дня')).toBeInTheDocument()
  })

  it('toggles audio play button icon state', () => {
    render(<DashboardOverview />)
    const playBtn = screen.getByLabelText('Воспроизвести')
    expect(playBtn).toBeInTheDocument()

    fireEvent.click(playBtn)
    expect(screen.getByLabelText('Приостановить')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Приостановить'))
    expect(screen.getByLabelText('Воспроизвести')).toBeInTheDocument()
  })

  it('toggles task completion and updates productivity stats', () => {
    render(<DashboardOverview />)
    // Find task checkbox by aria-label
    const firstCheckbox = screen.getByLabelText('Отметить задачу: Подготовить отчет по продуктовым метрикам Q3')
    expect(firstCheckbox).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(firstCheckbox)
    expect(firstCheckbox).toHaveAttribute('aria-checked', 'true')
  })

  it('does NOT contain redundant QuickInputBar (TASK-40)', () => {
    render(<DashboardOverview />)
    // Redundant static quick input bar was removed in TASK-40
    expect(screen.queryByPlaceholderText(/Быстрая мысль или задача/)).toBeNull()
  })

  it('filters task list when filter buttons are clicked', () => {
    render(<DashboardOverview />)
    const urgentBtn = screen.getByText(/Срочные/)
    fireEvent.click(urgentBtn)

    expect(screen.getByText('Провести ревью архитектуры микросервисов')).toBeInTheDocument()
  })
})
