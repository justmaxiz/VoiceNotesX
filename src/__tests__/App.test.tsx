import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from '../App'
import { useNavigationStore } from '../store/navigationStore'

describe('VoiceNotes App - Client Routing Integration', () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeTab: 'overview' })
  })

  it('renders Dashboard Overview on initial load', () => {
    render(<App />)
    expect(screen.getByText('Добрый вечер, Александр')).toBeInTheDocument()
  })

  it('switches to Notes view when clicked in sidebar', () => {
    render(<App />)
    const notesBtn = screen.getByTestId('nav-item-notes')
    fireEvent.click(notesBtn)

    expect(screen.getByTestId('view-notes')).toBeVisible()
    expect(screen.getByText('Хаб заметок')).toBeInTheDocument()
    expect(screen.getAllByText('План редизайна мобильного экрана').length).toBeGreaterThanOrEqual(1)
  })

  it('switches to Tasks Kanban view when clicked in sidebar', () => {
    render(<App />)
    const tasksBtn = screen.getByTestId('nav-item-tasks')
    fireEvent.click(tasksBtn)

    expect(screen.getByText('Канбан-доска задач')).toBeInTheDocument()
    expect(screen.getByText('К выполнению')).toBeInTheDocument()
    expect(screen.getByText('В процессе')).toBeInTheDocument()
  })

  it('switches to Calendar view when clicked in sidebar', () => {
    render(<App />)
    const calBtn = screen.getByTestId('nav-item-calendar')
    fireEvent.click(calBtn)

    expect(screen.getByText('Календарная сетка')).toBeInTheDocument()
  })

  it('switches to AI Summaries view when clicked in sidebar', () => {
    render(<App />)
    const aiBtn = screen.getByTestId('nav-item-ai-summaries')
    fireEvent.click(aiBtn)

    expect(screen.getByText('ИИ Дайджесты')).toBeInTheDocument()
    expect(screen.getByText('Google Gemini Flash Engine')).toBeInTheDocument()
  })

  it('switches to Settings view when clicked in sidebar', () => {
    render(<App />)
    const settingsBtn = screen.getByTestId('nav-item-settings')
    fireEvent.click(settingsBtn)

    expect(screen.getByTestId('view-settings')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Настройки' })).toBeInTheDocument()
    expect(screen.getByText('Подключенные устройства')).toBeInTheDocument()
  })

  it('preserves state when returning to Overview', () => {
    render(<App />)
    expect(screen.getByTestId('view-overview')).toBeVisible()

    // Toggle first task on Overview
    const firstCheckbox = screen.getByLabelText('Отметить задачу: Подготовить отчет по продуктовым метрикам Q3')
    expect(firstCheckbox).not.toBeChecked()
    fireEvent.click(firstCheckbox)
    expect(firstCheckbox).toBeChecked()

    // Enter text into quick input
    const quickInput = screen.getAllByPlaceholderText(/Быстрая мысль или задача/)[0]
    fireEvent.change(quickInput, { target: { value: 'Черновик идеи для релиза' } })
    expect(quickInput).toHaveValue('Черновик идеи для релиза')

    // Go to settings
    fireEvent.click(screen.getByTestId('nav-item-settings'))
    expect(screen.getByTestId('view-settings')).toBeVisible()
    expect(screen.getByTestId('view-overview')).not.toBeVisible()

    // Return to overview
    fireEvent.click(screen.getByTestId('nav-item-overview'))
    expect(screen.getByTestId('view-overview')).toBeVisible()
    expect(screen.getByTestId('view-settings')).not.toBeVisible()

    // Check that state is completely preserved!
    expect(firstCheckbox).toBeChecked()
    expect(quickInput).toHaveValue('Черновик идеи для релиза')
  })
})

