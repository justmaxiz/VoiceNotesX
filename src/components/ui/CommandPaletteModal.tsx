import React, { useEffect, useMemo, useRef } from 'react'
import { useCommandPaletteStore } from '../../store/useCommandPaletteStore'
import { useAppStore } from '../../store/useAppStore'
import { useNavigationStore } from '../../store/navigationStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { createSearchSnippet, performSearchWithMatches, SearchHit } from '../../lib/search'
import { Item } from '../../types/item'

interface QuickAction {
  id: string
  title: string
  subtitle: string
  icon: string
  badge?: string
  action: () => void
}

function highlightMatches(text: string, terms: string[]): React.ReactNode[] {
  const escapedTerms = [...new Set(terms)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escapedTerms.length === 0) return [text]

  const matcher = new RegExp(`(${escapedTerms.join('|')})`, 'giu')
  const matchedTerms = new Set(terms.map((term) => term.toLowerCase()))
  return text.split(matcher).map((part, index) => matchedTerms.has(part.toLowerCase())
    ? <mark key={`${part}-${index}`} className="rounded-sm bg-primary-container px-0.5 text-on-primary-container">{part}</mark>
    : part)
}

function ResultRow({ hit, onOpen }: { hit: SearchHit; onOpen: (item: Item) => void }) {
  const { item } = hit
  const snippet = createSearchSnippet(hit)
  const typeLabel = item.type === 'task' ? 'Задача' : 'Заметка'
  const accessibleType = item.type === 'task' ? 'задачу' : 'заметку'

  return (
    <button
      type="button"
      role="option"
      aria-label={`Открыть ${accessibleType}: ${item.title}`}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onOpen(item)
        }
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-on-surface transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base text-outline">
          {item.type === 'task' ? 'check_circle' : 'description'}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 truncate text-body-sm font-medium">
            <span className="truncate">{item.title}</span>
            <span className="shrink-0 rounded-md bg-surface-container-highest px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
              {typeLabel}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-2 text-xs text-outline">
            {highlightMatches(snippet.text, snippet.terms)}
          </span>
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-xs text-outline group-focus-visible:text-primary">↵</span>
    </button>
  )
}

interface CommandPaletteModalProps {
  inputRef: { current: HTMLInputElement | null }
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ inputRef }) => {
  const { isOpen, query, closePalette } = useCommandPaletteStore()
  const { items } = useAppStore()
  const { setActiveTab, setRecordingModalOpen } = useNavigationStore()
  const { openDrawer } = useDrawerStore()
  const { openQuickCapture } = useQuickCaptureStore()

  const widgetRef = useRef<HTMLDivElement>(null)

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
      title: 'Перейти в Профиль',
      subtitle: 'Параметры профиля, устройств и экспорта',
      icon: 'settings',
      action: () => {
        closePalette()
        setActiveTab('settings')
      },
    },
  ]

  const searchResults = useMemo(
    () => query.trim() ? performSearchWithMatches(query, items) : [],
    [items, query]
  )
  const recentItems = useMemo(() => [...items]
    .sort((a, b) => {
      const aUpdated = Date.parse(a.updatedAt)
      const bUpdated = Date.parse(b.updatedAt)
      return (Number.isFinite(bUpdated) ? bUpdated : 0) - (Number.isFinite(aUpdated) ? aUpdated : 0)
    })
    .slice(0, 5), [items])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        closePalette()
        inputRef.current?.focus()
      } else if (event.key === 'Tab' && isOpen && widgetRef.current) {
        const focusable = Array.from(widgetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ))
        if (focusable.length === 0) return
        const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
          : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1)
        event.preventDefault()
        focusable[nextIndex]?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closePalette, inputRef, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && !widgetRef.current?.contains(target) && !inputRef.current?.contains(target)) {
        closePalette()
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [closePalette, inputRef, isOpen])

  const openItem = (item: Item) => {
    closePalette()
    openDrawer(item.id)
  }

  if (!isOpen) return null

  return (
    <div
      ref={widgetRef}
      data-testid="command-palette-widget"
      className="absolute left-0 top-full z-50 mt-2 flex w-[min(780px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container text-on-surface shadow-2xl"
    >
        <div
          id="command-palette-results"
          role="listbox"
          aria-label="Команды и результаты поиска"
          className="max-h-[min(70vh,32rem)] overflow-y-auto p-2"
        >
          {query.trim() ? (
            <section aria-label="Результаты поиска" role="group">
              <div aria-live="polite" aria-atomic="true" className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-outline">
                Результаты поиска ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div role="status" className="py-8 text-center text-sm text-outline">
                  Ничего не найдено по запросу «{query}»
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((hit) => <ResultRow key={hit.item.id} hit={hit} onOpen={openItem} />)}
                </div>
              )}
            </section>
          ) : (
            <div className="space-y-3">
              <section aria-label="Быстрые команды" role="group">
                <h2 className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-outline">Быстрые команды</h2>
                <div className="space-y-1">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      role="option"
                      onClick={action.action}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          action.action()
                        }
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-on-surface transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-base text-secondary">{action.icon}</span>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-body-sm font-medium">{action.title}</span>
                          <span className="truncate text-xs text-outline">{action.subtitle}</span>
                        </span>
                      </span>
                      {action.badge && <kbd className="rounded bg-surface-container-highest px-2 py-0.5 font-mono text-[11px] text-outline">{action.badge}</kbd>}
                    </button>
                  ))}
                </div>
              </section>

              {recentItems.length > 0 && (
                <section aria-label="Недавние элементы" role="group">
                  <h2 className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-outline">Недавние</h2>
                  <div className="space-y-1">
                    {recentItems.map((item) => (
                      <ResultRow
                        key={item.id}
                        hit={{ item, score: 0, terms: [], fields: [] }}
                        onOpen={openItem}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/20 bg-surface-container-high/30 px-4 py-2 text-[11px] text-outline">
          <div className="flex items-center gap-3">
            <span>Tab Перейти</span>
            <span>↵ Открыть</span>
            <span>Esc Закрыть</span>
          </div>
          <span>Локальный поиск</span>
        </div>
    </div>
  )
}
