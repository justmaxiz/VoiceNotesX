import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { SettingsPage } from '../SettingsPage'
import { useSettingsStore } from '../../../store/useSettingsStore'

describe('SettingsPage Theme Settings', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'dark' })
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
