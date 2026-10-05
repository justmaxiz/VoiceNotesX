import React, { useRef, useEffect, useState } from 'react'
import { useNavigationStore } from '../../store/navigationStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { resolveEffectiveTheme } from '../../lib/theme'

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileMenuOpen,
    setMobileMenuOpen,
    setActiveTab,
  } = useNavigationStore()
  const { theme, updateSettings } = useSettingsStore()
  const isDark = resolveEffectiveTheme(theme) === 'dark'

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? 'light' : 'dark' })
  }

  const searchInputRef = useRef<HTMLInputElement>(null)

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Hotkey listener for ⌘K / Ctrl+K search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!isMobileMenuOpen)
    } else {
      toggleSidebar()
    }
  }

  const toggleLabel = isMobile
    ? isMobileMenuOpen
      ? 'Закрыть меню'
      : 'Открыть меню'
    : isSidebarCollapsed
      ? 'Показать боковую панель'
      : 'Скрыть боковую панель'

  // Format today's date in Russian (e.g., "Сегодня, 24 Окт")
  const todayLabel = 'Сегодня, 24 Окт'

  return (
    <header
      role="banner"
      aria-label="Верхняя панель управления"
      className={`fixed top-0 ${
        isSidebarCollapsed ? 'left-0' : 'left-0 md:left-72'
      } right-0 h-16 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/40 shadow-sm z-40 flex items-center justify-between px-space-md md:px-space-xl transition-all duration-200`}
    >
      {/* Left: Sidebar Toggle + Global Search Input */}
      <div className="flex items-center gap-space-sm md:gap-space-md">
        {/* Sidebar Toggle: visible when sidebar is collapsed or on mobile (<md) */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={toggleLabel}
          title={`${toggleLabel} (Ctrl+B)`}
          className={`${
            isSidebarCollapsed ? 'flex' : 'flex md:hidden'
          } w-9 h-9 rounded-xl bg-surface-container/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-high/40 transition-colors cursor-pointer items-center justify-center shrink-0`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isMobile ? (isMobileMenuOpen ? 'close' : 'menu') : isSidebarCollapsed ? 'dock_to_right' : 'menu'}
          </span>
        </button>

        <div
          onClick={() => searchInputRef.current?.focus()}
          className="flex items-center gap-space-sm px-space-md py-space-xs rounded-xl bg-surface-container-lowest text-on-surface-variant border border-surface-container-high/30 focus-within:border-primary/50 transition-colors cursor-text"
        >
          <span className="material-symbols-outlined text-outline text-body-md select-none">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            role="searchbox"
            aria-label="Поиск по заметкам и задачам"
            placeholder="Поиск заметок, аудио, сводок..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="font-body-sm text-body-sm text-on-surface bg-transparent outline-none w-48 sm:w-64 placeholder:text-outline"
          />
          <kbd
            aria-hidden="true"
            tabIndex={-1}
            className="hidden sm:flex items-center gap-0.5 px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm select-none pointer-events-none"
            title="Горячая клавиша ⌘K"
          >
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </div>
      </div>

      {/* Right: Date Badge, Notifications, and Profile Avatar */}
      <div className="flex items-center gap-space-sm sm:gap-space-md">
        <div
          data-testid="header-date-badge"
          className="hidden sm:flex items-center gap-space-xs text-outline font-label-md text-label-md px-2.5 py-1 rounded-xl bg-surface-container/60 border border-surface-container-high/30"
        >
          <span className="material-symbols-outlined text-body-md text-secondary">calendar_month</span>
          <span>{todayLabel}</span>
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          aria-label="Уведомления"
          className="relative p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface" />
        </button>

        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          data-testid="header-theme-toggle"
          aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* User Profile Avatar */}
        <button
          type="button"
          data-testid="header-user-avatar"
          aria-label="Профиль: Алексей Орлов"
          onClick={() => setActiveTab('settings')}
          className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md font-semibold select-none cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shrink-0"
        >
          АО
        </button>
      </div>
    </header>
  )
}
