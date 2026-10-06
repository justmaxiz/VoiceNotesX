import React from 'react'
import { useNavigationStore } from '../../store/navigationStore'
import { NavItem } from '../../types/navigation'

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Главная / Обзор',
    icon: 'space_dashboard',
  },
  {
    id: 'notes',
    label: 'Заметки',
    icon: 'description',
    badge: 42,
    badgeType: 'default',
  },
  {
    id: 'tasks',
    label: 'Задачи',
    icon: 'check_circle',
    badge: 12,
    badgeType: 'default',
  },
  {
    id: 'calendar',
    label: 'Календарь',
    icon: 'calendar_today',
  },
  {
    id: 'ai-summaries',
    label: 'Сводки',
    icon: 'summarize',
    badgeType: 'pulse',
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: 'settings',
  },
]

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isMobileMenuOpen,
    setMobileMenuOpen,
    isSidebarCollapsed,
    toggleSidebar,
  } = useNavigationStore()
  const isCompact = isSidebarCollapsed && !isMobileMenuOpen

  return (
    <>
      {isMobileMenuOpen && (
        <div
          data-testid="sidebar-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        aria-label="Боковая панель навигации"
        className={`fixed left-0 top-0 h-full overflow-hidden ${isCompact ? 'w-20' : 'w-72'} bg-surface-container-low border-r border-surface-container-high/50 z-50 flex flex-col shadow-lg select-none transition-[width,transform] duration-200 ${
          isMobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex h-full w-72 min-w-[18rem] flex-col justify-between py-space-md">
        {/* Top Section */}
        <div className="flex flex-col gap-space-md">
          {/* Brand Header */}
          <div className={`flex h-8 w-full items-center pl-6 pr-space-md ${isCompact ? 'justify-start' : 'justify-between'}`}>
            <div className={`flex items-center ${isCompact ? 'justify-start' : 'gap-space-sm'}`}>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">mic</span>
              </div>
              {!isCompact && <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                VoiceNotes AI
              </span>}
            </div>
            {!isCompact && <button
              type="button"
              onClick={() => {
                if (isMobileMenuOpen) {
                  setMobileMenuOpen(false)
                } else {
                  toggleSidebar()
                }
              }}
              aria-label={isMobileMenuOpen ? 'Закрыть меню' : isSidebarCollapsed ? 'Показать боковую панель' : 'Скрыть боковую панель'}
              title={isMobileMenuOpen ? 'Закрыть меню' : isSidebarCollapsed ? 'Показать боковую панель (Ctrl+B)' : 'Скрыть боковую панель (Ctrl+B)'}
              className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isMobileMenuOpen ? 'close' : isSidebarCollapsed ? 'dock_to_right' : 'dock_to_left'}
              </span>
            </button>}
          </div>

          {/* Nav Items List */}
          <nav className={`flex flex-col gap-1 ${isCompact ? 'px-2' : 'px-space-sm'}`} aria-label="Основное меню">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id || (item.id === 'notes' && activeTab === 'notes-and-audio')
              return (
                <button
                  key={item.id}
                  data-testid={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={isCompact ? item.label : undefined}
                  title={isCompact ? item.label : undefined}
                  className={`${isCompact ? 'w-16 justify-start pl-[21px] pr-2' : 'w-full justify-between pl-[21px] pr-space-md'} flex items-center py-3.5 rounded-xl font-label-lg text-label-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                  }`}
                >
                  <div className={`flex items-center ${isCompact ? 'justify-start' : 'gap-space-sm'}`}>
                    <span
                      className={`material-symbols-outlined text-[22px] ${
                        isActive ? 'text-on-primary-container' : 'text-outline'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isCompact && <span className="whitespace-nowrap">{item.label}</span>}
                  </div>

                  {!isCompact && item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.badgeType === 'success'
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {!isCompact && item.badgeType === 'pulse' && (
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section: Sync Indicator, Cloud Meter & User Profile */}
        <div className={`flex flex-col gap-space-sm ${isCompact ? 'w-20 items-start pl-[22px]' : 'w-full pl-[22px] pr-space-md'}`}>
          {/* Synchronized status indicator (Obsidian Lumina / Cyber Emerald) */}
          <div
            data-testid="sidebar-sync-indicator"
            className={`items-center gap-2 px-space-xs py-1 text-label-sm font-label-sm text-on-surface-variant select-none ${isCompact ? 'hidden' : 'flex'}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="text-secondary font-medium">Сохранение в этом браузере</span>
          </div>

          {/* User Profile Footer */}
          <div className={`pt-space-xs border-t border-surface-container-high/30 flex items-center ${isCompact ? 'w-full justify-start' : 'justify-between'}`}>
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md font-semibold shrink-0">
                АО
              </div>
              {!isCompact && <div className="flex flex-col min-w-0">
                <span className="font-label-lg text-label-lg font-semibold text-on-surface truncate">
                  Алексей Орлов
                </span>
                <span className="font-body-sm text-body-sm text-outline truncate">
                  Pro Лицензия
                </span>
              </div>}
            </div>
            {!isCompact && <button
              type="button"
              aria-label="Меню пользователя"
              className="p-space-xs text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-lg">more_vert</span>
            </button>}
          </div>
        </div>
        </div>
      </aside>
    </>
  )
}
