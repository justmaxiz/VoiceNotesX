import React, { useRef, useEffect } from 'react'
import { useNavigationStore } from '../../store/navigationStore'

export const Header: React.FC = () => {
  const { searchQuery, setSearchQuery, setRecordingModalOpen, isMobileMenuOpen, setMobileMenuOpen } =
    useNavigationStore()
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  // Format today's date in Russian (e.g., "Сегодня, 24 Окт")
  const todayLabel = 'Сегодня, 24 Окт'

  return (
    <header
      role="banner"
      aria-label="Верхняя панель управления"
      className="fixed top-0 left-0 md:left-72 right-0 h-16 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high/40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-md md:px-space-xl"
    >
      {/* Left: Hamburger (mobile) + Global Search Input */}
      <div className="flex items-center gap-space-sm md:gap-space-md">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          className="md:hidden p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">
            {isMobileMenuOpen ? 'close' : 'menu'}
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
            className="font-body-sm text-body-sm text-on-surface bg-transparent outline-none w-56 placeholder:text-outline"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              searchInputRef.current?.focus()
            }}
            className="flex items-center gap-0.5 px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm select-none hover:text-on-surface cursor-pointer"
            title="Горячая клавиша ⌘K"
          >
            <span>⌘</span>
            <span>K</span>
          </button>
        </div>
      </div>

      {/* Right: Date, Quick Record, Notification, Profile */}
      <div className="flex items-center gap-space-md">
        {/* Date Indicator */}
        <div className="flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-body-sm text-body-sm border border-surface-container-high/20 select-none">
          <span className="material-symbols-outlined text-body-md text-outline">event</span>
          <span>{todayLabel}</span>
        </div>

        {/* Quick Voice Record Trigger Button */}
        <button
          type="button"
          onClick={() => setRecordingModalOpen(true)}
          className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all shadow-[0_0_20px_-3px_rgba(160,120,255,0.4)] cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">mic</span>
          <span>Запись</span>
        </button>

        {/* Notifications Icon Button */}
        <button
          type="button"
          aria-label="Уведомления"
          className="relative p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary shadow-[0_0_6px_rgba(78,222,163,0.8)]" />
        </button>

        {/* Header Profile Avatar */}
        <div className="flex items-center gap-space-sm">
          <div
            className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-semibold text-xs border border-primary/30 select-none"
            title="Алексей Орлов"
          >
            АО
          </div>
        </div>
      </div>
    </header>
  )
}
