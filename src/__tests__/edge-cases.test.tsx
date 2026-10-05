import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from '../App'
import { DashboardOverview } from '../components/dashboard/DashboardOverview'
import { useNavigationStore } from '../store/navigationStore'

describe('Edge Cases and Boundary Values', () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeTab: 'overview', searchQuery: '', isRecordingModalOpen: false })
  })

  it('gracefully handles unknown hash route by defaulting to overview', () => {
    render(<App />)

    act(() => {
      window.location.hash = '#unknown-tab-slug-123'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    // Should still display Overview safely without crash
    expect(screen.getByText('Добрый вечер, Александр')).toBeInTheDocument()
    expect(screen.getByTestId('view-overview')).toBeVisible()
  })

  it('gracefully handles #notes hash route by routing to notes', () => {
    render(<App />)

    act(() => {
      window.location.hash = '#notes'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(useNavigationStore.getState().activeTab).toBe('notes')
    expect(screen.getByTestId('view-notes')).toBeVisible()
    expect(screen.getByTestId('view-overview')).not.toBeVisible()
  })

  it('rejects empty or whitespace-only submissions in quick input', () => {
    render(<DashboardOverview />)
    const input = screen.getByPlaceholderText(/Быстрая мысль или задача/)
    const submitBtn = screen.getByText('Добавить')

    const initialTasksCount = screen.getAllByRole('checkbox').length

    // Submit pure spaces
    fireEvent.change(input, { target: { value: '    ' } })
    fireEvent.click(submitBtn)

    const afterCount = screen.getAllByRole('checkbox').length
    expect(afterCount).toBe(initialTasksCount)
  })

  it('does not trigger spacebar recording shortcut while typing space inside an input', () => {
    render(<DashboardOverview />)
    const input = screen.getByPlaceholderText(/Быстрая мысль или задача/)
    input.focus()

    // Trigger Space keydown while focused on input
    fireEvent.keyDown(input, { code: 'Space' })

    const recordBtn = screen.getByText('Начать запись')
    expect(recordBtn).toBeInTheDocument()
    expect(screen.queryByText('Идет запись...')).not.toBeInTheDocument()
  })

  it('triggers spacebar recording feedback when Space is pressed outside inputs', () => {
    render(<DashboardOverview />)

    // Trigger Space keydown on document body
    fireEvent.keyDown(document.body, { code: 'Space' })

    expect(screen.getByText('Идет запись...')).toBeInTheDocument()

    // Key up releases recording state
    fireEvent.keyUp(document.body, { code: 'Space' })
    expect(screen.getByText('Начать запись')).toBeInTheDocument()
  })

  it('does not trigger spacebar recording when user is on a different tab', () => {
    useNavigationStore.setState({ activeTab: 'settings' })
    render(<DashboardOverview />)

    fireEvent.keyDown(document.body, { code: 'Space' })
    expect(screen.queryByText('Идет запись...')).not.toBeInTheDocument()
  })

  it('does not trigger spacebar recording when focused on an HTML button', () => {
    render(<DashboardOverview />)
    const newNoteBtn = screen.getByRole('button', { name: /Новая заметка/ })
    newNoteBtn.focus()

    fireEvent.keyDown(newNoteBtn, { code: 'Space' })
    expect(screen.queryByText('Идет запись...')).not.toBeInTheDocument()
  })
})
