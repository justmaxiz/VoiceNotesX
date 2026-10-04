import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { AppLayout } from '../AppLayout'
import { useNavigationStore } from '../../../store/navigationStore'

describe('AppLayout Shell Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeTab: 'overview' })
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
})
