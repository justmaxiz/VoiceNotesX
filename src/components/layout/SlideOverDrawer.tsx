import { refineStructuredNote } from '../../lib/geminiRefinement'
import { useSettingsStore } from '../../store/useSettingsStore'
import React, { useEffect, useState, useRef } from 'react'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useAppStore } from '../../store/useAppStore'
import { MiniAudioPlayer } from '../audio/MiniAudioPlayer'
import { exportNoteAsMarkdown } from '../../lib/export'
import { ChecklistItem, Item } from '../../types/item'
import { DateTimePicker } from '../ui/DateTimePicker'
import { TagInput } from '../ui/TagInput'
import { Checkbox } from '../ui/Checkbox'
import { requestNotificationPermission } from '../../lib/remindersService'
import { CaptureDraftDrawer } from './CaptureDraftDrawer'
import { useCaptureAIStore } from '../../store/useCaptureAIStore'

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
  const captureDraft = useCaptureAIStore(state => state.draft)
  const { items, updateItem, setFocusedTask } = useAppStore()
  const selectedItem = items.find((i) => i.id === selectedItemId)
  const [closingItem, setClosingItem] = useState<Item | null>(null)
  const closeTimeoutRef = useRef<number | null>(null)
  const currentItem = selectedItem || closingItem

  const [feedback, setFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  const { aiMode, structuringStyle } = useSettingsStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistText, setNewChecklistText] = useState('')
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistText, setEditingChecklistText] = useState('')
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const reminderMenuRef = useRef<HTMLDivElement>(null)

  const handleClose = () => {
    if (!currentItem) return closeDrawer()
    if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current)
    setClosingItem(currentItem)
    closeDrawer()
    closeTimeoutRef.current = window.setTimeout(() => {
      setClosingItem(null)
      closeTimeoutRef.current = null
    }, 260)
  }

  useEffect(() => {
    if (!isDrawerOpen) return
    if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
    setClosingItem(null)
  }, [isDrawerOpen])

  useEffect(() => () => {
    if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (currentItem) {
      setFeedback('')
      setRefineError(null)
      setTitle(currentItem.title)
      setDescription(currentItem.description || '')
      setChecklist(currentItem.checklist || [])
      setEditingChecklistId(null)
      setEditingChecklistText('')
      setReminderMenuOpen(false)
    }
  }, [currentItem])

  useEffect(() => {
    if (!reminderMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !reminderMenuRef.current?.contains(event.target)) {
        setReminderMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [reminderMenuOpen])

  // ESC key handler
  useEffect(() => {
    if (!isDrawerOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reminderMenuOpen) setReminderMenuOpen(false)
        else handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, closeDrawer, currentItem, reminderMenuOpen])

  useEffect(() => {
    if (!isDrawerOpen && !closingItem) return
    const previousOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousRootOverflow
    }
  }, [isDrawerOpen, closingItem])

  if (isDrawerOpen && captureDraft?.id === selectedItemId) return <CaptureDraftDrawer />
  if ((!isDrawerOpen && !closingItem) || !currentItem) return null

  const isFocused = Boolean(currentItem.isFocus || currentItem.isFocused)
  const currentReminder = REMINDER_OPTIONS.find((option) => option.value === (currentItem.reminderMinutesBefore ?? null)) || REMINDER_OPTIONS[0]

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
    if (editingChecklistId === id) {
      setEditingChecklistId(null)
      setEditingChecklistText('')
    }
    const updated = checklist.map((c) =>
      c.id === id ? { ...c, isCompleted: !c.isCompleted } : c
    )
    setChecklist(updated)
    updateItem(currentItem.id, { checklist: updated })
  }

  const handleSaveChecklistEdit = (id: string, text: string) => {
    const nextText = text.trim()
    if (nextText) {
      const updated = checklist.map((item) => item.id === id ? { ...item, text: nextText } : item)
      setChecklist(updated)
      updateItem(currentItem.id, { checklist: updated })
    }
    setEditingChecklistId(null)
    setEditingChecklistText('')
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

  const handleRefine = async () => {
    if (!feedback.trim() || refining) return
    setRefining(true)
    setRefineError(null)
    try {
      const result = await refineStructuredNote({ title: currentItem.title, description: currentItem.description || '', due_date: currentItem.deadline || currentItem.dueDate, estimated_minutes: currentItem.estimatedMinutes, priority: currentItem.priority, category_tag: currentItem.categoryTag, transcript_summary: currentItem.transcriptText || '', checklist: currentItem.checklist?.map((item) => item.text) }, feedback, { mode: aiMode, style: structuringStyle })
      await updateItem(currentItem.id, { title: result.title, description: result.description, ...(result.due_date !== (currentItem.deadline || currentItem.dueDate) ? { dueDate: result.due_date } : {}), ...(result.start_date ? { startDate: result.start_date } : {}), ...(result.deadline ? { deadline: result.deadline } : {}), ...(result.estimated_minutes !== undefined ? { estimatedMinutes: result.estimated_minutes } : {}), priority: result.priority, categoryTag: result.category_tag, checklist: result.checklist?.map((text, index) => ({ id: currentItem.checklist?.[index]?.id || crypto.randomUUID(), text, sortOrder: index + 1, isCompleted: currentItem.checklist?.[index]?.isCompleted || false })) })
      setFeedback('')
    } catch (error) { setRefineError((error as Error).message) }
    finally { setRefining(false) }
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
      inert={!isDrawerOpen}
    >
      {/* Backdrop */}
      <div
        className="drawer-backdrop fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        style={{ animation: `${isDrawerOpen ? 'drawer-backdrop-in 180ms ease-out' : 'drawer-backdrop-out 220ms ease-in'} both` }}
        onClick={() => { if (isDrawerOpen) handleClose() }}
      />

      {/* Slide-over panel */}
      <div
        ref={drawerRef}
        className="drawer-panel fixed inset-y-0 right-0 w-full sm:w-[560px] max-w-full bg-surface-container border-l border-outline-variant/30 shadow-2xl flex flex-col z-10 overscroll-contain"
        style={{ animation: `${isDrawerOpen ? 'drawer-panel-in 260ms cubic-bezier(0.22, 1, 0.36, 1)' : 'drawer-panel-out 220ms cubic-bezier(0.4, 0, 1, 1)'} both` }}
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
              onClick={handleClose}
              aria-label="Закрыть панель"
              className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5">
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

          <div className="space-y-2">
            <label className="text-xs text-outline" htmlFor="refine-feedback">Дополнить / Изменить</label>
            <input id="refine-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Например: переименуй в План релиза" className="w-full rounded bg-surface-container p-2 text-on-surface" />
            <button disabled={!feedback.trim() || refining} onClick={() => void handleRefine()} className="rounded bg-surface-container-high px-3 py-2 text-xs">{refining ? 'Обработка…' : 'Применить указание'}</button>
            {refineError && <p role="alert" className="text-error text-xs">{refineError}</p>}
          </div>

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
                    {editingChecklistId === item.id && !item.isCompleted ? (
                      <input
                        autoFocus
                        value={editingChecklistText}
                        aria-label={`Редактировать пункт: ${item.text}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setEditingChecklistText(event.target.value)}
                        onBlur={() => handleSaveChecklistEdit(item.id, editingChecklistText)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleSaveChecklistEdit(item.id, editingChecklistText)
                          } else if (event.key === 'Escape') {
                            event.preventDefault()
                            setEditingChecklistId(null)
                            setEditingChecklistText('')
                          }
                        }}
                        className="min-w-0 flex-1 rounded border border-primary/50 bg-surface-container px-1 py-0.5 text-body-sm text-on-surface focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={(event) => {
                          event.stopPropagation()
                          if (!item.isCompleted) {
                            setEditingChecklistId(item.id)
                            setEditingChecklistText(item.text)
                          }
                        }}
                        className={`text-body-sm truncate transition-all strike-linear ${
                          item.isCompleted
                            ? 'strike-active text-outline opacity-60'
                            : 'cursor-text text-on-surface'
                        }`}
                      >
                        {item.text}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklist(item.id)}
                    aria-label={`Удалить ${item.text}`}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-outline hover:text-error transition-opacity cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">delete</span>
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

          {/* Date & Time Picker */}
          {(<DateTimePicker
              startDate={currentItem.startDate}
              deadline={currentItem.deadline}
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
              <div ref={reminderMenuRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={reminderMenuOpen}
                  onClick={() => setReminderMenuOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/25 bg-surface-container-low px-3 py-2.5 text-left text-sm text-on-surface transition-colors hover:border-primary/50 hover:bg-surface-container-high/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <span className="truncate">{currentReminder.label}</span>
                  <span className={`material-symbols-outlined text-base text-outline transition-transform duration-150 ${reminderMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {reminderMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="Время напоминания"
                    className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-high p-1.5 text-on-surface shadow-xl shadow-black/20 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {REMINDER_OPTIONS.map((option) => {
                      const isSelected = option.value === (currentItem.reminderMinutesBefore ?? null)
                      return (
                        <button
                          key={String(option.value)}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            handleReminderChange(option.value)
                            setReminderMenuOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${
                            isSelected
                              ? 'bg-primary/15 font-medium text-primary'
                              : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                          }`}
                        >
                          <span>{option.label}</span>
                          {isSelected && <span className="material-symbols-outlined text-base">check</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

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
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-outline-variant/20 bg-surface-container-high/40 flex items-center justify-between text-xs text-outline">
          <span>Создано: {new Date(currentItem.createdAt).toLocaleDateString('ru-RU')}</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-medium transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
