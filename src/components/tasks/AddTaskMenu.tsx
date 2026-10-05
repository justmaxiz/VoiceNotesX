import React, { useState, useRef, useEffect } from 'react'

export interface AddTaskMenuProps {
  onSelectCreateNew: () => void
  onSelectImportExisting: () => void
}

export const AddTaskMenu: React.FC<AddTaskMenuProps> = ({
  onSelectCreateNew,
  onSelectImportExisting,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Добавить задачу"
        className="w-7 h-7 rounded-lg bg-surface-container-high/60 hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm">add</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-56 bg-surface-container rounded-xl border border-outline-variant/30 shadow-xl py-1.5 z-30 flex flex-col text-on-surface"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              onSelectCreateNew()
            }}
            className="flex items-center gap-2 px-3 py-2 text-label-md hover:bg-surface-container-high text-left cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-base text-primary">edit_note</span>
            <div className="flex flex-col">
              <span className="font-medium">Создать новую</span>
              <span className="text-xs text-outline">Через Quick Capture</span>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              onSelectImportExisting()
            }}
            className="flex items-center gap-2 px-3 py-2 text-label-md hover:bg-surface-container-high text-left cursor-pointer transition-colors border-t border-outline-variant/15"
          >
            <span className="material-symbols-outlined text-base text-secondary">playlist_add</span>
            <div className="flex flex-col">
              <span className="font-medium">Добавить из существующих</span>
              <span className="text-xs text-outline">Из заметок или бэклога</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
