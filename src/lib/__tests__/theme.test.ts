import { describe, it, expect, beforeEach, vi } from 'vitest'
import { applyTheme, getSystemTheme, resolveEffectiveTheme } from '../theme'
import { useSettingsStore } from '../../store/useSettingsStore'

describe('Theme Logic & Application', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    document.documentElement.style.colorScheme = ''
    useSettingsStore.setState({ theme: 'dark' })
  })

  it('correctly resolves explicit dark and light preferences', () => {
    expect(resolveEffectiveTheme('dark')).toBe('dark')
    expect(resolveEffectiveTheme('light')).toBe('light')
  })

  it('resolves system theme based on matchMedia', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    expect(getSystemTheme()).toBe('dark')
    expect(resolveEffectiveTheme('system')).toBe('dark')

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    expect(getSystemTheme()).toBe('light')
    expect(resolveEffectiveTheme('system')).toBe('light')
  })

  it('applyTheme updates documentElement classes and colorScheme', () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')

    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
