import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Sidebar } from '../Sidebar'
import { useNavigationStore } from '../../../store/navigationStore'

describe('Sidebar Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeTab: 'overview' })
  })

  it('renders the branding logo and sidebar collapse toggle', () => {
    render(<Sidebar />)
    expect(screen.getByText('VoiceNotes AI')).toBeInTheDocument()
    expect(screen.getByLabelText('Скрыть боковую панель')).toBeInTheDocument()
  })

  it('renders all navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Главная / Обзор')).toBeInTheDocument()
    expect(screen.getByText('Заметки')).toBeInTheDocument()
    expect(screen.getByText('Задачи')).toBeInTheDocument()
    expect(screen.getByText('Календарь')).toBeInTheDocument()
    expect(screen.getByText('AI Сводки')).toBeInTheDocument()
    expect(screen.getByText('Настройки')).toBeInTheDocument()
  })

  it('highlights the active item with aria-current="page"', () => {
    render(<Sidebar />)
    const overviewButton = screen.getByTestId('nav-item-overview')
    expect(overviewButton).toHaveAttribute('aria-current', 'page')
    expect(overviewButton.className).toContain('bg-primary-container')

    const tasksButton = screen.getByTestId('nav-item-tasks')
    expect(tasksButton).not.toHaveAttribute('aria-current')
  })

  it('switches active item when clicked', () => {
    render(<Sidebar />)
    const tasksButton = screen.getByTestId('nav-item-tasks')

    fireEvent.click(tasksButton)

    expect(useNavigationStore.getState().activeTab).toBe('tasks')
  })

  it('renders cloud storage meter and user profile', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-sync-indicator')).toBeInTheDocument()
    expect(screen.getByText('Синхронизировано')).toBeInTheDocument()
    expect(screen.getByText('Облако активно')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('16.4 / 20 ГБ')).toBeInTheDocument()
    expect(screen.getByText('Алексей Орлов')).toBeInTheDocument()
    expect(screen.getByText('Pro Лицензия')).toBeInTheDocument()
  })

  it('clicking collapse button toggles isSidebarCollapsed in store', () => {
    render(<Sidebar />)
    const collapseBtn = screen.getByLabelText('Скрыть боковую панель')
    expect(collapseBtn).toBeInTheDocument()

    fireEvent.click(collapseBtn)
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(true)

    fireEvent.click(collapseBtn)
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(false)
  })
})
