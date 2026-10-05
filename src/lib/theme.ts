export type ThemePreference = 'dark' | 'light' | 'system'

/**
 * Returns current OS color scheme preference.
 */
export const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Resolves the effective ('dark' | 'light') theme given the user's preference.
 */
export const resolveEffectiveTheme = (preference: ThemePreference): 'dark' | 'light' => {
  if (preference === 'system') {
    return getSystemTheme()
  }
  return preference
}

/**
 * Applies the effective theme classes and color-scheme to the DOM documentElement.
 */
export const applyTheme = (preference: ThemePreference): 'dark' | 'light' => {
  if (typeof document === 'undefined') {
    return preference === 'light' ? 'light' : 'dark'
  }

  const effective = resolveEffectiveTheme(preference)
  const root = document.documentElement

  root.classList.remove('dark', 'light')
  root.classList.add(effective)
  root.style.colorScheme = effective

  const metaTheme = document.querySelector('meta[name="color-scheme"]')
  if (metaTheme) {
    metaTheme.setAttribute('content', effective)
  }

  return effective
}
