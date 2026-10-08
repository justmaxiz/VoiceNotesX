import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Header } from '../Header'
import { useNavigationStore } from '../../../store/navigationStore'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { useCommandPaletteStore } from '../../../store/useCommandPaletteStore'

describe('Header Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({
      searchQuery: '',
      isRecordingModalOpen: false,
    })
    useCommandPaletteStore.setState({ isOpen: false, returnFocusElement: null })
  })

  it('opens the search widget from the header search field', () => {
    render(<Header />)
    const search = screen.getByRole('combobox', { name: 'Поиск заметок и задач' })
    expect(search).toBeInTheDocument()

    fireEvent.focus(search)
    expect(useCommandPaletteStore.getState().isOpen).toBe(true)
    expect(useCommandPaletteStore.getState().returnFocusElement).toBe(search)
    const widget = screen.getByTestId('command-palette-widget')
    expect(widget).toBeInTheDocument()
    expect(widget).toHaveClass('absolute')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders date badge, notifications button, and profile avatar', () => {
    render(<Header />)
    expect(screen.getByTestId('header-date-badge')).toBeInTheDocument()
    expect(screen.getByTestId('header-date-badge')).toHaveTextContent(/Сегодня/i)
    expect(screen.getByLabelText('Уведомления')).toBeInTheDocument()
    expect(screen.getByTestId('header-theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('header-user-avatar')).toBeInTheDocument()

    for (const button of [screen.getByLabelText('Уведомления'), screen.getByTestId('header-theme-toggle')]) {
      expect(button).toHaveClass('p-2')
      expect(button).not.toHaveClass('rounded-xl')
      expect(button.className).not.toMatch(/bg-surface-container/)
    }
  })

  it('toggles theme when clicking theme toggle button', () => {
    useSettingsStore.setState({ theme: 'dark' })
    render(<Header />)
    const themeBtn = screen.getByTestId('header-theme-toggle')
    expect(themeBtn).toBeInTheDocument()
    
    fireEvent.click(themeBtn)
    expect(useSettingsStore.getState().theme).toBe('light')

    fireEvent.click(themeBtn)
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  it('clicking sidebar toggle button updates store state', () => {
    render(<Header />)
    const toggleBtn = screen.getByLabelText('Скрыть боковую панель')
    fireEvent.click(toggleBtn)

    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(true)
  })

  it('opens and focuses the header search on Cmd+K / Ctrl+K', () => {
    render(<Header />)
    expect(screen.queryByTestId('command-palette-widget')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(document.activeElement).toBe(screen.getByRole('combobox'))
    expect(screen.getByTestId('command-palette-widget')).toBeInTheDocument()
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
