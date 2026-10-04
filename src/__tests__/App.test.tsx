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

  it('switches to Notes & Audio view when clicked in sidebar', () => {
    render(<App />)
    const notesBtn = screen.getByTestId('nav-item-notes-and-audio')
    fireEvent.click(notesBtn)

    expect(screen.getByText('Библиотека записей')).toBeInTheDocument()
    expect(screen.getByText('План редизайна мобильного экрана')).toBeInTheDocument()
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

    expect(screen.getByText('Настройки и Профиль')).toBeInTheDocument()
    expect(screen.getByText('Google AI Studio API Key (BYOK)')).toBeInTheDocument()
  })

  it('preserves state when returning to Overview', () => {
    render(<App />)
    // Go to settings
    fireEvent.click(screen.getByTestId('nav-item-settings'))
    expect(screen.getByText('Настройки и Профиль')).toBeInTheDocument()

    // Return to overview
    fireEvent.click(screen.getByTestId('nav-item-overview'))
    expect(screen.getByText('Добрый вечер, Александр')).toBeInTheDocument()
  })
})
