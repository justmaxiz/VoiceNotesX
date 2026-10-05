import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskSortMenu } from '../components/TaskSortMenu'

describe('TaskSortMenu Component (TASK-34)', () => {
  it('renders current sort criteria and opens popover on click', () => {
    const handleSortChange = vi.fn()
    render(
      <TaskSortMenu
        sortBy="priority"
        sortDirection="asc"
        onSortChange={handleSortChange}
      />
    )

    const menuButton = screen.getByRole('button', { name: /сортировка: по приоритету/i })
    expect(menuButton).toBeInTheDocument()

    // Popover is not open initially
    expect(screen.queryByRole('menu')).toBeNull()

    // Click to open popover
    fireEvent.click(menuButton)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('По времени / дедлайну')).toBeInTheDocument()
    expect(screen.getByText('По дате создания')).toBeInTheDocument()
    expect(screen.getByText('По названию')).toBeInTheDocument()
    expect(screen.getByText('Свой порядок')).toBeInTheDocument()
  })

  it('selects new sort criteria from popover', () => {
    const handleSortChange = vi.fn()
    render(
      <TaskSortMenu
        sortBy="priority"
        sortDirection="asc"
        onSortChange={handleSortChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /сортировка: по приоритету/i }))
    fireEvent.click(screen.getByText('По времени / дедлайну'))

    expect(handleSortChange).toHaveBeenCalledWith('time', 'asc')
  })

  it('toggles direction when arrow button is clicked', () => {
    const handleSortChange = vi.fn()
    render(
      <TaskSortMenu
        sortBy="priority"
        sortDirection="asc"
        onSortChange={handleSortChange}
      />
    )

    const dirButton = screen.getByRole('button', { name: /сменить направление/i })
    fireEvent.click(dirButton)

    expect(handleSortChange).toHaveBeenCalledWith('priority', 'desc')
  })
})
