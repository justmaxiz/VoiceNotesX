import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
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
    useAppStore.setState({ items: testTasks })
  })

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
    expect(screen.getByText('Понедельник, 5 октября 2026')).toBeInTheDocument()
  })
})
