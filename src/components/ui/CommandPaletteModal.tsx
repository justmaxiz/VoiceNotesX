import React, { useState, useEffect, useRef } from 'react'
import { useCommandPaletteStore } from '../../store/useCommandPaletteStore'
import { useAppStore } from '../../store/useAppStore'
import { useNavigationStore } from '../../store/navigationStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { Item } from '../../types/item'

interface QuickAction {
  id: string
  title: string
  subtitle: string
  icon: string
  badge?: string
  action: () => void
}

export const CommandPaletteModal: React.FC = () => {
  const { isOpen, closePalette, togglePalette } = useCommandPaletteStore()
  const { searchItems } = useAppStore()
  const { setActiveTab, setRecordingModalOpen } = useNavigationStore()
  const { openDrawer } = useDrawerStore()
  const { openQuickCapture } = useQuickCaptureStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listen for global ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        togglePalette()
      } else if (e.key === 'Escape' && isOpen) {
        closePalette()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, togglePalette, closePalette])

  // Reset query and focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const quickActions: QuickAction[] = [
    {
      id: 'act-record',
      title: 'Начать запись голоса',
      subtitle: 'Быстрый захват мысли через микрофон',
      icon: 'mic',
      badge: 'Space',
      action: () => {
        closePalette()
        setRecordingModalOpen(true)
      },
    },
    {
      id: 'act-task',
      title: 'Создать новую задачу',
      subtitle: 'Открыть Quick Capture внизу экрана',
      icon: 'add_task',
      badge: 'Enter',
      action: () => {
        closePalette()
        openQuickCapture({ entityType: 'task' })
      },
    },
    {
      id: 'act-overview',
      title: 'Перейти в Дашборд',
      subtitle: 'Главный экран продуктивности',
      icon: 'space_dashboard',
      action: () => {
        closePalette()
        setActiveTab('overview')
      },
    },
    {
      id: 'act-notes',
      title: 'Перейти в Заметки',
      subtitle: 'Все текстовые и аудио-заметки',
      icon: 'description',
      action: () => {
        closePalette()
        setActiveTab('notes')
      },
    },
    {
      id: 'act-tasks',
      title: 'Перейти в Задачи',
      subtitle: 'Канбан-доска жизненного цикла',
      icon: 'check_circle',
      action: () => {
        closePalette()
        setActiveTab('tasks')
      },
    },
    {
      id: 'act-calendar',
      title: 'Перейти в Календарь',
      subtitle: 'Расписание и дедлайны по дням',
      icon: 'calendar_today',
      action: () => {
        closePalette()
        setActiveTab('calendar')
      },
    },
    {
      id: 'act-summaries',
      title: 'Перейти в AI Сводки',
      subtitle: 'Аналитические отчеты и ретроспективы',
      icon: 'auto_awesome',
      action: () => {
        closePalette()
        setActiveTab('ai-summaries')
      },
    },
    {
      id: 'act-settings',
      title: 'Перейти в Настройки',
      subtitle: 'Параметры профиля, устройств и экспорта',
      icon: 'settings',
      action: () => {
        closePalette()
        setActiveTab('settings')
      },
    },
  ]

  const searchResults: Item[] = query.trim()
    ? searchItems(query.trim())
    : []

  const totalInteractiveCount = query.trim()
    ? searchResults.length
    : quickActions.length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalInteractiveCount))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + totalInteractiveCount) % Math.max(1, totalInteractiveCount))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) {
        const item = searchResults[selectedIndex]
        if (item) {
          closePalette()
          openDrawer(item.id)
        }
      } else {
        const act = quickActions[selectedIndex]
        if (act) {
          act.action()
        }
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Командная палитра"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm"
      onClick={closePalette}
    >
      <div
        className="w-full max-w-2xl bg-surface-container rounded-2xl border border-outline-variant/40 shadow-2xl overflow-hidden flex flex-col text-on-surface"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/20 bg-surface-container-high/40">
          <span className="material-symbols-outlined text-outline text-xl">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Поиск заметок, задач или введите команду..."
            aria-label="Поиск по командной палитре"
            className="flex-1 bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container-highest text-outline border border-outline-variant/20">
            Esc
          </kbd>
        </div>

        {/* Content Body */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {query.trim() ? (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-outline uppercase tracking-wider">
                Результаты поиска ({searchResults.length})
              </div>

              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-outline text-sm">
                  Ничего не найдено по запросу «{query}»
                </div>
              ) : (
                searchResults.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        closePalette()
                        openDrawer(item.id)
                      }}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-surface-container-high text-primary'
                          : 'hover:bg-surface-container-high/50 text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-outline text-base">
                          {item.type === 'task' ? 'check_circle' : 'description'}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-body-sm font-medium truncate">
                            {item.title}
                          </span>
                          <span className="text-xs text-outline truncate">
                            {item.description || item.transcriptText || item.categoryTag}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs text-outline">
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
                          {item.categoryTag}
                        </span>
                        {isSelected && (
                          <span className="text-primary font-medium">↵ Открыть</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-outline uppercase tracking-wider">
                Быстрые команды
              </div>

              {quickActions.map((act, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <div
                    key={act.id}
                    onClick={act.action}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-surface-container-high text-primary'
                        : 'hover:bg-surface-container-high/50 text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-secondary text-base">
                        {act.icon}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-body-sm font-medium">{act.title}</span>
                        <span className="text-xs text-outline">{act.subtitle}</span>
                      </div>
                    </div>

                    {act.badge && (
                      <kbd className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container-highest text-outline">
                        {act.badge}
                      </kbd>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-high/30 flex items-center justify-between text-[11px] text-outline">
          <div className="flex items-center gap-3">
            <span>↑↓ Навигация</span>
            <span>↵ Выбрать</span>
            <span>Esc Закрыть</span>
          </div>
          <span>Поиск &lt; 3 мс</span>
        </div>
      </div>
    </div>
  )
}
