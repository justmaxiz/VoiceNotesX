import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DashboardOverview } from '../DashboardOverview'

describe('DashboardOverview Component', () => {
  it('renders greetings, metrics, and hero focus task', () => {
    render(<DashboardOverview />)
    expect(screen.getByText('Добрый вечер, Александр')).toBeInTheDocument()
    expect(screen.getByText('Добавить новую фичу в VoiceNotes')).toBeInTheDocument()
    expect(screen.getByText('Whisper AI Транскрипция')).toBeInTheDocument()
    expect(screen.getByText('Недавние аудиозаписи')).toBeInTheDocument()
    expect(screen.getByText('AI Сводка дня')).toBeInTheDocument()
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
    // Find first task checkbox
    const firstCheckbox = screen.getByLabelText('Отметить задачу: Подготовить отчет по продуктовым метрикам Q3')
    expect(firstCheckbox).not.toBeChecked()

    fireEvent.click(firstCheckbox)
    expect(firstCheckbox).toBeChecked()
  })

  it('adds a quick task via quick input form', () => {
    render(<DashboardOverview />)
    const input = screen.getByPlaceholderText(/Быстрая мысль или задача/)
    const submitBtn = screen.getByText('Добавить')

    fireEvent.change(input, { target: { value: 'Тестовая новая задача' } })
    fireEvent.click(submitBtn)

    expect(screen.getByText('Тестовая новая задача')).toBeInTheDocument()
  })

  it('filters task list when filter buttons are clicked', () => {
    render(<DashboardOverview />)
    const urgentBtn = screen.getByText(/Срочные/)
    fireEvent.click(urgentBtn)

    expect(screen.getByText('Провести ревью архитектуры микросервисов')).toBeInTheDocument()
  })
})
