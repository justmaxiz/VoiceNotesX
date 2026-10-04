import React, { useRef, useEffect } from 'react'
import { useNavigationStore } from '../../store/navigationStore'

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setRecordingModalOpen,
    isSidebarCollapsed,
    toggleSidebar,
  } = useNavigationStore()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Hotkey listener for ⌘K / Ctrl+K search focus and Ctrl+B / ⌘B sidebar toggle
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
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Показать боковую панель' : 'Скрыть боковую панель'}
          title={isSidebarCollapsed ? 'Показать боковую панель (Ctrl+B)' : 'Скрыть боковую панель (Ctrl+B)'}
          className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <span className="material-symbols-outlined text-body-lg">
            {isSidebarCollapsed ? 'menu' : 'dock_to_left'}
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              searchInputRef.current?.focus()
            }}
            className="hidden sm:flex items-center gap-0.5 px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm select-none hover:text-on-surface cursor-pointer"
            title="Горячая клавиша ⌘K"
          >
            <span>⌘</span>
            <span>K</span>
          </button>
        </div>
      </div>

      {/* Right: Quick Record Action, Calendar, and Status */}
      <div className="flex items-center gap-space-md">
        <div className="hidden lg:flex items-center gap-space-xs text-outline font-label-md text-label-md">
          <span className="material-symbols-outlined text-body-md">calendar_month</span>
          <span>{todayLabel}</span>
        </div>

        {/* Global Record CTA */}
        <button
          type="button"
          onClick={() => setRecordingModalOpen(true)}
          className="flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all glow-violet cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-md animate-pulse">mic</span>
          <span className="hidden sm:inline">Запись</span>
          <span className="hidden md:inline px-1 py-0.2 rounded bg-on-primary/20 text-on-primary font-label-sm text-label-sm ml-0.5">
            Space
          </span>
        </button>

        {/* Notifications Icon Button */}
        <button
          type="button"
          aria-label="Уведомления"
          className="relative p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface" />
        </button>
      </div>
    </header>
  )
}
