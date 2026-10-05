import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Header } from '../Header'
import { useNavigationStore } from '../../../store/navigationStore'

describe('Header Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({
      searchQuery: '',
      isRecordingModalOpen: false,
    })
  })

  it('renders search input and updates query in store', () => {
    render(<Header />)
    const input = screen.getByRole('searchbox')
    expect(input).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'новые мысли' } })
    expect(useNavigationStore.getState().searchQuery).toBe('новые мысли')
  })

  it('renders date badge, notifications button, and profile avatar', () => {
    render(<Header />)
    expect(screen.getByTestId('header-date-badge')).toBeInTheDocument()
    expect(screen.getByText('Сегодня, 24 Окт')).toBeInTheDocument()
    expect(screen.getByLabelText('Уведомления')).toBeInTheDocument()
    expect(screen.getByTestId('header-user-avatar')).toBeInTheDocument()
  })

  it('clicking sidebar toggle button updates store state', () => {
    render(<Header />)
    const toggleBtn = screen.getByLabelText('Скрыть боковую панель')
    fireEvent.click(toggleBtn)

    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(true)
  })

  it('focuses search input on Cmd+K / Ctrl+K shortcut', () => {
    render(<Header />)
    const input = screen.getByRole('searchbox')
    expect(document.activeElement).not.toBe(input)

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(document.activeElement).toBe(input)
  })

  it('navigates to settings when clicking user profile avatar', () => {
    render(<Header />)
    const avatar = screen.getByTestId('header-user-avatar')
    fireEvent.click(avatar)

    expect(useNavigationStore.getState().activeTab).toBe('settings')
  })

  it('toggles mobile menu on mobile viewport (< 768px)', () => {
    // Mock mobile viewport
    window.innerWidth = 500
    render(<Header />)

    const menuBtn = screen.getByLabelText('Открыть меню')
    fireEvent.click(menuBtn)

    expect(useNavigationStore.getState().isMobileMenuOpen).toBe(true)

    // Reset window width
    window.innerWidth = 1024
  })
})

