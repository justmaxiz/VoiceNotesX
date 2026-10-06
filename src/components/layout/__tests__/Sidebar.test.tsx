import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Sidebar } from '../Sidebar'
import { Header } from '../Header'
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
    expect(screen.getByText('Сводки')).toBeInTheDocument()
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

  it('shows local storage status and profile without fake cloud meter', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-sync-indicator')).toBeInTheDocument()
    expect(screen.getByText('Сохранение в этом браузере')).toBeInTheDocument()
    expect(screen.queryByText('Облако активно')).not.toBeInTheDocument()
    expect(screen.queryByText('82%')).not.toBeInTheDocument()
    expect(screen.queryByText('16.4 / 20 ГБ')).not.toBeInTheDocument()
    expect(screen.getByText('Алексей Орлов')).toBeInTheDocument()
    expect(screen.getByText('Pro Лицензия')).toBeInTheDocument()
  })

  it('collapses from the sidebar and expands from the header control', () => {
    render(<><Sidebar /><Header /></>)
    const sidebar = screen.getByLabelText('Боковая панель навигации')
    const collapseBtn = within(sidebar).getByLabelText('Скрыть боковую панель')
    expect(collapseBtn).toBeInTheDocument()

    fireEvent.click(collapseBtn)
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(true)

    fireEvent.click(within(screen.getByRole('banner')).getByLabelText('Показать боковую панель'))
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(false)
  })
})
