import React, { useEffect, useState, useRef } from 'react'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useAppStore } from '../../store/useAppStore'
import { MiniAudioPlayer } from '../audio/MiniAudioPlayer'
import { exportNoteAsMarkdown } from '../../lib/export'
import { ChecklistItem } from '../../types/item'
import { DateTimePicker } from '../ui/DateTimePicker'
import { TagInput } from '../ui/TagInput'
import { Checkbox } from '../ui/Checkbox'
import { requestNotificationPermission } from '../../lib/remindersService'

const REMINDER_OPTIONS = [
  { label: 'Без напоминания', value: null },
  { label: 'В момент начала', value: 0 },
  { label: 'За 5 минут до начала', value: 5 },
  { label: 'За 10 минут до начала', value: 10 },
  { label: 'За 15 минут до начала', value: 15 },
  { label: 'За 1 час до начала', value: 60 },
]

export const SlideOverDrawer: React.FC = () => {
  const { selectedItemId, isDrawerOpen, closeDrawer } = useDrawerStore()
  const { items, updateItem, setFocusedTask } = useAppStore()

  const currentItem = items.find((i) => i.id === selectedItemId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistText, setNewChecklistText] = useState('')
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentItem) {
      setTitle(currentItem.title)
      setDescription(currentItem.description || '')
      setChecklist(currentItem.checklist || [])
    }
  }, [currentItem])

  // ESC key handler
  useEffect(() => {
    if (!isDrawerOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, closeDrawer])

  if (!isDrawerOpen || !currentItem) return null

  const isFocused = Boolean(currentItem.isFocus || currentItem.isFocused)

  const handleTitleBlur = () => {
    if (title.trim() && title !== currentItem.title) {
      updateItem(currentItem.id, { title: title.trim() })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== currentItem.description) {
      updateItem(currentItem.id, { description })
    }
  }

  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map((c) =>
      c.id === id ? { ...c, isCompleted: !c.isCompleted } : c
    )
    setChecklist(updated)
    updateItem(currentItem.id, { checklist: updated })
  }

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistText.trim()) return

    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      text: newChecklistText.trim(),
      isCompleted: false,
      sortOrder: checklist.length + 1,
    }
    const updated = [...checklist, newItem]
    setChecklist(updated)
    setNewChecklistText('')
    updateItem(currentItem.id, { checklist: updated })
  }

  const handleRemoveChecklist = (id: string) => {
    const updated = checklist.filter((c) => c.id !== id)
    setChecklist(updated)
    updateItem(currentItem.id, { checklist: updated })
  }

  const handleToggleFocus = () => {
    if (isFocused) {
      updateItem(currentItem.id, { isFocus: false, isFocused: false })
    } else {
      setFocusedTask(currentItem.id)
    }
  }

  const handleReminderChange = (value: number | null) => {
    if (value !== null) {
      requestNotificationPermission()
    }
    updateItem(currentItem.id, { reminderMinutesBefore: value })
  }

  const handleExport = () => {
    exportNoteAsMarkdown(currentItem)
  }

  const tagsList =
    currentItem.tags && currentItem.tags.length > 0
      ? currentItem.tags
      : currentItem.categoryTag
      ? [currentItem.categoryTag]
      : []

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Детальный просмотр заметки"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeDrawer}
      />

      {/* Slide-over panel */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 w-full sm:w-[560px] max-w-full bg-surface-container border-l border-outline-variant/30 shadow-2xl flex flex-col z-10 transition-transform duration-250 ease-out"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-label-sm font-medium ${
                currentItem.type === 'task'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              {currentItem.type === 'task' ? 'Задача' : 'Заметка'}
            </span>

            {/* Focus Toggle */}
            {currentItem.type === 'task' && (
              <button
                type="button"
                onClick={handleToggleFocus}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  isFocused
                    ? 'bg-primary text-on-primary shadow-xs glow-violet'
                    : 'bg-surface-container-highest text-outline hover:text-primary hover:bg-surface-container'
                }`}
              >
                <span>🎯</span>
                <span>{isFocused ? 'В фокусе дня' : 'Сделать главной'}</span>
              </button>
            )}

            {currentItem.audioUrl && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container text-xs text-outline">
                <MiniAudioPlayer audioUrl={currentItem.audioUrl} />
                <span>Аудио</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Export Markdown button */}
            <button
              type="button"
              onClick={handleExport}
              title="Экспорт в Markdown (.md)"
              aria-label="Экспорт в Markdown"
              className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-lg">download</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Закрыть панель"
              className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Editable Title */}
          <div>
            <label className="text-label-sm text-outline uppercase tracking-wider block mb-1">
              Заголовок
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              aria-label="Заголовок заметки"
              className="w-full text-headline-md font-semibold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant/40 focus:border-primary focus:outline-none py-1 transition-colors"
            />
          </div>

          {/* Date & Time Picker */}
          {currentItem.type === 'task' && (
            <DateTimePicker
              dueDate={currentItem.dueDate}
              dueTime={currentItem.dueTime}
              isAllDay={currentItem.isAllDay}
              estimatedMinutes={currentItem.estimatedMinutes}
              onChange={(updates) => updateItem(currentItem.id, updates)}
            />
          )}

          {/* Interactive Tag Manager */}
          <TagInput
            tags={tagsList}
            onChange={(newTags) =>
              updateItem(currentItem.id, {
                tags: newTags,
                categoryTag: newTags[0] || currentItem.categoryTag,
              })
            }
          />

          {/* Reminders Selector */}
          {currentItem.type === 'task' && (
            <div className="space-y-1.5">
              <label className="text-label-sm text-outline uppercase tracking-wider font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">notifications</span>
                <span>Напоминание</span>
              </label>
              <select
                value={
                  currentItem.reminderMinutesBefore === null ||
                  currentItem.reminderMinutesBefore === undefined
                    ? ''
                    : String(currentItem.reminderMinutesBefore)
                }
                onChange={(e) =>
                  handleReminderChange(e.target.value === '' ? null : Number(e.target.value))
                }
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface focus:border-primary focus:outline-none cursor-pointer"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option
                    key={String(opt.value)}
                    value={opt.value === null ? '' : String(opt.value)}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description / Content Body */}
          <div>
            <label className="text-label-sm text-outline uppercase tracking-wider block mb-1">
              Содержимое и описание
            </label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              aria-label="Содержимое заметки"
              placeholder="Введите текст или markdown заметки..."
              className="w-full text-body-md text-on-surface bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 hover:border-outline-variant/40 focus:border-primary focus:outline-none transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Transcript Snippet if present */}
          {currentItem.transcriptText && (
            <div className="p-3.5 rounded-xl bg-surface-container-high/30 border border-secondary/20">
              <div className="flex items-center gap-1.5 text-label-sm text-secondary font-medium mb-1.5">
                <span className="material-symbols-outlined text-sm">record_voice_over</span>
                <span>Исходный транскрипт речи</span>
              </div>
              <p className="text-body-sm text-on-surface-variant italic leading-relaxed">
                «{currentItem.transcriptText}»
              </p>
            </div>
          )}

          {/* Checklist Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-label-sm text-outline uppercase tracking-wider">
                Чек-лист и шаги ({checklist.filter((c) => c.isCompleted).length}/{checklist.length})
              </label>
            </div>

            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low group"
                >
                  <div
                    className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0"
                    onClick={() => handleToggleChecklist(item.id)}
                  >
                    <Checkbox
                      checked={item.isCompleted}
                      onChange={() => handleToggleChecklist(item.id)}
                      size="sm"
                      ariaLabel={`Пункт: ${item.text}`}
                    />
                    <span
                      className={`text-body-sm truncate transition-all strike-linear ${
                        item.isCompleted
                          ? 'strike-active text-outline opacity-60'
                          : 'text-on-surface'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklist(item.id)}
                    aria-label={`Удалить ${item.text}`}
                    className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-error transition-opacity cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddChecklist} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Добавить новый пункт..."
                aria-label="Новый пункт чек-листа"
                className="flex-1 px-3 py-1.5 text-body-sm rounded-lg bg-surface-container-low border border-outline-variant/20 focus:border-primary focus:outline-none text-on-surface"
              />
              <button
                type="submit"
                disabled={!newChecklistText.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                + Добавить
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-outline-variant/20 bg-surface-container-high/40 flex items-center justify-between text-xs text-outline">
          <span>Создано: {new Date(currentItem.createdAt).toLocaleDateString('ru-RU')}</span>
          <button
            type="button"
            onClick={closeDrawer}
            className="px-4 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-medium transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
