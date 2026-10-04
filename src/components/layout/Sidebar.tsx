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
    id: 'notes-and-audio',
    label: 'Заметки и аудио',
    icon: 'mic',
    badge: 42,
    badgeType: 'default',
  },
  {
    id: 'tasks',
    label: 'Задачи',
    icon: 'check_circle',
    badge: 12,
    badgeType: 'success',
  },
  {
    id: 'calendar',
    label: 'Календарь',
    icon: 'calendar_today',
  },
  {
    id: 'ai-summaries',
    label: 'AI Сводки',
    icon: 'auto_awesome',
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
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-low border-r border-surface-container-high/50 z-50 flex flex-col justify-between py-space-md shadow-lg select-none transition-transform duration-200 ${
          isMobileMenuOpen
            ? 'translate-x-0'
            : isSidebarCollapsed
              ? '-translate-x-full'
              : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col gap-space-md">
          {/* Brand Header */}
          <div className="px-space-md flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">mic</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                VoiceNotes AI
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold">
                v2.4
              </span>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Скрыть боковую панель"
                title="Скрыть боковую панель (Ctrl+B)"
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-body-md">dock_to_left</span>
              </button>
            </div>
          </div>

          {/* Workspace Selector */}
          <div className="px-space-md">
            <button
              type="button"
              className="w-full flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer group text-left"
            >
              <div className="flex items-center gap-space-sm overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-body-md">hub</span>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-label-md text-label-md text-on-surface font-medium truncate">
                    Личное пространство
                  </span>
                  <span className="font-body-sm text-body-sm text-outline truncate">
                    Синхронизировано
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-body-md group-hover:text-on-surface transition-colors shrink-0">
                unfold_more
              </span>
            </button>
          </div>

          {/* Nav Items List */}
          <nav className="px-space-sm flex flex-col gap-1" aria-label="Основное меню">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  data-testid={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-space-md py-2.5 rounded-xl font-label-md text-label-md transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span
                      className={`material-symbols-outlined text-body-lg ${
                        isActive ? 'text-on-primary-container' : 'text-outline'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
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

                  {item.badgeType === 'pulse' && (
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section: Cloud Meter & User Profile */}
        <div className="px-space-md flex flex-col gap-space-md">
          {/* Cloud Storage Usage Card */}
          <div className="p-space-sm rounded-xl bg-surface-container border border-surface-container-high/30 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between text-label-sm font-label-sm text-outline">
              <div className="flex items-center gap-1 text-secondary">
                <span className="material-symbols-outlined text-sm">cloud_done</span>
                <span>Облако активно</span>
              </div>
              <span className="font-semibold text-on-surface">82%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                style={{ width: '82%' }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-outline pt-0.5">
              <span>Хранилище аудио</span>
              <span>16.4 / 20 ГБ</span>
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="pt-space-xs border-t border-surface-container-high/30 flex items-center justify-between">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md font-semibold shrink-0">
                АО
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface truncate">
                  Алексей Орлов
                </span>
                <span className="font-body-sm text-body-sm text-outline truncate">
                  Pro Лицензия
                </span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Меню пользователя"
              className="p-space-xs text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-lg">more_vert</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
