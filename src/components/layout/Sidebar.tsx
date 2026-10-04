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
  const { activeTab, setActiveTab, isMobileMenuOpen, setMobileMenuOpen } = useNavigationStore()

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
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col justify-between py-space-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] select-none transition-transform duration-200 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
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
          <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold">
            v2.4
          </span>
        </div>

        {/* Workspace Selector */}
        <div className="px-space-md">
          <button
            type="button"
            className="w-full flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-space-sm overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-body-lg">hub</span>
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="font-label-md text-label-md text-on-surface truncate">
                  Личное пространство
                </span>
                <span className="font-body-sm text-body-sm text-outline truncate">
                  Синхронизировано
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline group-hover:text-on-surface transition-colors shrink-0">
              unfold_more
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-space-xs px-space-md" aria-label="Разделы приложения">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                data-testid={`nav-item-${item.id}`}
                data-path={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-between px-space-md py-space-sm rounded-xl transition-all text-left w-full cursor-pointer ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-body-lg">{item.icon}</span>
                  <span className="font-label-lg text-label-lg">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badgeType === 'default' && (
                  <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                    {item.badge}
                  </span>
                )}

                {item.badge !== undefined && item.badgeType === 'success' && (
                  <span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm font-semibold">
                    {item.badge}
                  </span>
                )}

                {item.badgeType === 'pulse' && (
                  <span
                    className="w-2 h-2 rounded-full bg-secondary animate-pulse"
                    aria-label="Активно"
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section: Storage & Profile */}
      <div className="flex flex-col gap-space-md px-space-md">
        {/* Cloud Storage Widget */}
        <div className="p-space-md rounded-xl bg-surface-container flex flex-col gap-space-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-body-md">
                cloud_done
              </span>
              <span>Облако активно</span>
            </div>
            <span className="text-on-surface font-label-sm text-label-sm font-semibold">
              82%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: '82%' }}
            />
          </div>
          <div className="flex items-center justify-between font-label-sm text-label-sm text-outline">
            <span>Хранилище аудио</span>
            <span>16.4 / 20 ГБ</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-semibold text-xs border border-primary/30">
              АО
            </div>
            <div className="flex flex-col text-left truncate">
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
