import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CalendarPage } from '../CalendarPage'
import { useAppStore } from '../../../store/useAppStore'
import { Item } from '../../../types/item'

describe('CalendarPage - Real Due Dates & Backlog (TASK-38)', () => {
  const testTasks: Item[] = [
    {
      id: 'task-oct-18',
      type: 'task',
      title: 'Задача строго на 18 октября',
      categoryTag: '#Разработка',
      dueDate: '2026-10-18',
      dueTime: '15:00',
      status: 'todo',
      priority: 'high',
      isFocus: false,
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:00:00Z',
    },
    {
      id: 'task-unscheduled',
      type: 'task',
      title: 'Задача без даты дедлайна',
      categoryTag: '#Бэклог',
      dueDate: undefined,
      status: 'todo',
      priority: 'low',
      isFocus: false,
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 5, 12))
    useAppStore.setState({ items: testTasks })
  })

  afterEach(() => vi.useRealTimers())

  it('renders task on Oct 18 strictly once, and eliminates the 4-day modulo bug', () => {
    render(<CalendarPage />)

    // Task must appear exactly once in the document (on 18th cell only)
    const matches = screen.getAllByText('Задача строго на 18 октября')
    expect(matches).toHaveLength(1)

    // Days 1, 5, 9, 13, 17 must NOT contain this task!
    expect(matches[0].closest('div')).toBeInTheDocument()
  })

  it('displays unscheduled tasks in backlog sidebar', () => {
    render(<CalendarPage />)

    expect(screen.getByText(/Бэклог без даты/i)).toBeInTheDocument()
    expect(screen.getByText('Задача без даты дедлайна')).toBeInTheDocument()
  })

  it('switches between Month, Week, and Day view modes', () => {
    render(<CalendarPage />)

    // Switch to Week
    fireEvent.click(screen.getByRole('button', { name: 'Неделя' }))
    expect(screen.getByText('Время')).toBeInTheDocument()

    // Switch to Day
    fireEvent.click(screen.getByRole('button', { name: 'День' }))
    const calendarHeader = screen.getByText('Календарная сетка').parentElement!
    expect(within(calendarHeader).getByText(/понедельник, 5 октября 2026/i)).toBeInTheDocument()
  })

  it('shows the full 00:00–23:59 time range in week and day views', () => {
    render(<CalendarPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Неделя' }))
    expect(screen.getByRole('button', { name: 'Создать задачу 2026-10-05 0:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать задачу 2026-10-05 23:00' })).toBeInTheDocument()
    expect(screen.getByText('23:59')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'День' }))
    expect(screen.getByRole('button', { name: 'Создать задачу 2026-10-05 0:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать задачу 2026-10-05 23:00' })).toBeInTheDocument()
  })
})
