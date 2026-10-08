import React, { useRef, useEffect, useState } from 'react'
import { useNavigationStore } from '../../store/navigationStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useProfile } from '../../hooks/useProfile'
import { useCommandPaletteStore } from '../../store/useCommandPaletteStore'
import { resolveEffectiveTheme } from '../../lib/theme'
import { CommandPaletteModal } from '../ui/CommandPaletteModal'

export function getHeaderFormattedDate(): string {
  try {
    const now = new Date()
    const formatted = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
    }).format(now)
    const cleaned = formatted.replace('.', '')
    const parts = cleaned.split(' ')
    const day = parts[0]
    const month = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : ''
    return `Сегодня, ${day} ${month}`.trim()
  } catch {
    return 'Сегодня'
  }
}

export interface HeaderProps {
  dateLabel?: string
}

export const Header: React.FC<HeaderProps> = ({ dateLabel }) => {
  const profile = useProfile()
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileMenuOpen,
    setMobileMenuOpen,
    setActiveTab,
  } = useNavigationStore()
  const { isOpen, query, setQuery, openPalette } = useCommandPaletteStore()
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

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (isOpen) {
          useCommandPaletteStore.getState().closePalette()
        } else {
          openPalette(searchInputRef.current)
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [isOpen, openPalette])

  useEffect(() => {
    if (isOpen && document.activeElement !== searchInputRef.current) {
      searchInputRef.current?.focus()
    }
  }, [isOpen])

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

  // Dynamic formatted date in Russian (e.g. "Сегодня, 5 Окт")
  const todayLabel = dateLabel || getHeaderFormattedDate()

  return (
    <header
      role="banner"
      aria-label="Верхняя панель управления"
      className={`fixed top-0 ${
        isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-72'
      } right-0 h-16 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/40 shadow-sm z-40 flex items-center justify-between px-space-md md:px-space-xl transition-all duration-200`}
    >
      {/* Left: Sidebar Toggle + Global Search Input */}
      <div className="relative flex flex-1 min-w-0 items-center gap-space-sm md:gap-space-md mr-2">
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

        <div className={`flex flex-1 sm:flex-none min-w-0 items-center gap-space-sm rounded-xl border bg-surface-container-lowest px-space-md py-space-xs transition-colors ${isOpen ? 'border-primary/50 ring-2 ring-primary/20' : 'border-surface-container-high/30 hover:border-primary/50'}`}>
          <span aria-hidden="true" className="material-symbols-outlined text-outline text-body-md select-none">search</span>
          <input
            ref={searchInputRef}
            type="search"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            aria-label="Поиск заметок и задач"
            aria-keyshortcuts="Control+K Meta+K"
            value={query}
            onFocus={() => openPalette(searchInputRef.current)}
            onChange={(event) => {
              if (!useCommandPaletteStore.getState().isOpen) openPalette(searchInputRef.current)
              setQuery(event.target.value)
            }}
            placeholder="Поиск заметок и задач..."
            className="w-full min-w-0 bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none sm:w-64"
          />
          <kbd
            aria-hidden="true"
            tabIndex={-1}
            className="hidden sm:flex items-center gap-0.5 px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm select-none pointer-events-none"
            title="Горячая клавиша ⌘K"
          >
            <span>⌘</span><span>K</span>
          </kbd>
        </div>
        <CommandPaletteModal inputRef={searchInputRef} />
      </div>

      {/* Right: Date Badge, Notifications, and Profile Avatar */}
      <div className="flex shrink-0 items-center gap-space-sm sm:gap-space-md">
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
          className="relative p-2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
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
          className="p-2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* User Profile Avatar */}
        <button
          type="button"
          data-testid="header-user-avatar"
          aria-label={`Профиль: ${profile.name}`}
          onClick={() => setActiveTab('settings')}
          className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md font-semibold select-none cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shrink-0"
        >
          {profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : profile.initials}
        </button>
      </div>
    </header>
  )
}
