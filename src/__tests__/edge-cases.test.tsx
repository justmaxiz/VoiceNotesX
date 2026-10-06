import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from '../App'
import { QuickCaptureWidget } from '../components/layout/QuickCaptureWidget'
import { useNavigationStore } from '../store/navigationStore'
import { vi } from 'vitest'

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
    expect(screen.getAllByText(/Алексей/).length).toBeGreaterThan(0)
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
    const onSave = vi.fn()
    render(<QuickCaptureWidget onSave={onSave} />)
    const input = screen.getByPlaceholderText(/Быстрая мысль или задача/)
    const submitBtn = screen.getByLabelText('Сохранить мысль')

    // Submit pure spaces
    fireEvent.change(input, { target: { value: '    ' } })
    fireEvent.click(submitBtn)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not trigger spacebar recording shortcut while typing space inside an input', () => {
    render(<App />)
    const input = screen.getAllByPlaceholderText(/Быстрая мысль или задача/)[0]
    input.focus()

    // Trigger Space keydown while focused on input
    fireEvent.keyDown(input, { code: 'Space' })

    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(false)
  })

  
  it('does not trigger spacebar recording when user is on a different tab', () => {
    useNavigationStore.setState({ activeTab: 'settings' })
    render(<App />)

    fireEvent.keyDown(document.body, { code: 'Space' })
    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(false)
  })

  it('does not trigger spacebar recording when focused on an HTML button', () => {
    render(<App />)
    const button = screen.getByTestId('nav-item-settings')
    button.focus()

    fireEvent.keyDown(button, { code: 'Space' })
    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(false)
  })
})
