import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AppLayout } from '../AppLayout'
import { useNavigationStore } from '../../../store/navigationStore'

describe('AppLayout Shell Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeTab: 'overview', isRecordingModalOpen: false })
    window.location.hash = ''
  })

  it('renders children within main container with shell margins', () => {
    render(
      <AppLayout>
        <div data-testid="test-content">Контент рабочей области</div>
      </AppLayout>
    )

    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main.className).toContain('pl-72')
    expect(main.className).toContain('pt-16')
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('responds to window hashchange events', () => {
    render(
      <AppLayout>
        <div>Контент</div>
      </AppLayout>
    )

    act(() => {
      window.location.hash = '#settings'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(useNavigationStore.getState().activeTab).toBe('settings')
  })

  it('normalizes #notes route and #notes-and-audio backwards alias to notes', () => {
    render(
      <AppLayout>
        <div>Контент</div>
      </AppLayout>
    )

    act(() => {
      window.location.hash = '#notes'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(useNavigationStore.getState().activeTab).toBe('notes')

    act(() => {
      window.location.hash = '#notes-and-audio'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(useNavigationStore.getState().activeTab).toBe('notes')
  })

  it('renders global QuickCaptureWidget floating widget', () => {
    render(
      <AppLayout>
        <div>Контент</div>
      </AppLayout>
    )

    expect(screen.getByLabelText('Быстрый ввод мыслей и задач')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Мысль или задача/)).toBeInTheDocument()
  })


  it('toggles sidebar collapse state on Ctrl+B shortcut and updates main padding', () => {
    render(
      <AppLayout>
        <div>Контент</div>
      </AppLayout>
    )

    const main = screen.getByRole('main')
    expect(main.className).toContain('pl-72')
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(false)

    // Trigger Ctrl+B
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(true)
    expect(main.className).toContain('pl-0')
    expect(main.className).not.toContain('pl-72')

    // Trigger Ctrl+B again to expand
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(false)
    expect(main.className).toContain('pl-72')
  })

  it('does not toggle sidebar when Ctrl+B is pressed inside an input or textarea', () => {
    render(
      <AppLayout>
        <input data-testid="test-input" />
      </AppLayout>
    )

    const input = screen.getByTestId('test-input')
    input.focus()

    fireEvent.keyDown(input, { key: 'b', ctrlKey: true })
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(false)
  })

  it('dispatches voicenotes:quick-capture custom event after successful quick capture persistence', async () => {
    const listener = vi.fn()
    window.addEventListener('voicenotes:quick-capture', listener)

    render(
      <AppLayout>
        <div>Контент</div>
      </AppLayout>
    )

    const input = screen.getByPlaceholderText(/Мысль или задача/)
    fireEvent.change(input, { target: { value: 'Тестовая мысль' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(listener).toHaveBeenCalled())
    window.removeEventListener('voicenotes:quick-capture', listener)
  })
})
