import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Sidebar } from '../Sidebar'
import { Header } from '../Header'
import { useNavigationStore } from '../../../store/navigationStore'
import { useAppStore } from '../../../store/useAppStore'
import type { Item } from '../../../types/item'
import { getSession } from '../../../lib/api'

describe('Sidebar Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeTab: 'overview' })
    useAppStore.getState().setItems([])
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
    expect(screen.getByText('Профиль')).toBeInTheDocument()
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
    expect(screen.getByText(getSession()!.user.email)).toBeInTheDocument()
    expect(screen.queryByText('Алексей Орлов')).not.toBeInTheDocument()
    expect(screen.queryByText('Pro Лицензия')).not.toBeInTheDocument()
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

  it('shows zero for an empty account and updates counts from its non-archived records', () => {
    render(<Sidebar />)
    const notes = screen.getByTestId('nav-item-notes')
    const tasks = screen.getByTestId('nav-item-tasks')
    expect(within(notes).getByText('0')).toBeInTheDocument()
    expect(within(tasks).getByText('0')).toBeInTheDocument()
    const item: Item = {
      id: 'note', type: 'note', title: 'Запись', categoryTag: '#Тест',
      status: 'todo', priority: 'medium', isFocus: false,
      createdAt: '2026-10-07T12:00:00Z', updatedAt: '2026-10-07T12:00:00Z',
    }
    act(() => useAppStore.getState().setItems([
      item,
      { ...item, id: 'task', type: 'task' },
      { ...item, id: 'completed-task', type: 'task', status: 'completed' },
      { ...item, id: 'archived-note', status: 'archived' },
      { ...item, id: 'archived-task', type: 'task', status: 'archived' },
    ]))
    expect(within(notes).getByText('1')).toBeInTheDocument()
    expect(within(tasks).getByText('2')).toBeInTheDocument()
    act(() => useAppStore.getState().setItems([]))
    expect(within(notes).getByText('0')).toBeInTheDocument()
    expect(within(tasks).getByText('0')).toBeInTheDocument()
  })
})
