import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { SettingsPage } from '../SettingsPage'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { Sidebar } from '../../layout/Sidebar'
import { Header } from '../../layout/Header'
import { setSession } from '../../../lib/api'
import { useNavigationStore } from '../../../store/navigationStore'

describe('SettingsPage Theme Settings', () => {
  beforeEach(() => {
    localStorage.removeItem('voicenotes_profile:test-user')
    useNavigationStore.setState({ isSidebarCollapsed: false, isMobileMenuOpen: false })
    useSettingsStore.setState({ theme: 'dark' })
  })

  it('saves a customized name across settings, sidebar and header and restores it after remount', () => {
    const view = render(<><Sidebar /><Header /><SettingsPage /></>)
    fireEvent.change(screen.getByLabelText('Отображаемое имя'), { target: { value: '  Мария Иванова  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить профиль' }))
    expect(within(screen.getByLabelText('Боковая панель навигации')).getByText('Мария Иванова')).toBeInTheDocument()
    expect(screen.getByTestId('header-user-avatar')).toHaveAttribute('aria-label', 'Профиль: Мария Иванова')
    expect(screen.getByTestId('header-user-avatar')).toHaveTextContent('МИ')
    view.unmount()
    render(<SettingsPage />)
    expect(screen.getByLabelText('Отображаемое имя')).toHaveValue('Мария Иванова')
    act(() => setSession({ accessToken: 'other', user: { id: 'other-user', email: 'other@example.invalid' } }))
    expect(screen.getByLabelText('Отображаемое имя')).toHaveValue('other')
    act(() => setSession({ accessToken: 'test', user: { id: 'test-user', email: 'test@example.invalid' } }))
    expect(screen.getByLabelText('Отображаемое имя')).toHaveValue('Мария Иванова')
  })

  it('rejects unsupported avatar files and cancels unsaved profile changes', () => {
    render(<SettingsPage />)
    fireEvent.change(screen.getByLabelText('Фотография профиля'), {
      target: { files: [new File(['<svg/>'], 'avatar.svg', { type: 'image/svg+xml' })] },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('PNG, JPEG или WebP')
    fireEvent.change(screen.getByLabelText('Отображаемое имя'), { target: { value: 'Черновик' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отменить' }))
    expect(screen.getByLabelText('Отображаемое имя')).toHaveValue('test')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('saves and removes a profile photo in both settings and navigation', async () => {
    render(<><Sidebar /><Header /><SettingsPage /></>)
    fireEvent.change(screen.getByLabelText('Фотография профиля'), {
      target: { files: [new File(['image'], 'avatar.png', { type: 'image/png' })] },
    })
    const save = screen.getByRole('button', { name: 'Сохранить профиль' })
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.click(save)
    expect(screen.getByTestId('header-user-avatar').querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,aW1hZ2U=')
    expect(screen.getByLabelText('Боковая панель навигации').querySelector('img')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить фото' }))
    fireEvent.click(save)
    expect(screen.getByTestId('header-user-avatar').querySelector('img')).toBeNull()
    expect(screen.getByLabelText('Боковая панель навигации').querySelector('img')).toBeNull()
  })

  it('renders all three theme buttons: dark, light, and system', () => {
    render(<SettingsPage />)
    expect(screen.getByTestId('theme-btn-dark')).toBeInTheDocument()
    expect(screen.getByTestId('theme-btn-light')).toBeInTheDocument()
    expect(screen.getByTestId('theme-btn-system')).toBeInTheDocument()
  })

  it('updates store theme when light theme button is clicked', () => {
    render(<SettingsPage />)
    const lightBtn = screen.getByTestId('theme-btn-light')
    fireEvent.click(lightBtn)
    expect(useSettingsStore.getState().theme).toBe('light')
  })

  it('updates store theme when system theme button is clicked', () => {
    render(<SettingsPage />)
    const systemBtn = screen.getByTestId('theme-btn-system')
    fireEvent.click(systemBtn)
    expect(useSettingsStore.getState().theme).toBe('system')
  })

  it('updates store theme when dark theme button is clicked', () => {
    useSettingsStore.setState({ theme: 'light' })
    render(<SettingsPage />)
    const darkBtn = screen.getByTestId('theme-btn-dark')
    fireEvent.click(darkBtn)
    expect(useSettingsStore.getState().theme).toBe('dark')
  })
})
