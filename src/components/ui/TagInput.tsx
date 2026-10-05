import React, { useState, useRef, useEffect } from 'react'

export interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

const SUGGESTED_TAGS = [
  '#Работа',
  '#Разработка',
  '#Дизайн',
  '#Аналитика',
  '#Финансы',
  '#Личное',
  '#Продуктивность',
]

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove))
  }

  const handleAddTag = (newTag: string) => {
    const formatted = newTag.startsWith('#') ? newTag.trim() : `#${newTag.trim()}`
    if (formatted.length > 1 && !tags.includes(formatted)) {
      onChange([...tags, formatted])
    }
    setInputVal('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputVal.trim()) {
        handleAddTag(inputVal)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-label-sm text-outline uppercase tracking-wider font-medium flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm">tag</span>
        <span>Теги</span>
      </label>

      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface text-xs font-medium border border-outline-variant/30"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="text-outline hover:text-error transition-colors cursor-pointer"
              aria-label={`Удалить тег ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        {/* Add Tag Dropdown / Input */}
        <div className="relative inline-block" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="px-2.5 py-0.5 rounded-full border border-dashed border-outline-variant/50 hover:border-primary text-xs text-outline hover:text-primary transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <span>+ Тег</span>
          </button>

          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-surface-container-high/95 border border-outline-variant/40 shadow-xl backdrop-blur-xl p-2 z-30 flex flex-col gap-1.5 animate-in fade-in duration-100">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Новый тег... (Enter)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface focus:border-primary focus:outline-none"
                autoFocus
              />

              <div className="text-[10px] uppercase font-semibold text-outline pt-1 px-1">
                Рекомендованные
              </div>

              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {SUGGESTED_TAGS.filter((s) => !tags.includes(s)).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddTag(suggestion)}
                    className="px-2 py-0.5 rounded-md text-[11px] bg-surface-container hover:bg-surface-container-highest text-on-surface hover:text-primary transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
