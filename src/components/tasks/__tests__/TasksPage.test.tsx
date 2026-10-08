import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { TasksPage } from '../TasksPage'
import { useAppStore } from '../../../store/useAppStore'
import { Item } from '../../../types/item'

describe('TasksPage - Focus Task & Kanban Streamline (TASK-36)', () => {
  const sampleTasks: Item[] = [
    {
      id: 'task-todo-1',
      type: 'task',
      title: 'Задача в бэклоге',
      categoryTag: '#Работа',
      status: 'todo',
      priority: 'medium',
      isFocus: false,
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:00:00Z',
    },
    {
      id: 'task-in-prog',
      type: 'task',
      title: 'Задача в работе',
      categoryTag: '#Разработка',
      status: 'in_progress',
      priority: 'high',
      isFocus: false,
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:00:00Z',
    },
    {
      id: 'task-done',
      type: 'task',
      title: 'Завершенная задача',
      categoryTag: '#Дизайн',
      status: 'completed',
      priority: 'low',
      isFocus: false,
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:00:00Z',
    },
  ]

  beforeEach(async () => {
    const { db, clearDatabase } = await import('../../../lib/db')
    await clearDatabase()
    await db.items.bulkPut(sampleTasks)
    useAppStore.setState({ items: sampleTasks })
  })

  it('renders exactly 3 Kanban columns: К выполнению, В процессе, Выполнено', () => {
    render(<TasksPage />)

    expect(screen.getByTestId('kanban-column-todo')).toBeInTheDocument()
    expect(screen.getByTestId('kanban-column-in_progress')).toBeInTheDocument()
    expect(screen.getByTestId('kanban-column-completed')).toBeInTheDocument()

    // "focus" column MUST NOT exist on the board
    expect(screen.queryByTestId('kanban-column-focus')).toBeNull()
  })

  it('sets focus when target icon is clicked and marks task with badge', async () => {
    render(<TasksPage />)

    const targetBtn = screen.getAllByLabelText('Сделать главной задачей дня')[0]
    expect(targetBtn).toBeInTheDocument()

    fireEvent.click(targetBtn)

    // Task becomes focused with badge
    expect(await screen.findByText('🎯 В фокусе')).toBeInTheDocument()
  })
})
