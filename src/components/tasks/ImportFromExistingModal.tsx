import React, { useState } from 'react'
import { Item } from '../../types/item'

export interface ImportFromExistingModalProps {
  isOpen: boolean
  targetColumnTitle: string
  items: Item[]
  onSelect: (item: Item) => void
  onClose: () => void
}

export const ImportFromExistingModal: React.FC<ImportFromExistingModalProps> = ({
  isOpen,
  targetColumnTitle,
  items,
  onSelect,
  onClose,
}) => {
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  const filtered = items.filter((item) => {
    const q = search.toLowerCase()
    return !q || item.title.toLowerCase().includes(q) || item.categoryTag.toLowerCase().includes(q)
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Добавить задачу из существующих"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container rounded-2xl border border-outline-variant/30 shadow-2xl p-5 flex flex-col gap-4 text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div>
            <h2 className="text-title-lg font-semibold">Добавить из существующих</h2>
            <p className="text-label-sm text-outline">
              Целевая колонка: <span className="text-primary font-medium">{targetColumnTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-body-lg">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-body-md">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по заметкам и задачам..."
            aria-label="Поиск по существующим элементам"
            className="w-full pl-9 pr-3 py-2 text-body-sm rounded-xl bg-surface-container-low border border-outline-variant/20 focus:border-primary focus:outline-none text-on-surface"
            autoFocus
          />
        </div>

        {/* Items list */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-outline text-sm">
              Ничего не найдено
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item)
                  onClose()
                }}
                className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 hover:border-primary/40 cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-outline mt-0.5">
                    <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-medium">
                      {item.type === 'note' ? 'Заметка' : 'Задача'}
                    </span>
                    <span>{item.categoryTag}</span>
                  </div>
                </div>

                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-base">
                  add_circle
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium transition-colors cursor-pointer text-sm"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
