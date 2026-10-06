import React, { useState, useRef, useEffect } from 'react'
import { TaskSortCriteria, TaskSortDirection } from '../../../types/item'

export interface TaskSortMenuProps {
  sortBy: TaskSortCriteria
  sortDirection: TaskSortDirection
  onSortChange: (by: TaskSortCriteria, direction?: TaskSortDirection) => void
}

const SORT_OPTIONS: Array<{ key: TaskSortCriteria; label: string; icon: string; ascDescDesc: [string, string] }> = [
  { key: 'priority', label: 'По приоритету', icon: 'flag', ascDescDesc: ['Высокий приоритет сначала', 'Низкий приоритет сначала'] },
  { key: 'time', label: 'По времени / дедлайну', icon: 'schedule', ascDescDesc: ['Ближайшие первые', 'Поздние первые'] },
  { key: 'created', label: 'По дате создания', icon: 'history', ascDescDesc: ['Свежие первые', 'Старые первые'] },
  { key: 'title', label: 'По названию', icon: 'sort_by_alpha', ascDescDesc: ['А — Я', 'Я — А'] },
  { key: 'manual', label: 'Свой порядок', icon: 'drag_indicator', ascDescDesc: ['Обычный', 'Обратный'] },
]

export const TaskSortMenu: React.FC<TaskSortMenuProps> = ({
  sortBy,
  sortDirection,
  onSortChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const currentOption = SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0]
  const directionDesc = sortDirection === 'asc' ? currentOption.ascDescDesc[0] : currentOption.ascDescDesc[1]

  const handleToggleDirection = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextDir: TaskSortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    onSortChange(sortBy, nextDir)
  }

  const handleSelectCriteria = (key: TaskSortCriteria) => {
    onSortChange(key, sortDirection)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-flex items-center gap-2 text-xs" ref={menuRef}>
      <span className="text-outline text-xs select-none">Сортировка:</span>

      <div className="inline-flex items-center rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={`Сортировка: ${currentOption.label}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-on-surface hover:text-primary transition-colors cursor-pointer select-none font-medium"
        >
          <span>{currentOption.label}</span>
          <span className="material-symbols-outlined text-[15px] text-outline transition-transform duration-150">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggleDirection}
          title={`Направление: ${directionDesc}`}
          aria-label={`Сменить направление: ${directionDesc}`}
          className="p-1.5 px-2 text-outline hover:text-primary transition-colors cursor-pointer border-l border-outline-variant/20 flex items-center justify-center self-stretch"
        >
          <span className="material-symbols-outlined text-[15px]">
            {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        </button>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Варианты сортировки"
          className="absolute top-full right-0 mt-1.5 w-60 rounded-xl bg-surface-container-high/95 border border-outline-variant/40 shadow-xl backdrop-blur-xl py-1 z-30 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-outline border-b border-outline-variant/20">
            Упорядочить список
          </div>

          {SORT_OPTIONS.map((opt) => {
            const isActive = opt.key === sortBy
            return (
              <button
                key={opt.key}
                type="button"
                role="menuitem"
                onClick={() => handleSelectCriteria(opt.key)}
                className={`flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-primary-container/20 text-primary font-semibold'
                    : 'text-on-surface hover:bg-surface-container hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-outline">
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                </div>
                {isActive && (
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    check
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
