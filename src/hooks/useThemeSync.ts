import { useEffect } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { applyTheme } from '../lib/theme'

/**
 * Hook that keeps the DOM (documentElement class and color-scheme)
 * synchronized with the user's theme setting and OS preferences.
 */
export const useThemeSync = () => {
  const theme = useSettingsStore((state) => state.theme)

  useEffect(() => {
    applyTheme(theme)

    if (theme === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        applyTheme('system')
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [theme])
}
