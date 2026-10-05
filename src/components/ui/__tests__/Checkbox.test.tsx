import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from '../Checkbox'

describe('Checkbox Component (TASK-41)', () => {
  it('renders unchecked and toggles checked on click', () => {
    const handleChange = vi.fn()
    render(<Checkbox checked={false} onChange={handleChange} ariaLabel="Задача 1" />)

    const checkbox = screen.getByRole('checkbox', { name: 'Задача 1' })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(checkbox)
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('renders checked with label and toggles with keyboard', () => {
    const handleChange = vi.fn()
    render(
      <Checkbox
        checked={true}
        onChange={handleChange}
        label="Завершить задачу"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Завершить задачу')).toBeInTheDocument()

    fireEvent.keyDown(checkbox, { key: ' ' })
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('respects disabled state', () => {
    const handleChange = vi.fn()
    render(<Checkbox checked={false} onChange={handleChange} disabled />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(handleChange).not.toHaveBeenCalled()
  })
})
