import React, { useState, useRef, useEffect, useMemo } from 'react'
import confetti from 'canvas-confetti'
import { MiniAudioPlayer } from '../../audio/MiniAudioPlayer'
import { ChecklistItem } from '../../../types/item'
import { useAppStore } from '../../../store/useAppStore'
import { useDrawerStore } from '../../../store/useDrawerStore'
import { useNavigationStore } from '../../../store/navigationStore'
import { useQuickCaptureStore } from '../../../store/useQuickCaptureStore'
import { Checkbox } from '../../ui/Checkbox'
import { calculateFocusedTask, getTaskTemporalStatus } from '../../../lib/focusLogic'
import { localDateKey, localTime, parseInstant, tasksForToday } from '../../../lib/taskDates'

export interface FocusHeroCardProps {
  isPlaying?: boolean
  onTogglePlay?: () => void
  title?: string
  description?: string
  deadlineText?: string
  categoryTag?: string
  audioUrl?: string
  checklist?: ChecklistItem[]
  onComplete?: () => void
  onSummary?: () => void
}

export const FocusHeroCard: React.FC<FocusHeroCardProps> = ({
  title: propTitle,
  description: propDescription,
  deadlineText: propDeadLine,
  categoryTag: propCategoryTag,
  audioUrl: propAudioUrl,
  checklist: propChecklist,
  onComplete,
  isPlaying,
  onTogglePlay,
  onSummary,
}) => {
  const { items, setFocusedTask, toggleTask, updateItem } = useAppStore()
  const { openDrawer } = useDrawerStore()
  const setActiveTab = useNavigationStore((state) => state.setActiveTab)
  const openQuickCapture = useQuickCaptureStore((state) => state.openQuickCapture)
  const [isSwitchFocusOpen, setIsSwitchFocusOpen] = useState(false)
  const switchMenuRef = useRef<HTMLDivElement>(null)

  // Tick for periodic focus recalculation (every 30s)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  // Find current focused task using priority algorithm
  const focusedTask = useMemo(() => {
    return calculateFocusedTask(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tick])

  // Determine temporal status for visual badges
  const temporalStatus = useMemo(() => {
    if (!focusedTask) return null
    return getTaskTemporalStatus(focusedTask)
  }, [focusedTask, tick])

  const pendingTasks = useMemo(() => {
    return items.filter(
      (i) => i.type === 'task' && i.status !== 'completed' && i.status !== 'archived' && i.id !== focusedTask?.id
    )
  }, [items, focusedTask])

  // Derive display values from focusedTask if available, otherwise fallback to props
  const currentTitle = propTitle || focusedTask?.title || 'Нет задач в фокусе'
  const currentDescription = propDescription !== undefined ? propDescription : focusedTask?.description || ''
  const currentDeadline = useMemo(() => {
    if (propDeadLine) return propDeadLine
    if (!focusedTask) return 'Сегодня'
    const deadline = parseInstant(focusedTask.deadline)
    if (deadline) {
      const time = localTime(deadline)
      return localDateKey(deadline) === localDateKey()
        ? time
        : `${deadline.toLocaleDateString('ru-RU')} · ${time}`
    }
    if (focusedTask.dueDate) {
      const date = parseInstant(focusedTask.dueDate)
      const dateKey = date ? localDateKey(date) : focusedTask.dueDate.split('T')[0]
      const time = focusedTask.dueTime
      if (dateKey === localDateKey()) return time || 'Сегодня'
      const formattedDate = date?.toLocaleDateString('ru-RU') || dateKey
      return time ? `${formattedDate} · ${time}` : formattedDate
    }
    return 'Сегодня'
  }, [propDeadLine, focusedTask, tick])
  const currentCategory = propCategoryTag || focusedTask?.categoryTag || '#Фокус'
  const currentAudio = propAudioUrl !== undefined ? propAudioUrl : focusedTask?.audioUrl
  const currentChecklist = propChecklist || focusedTask?.checklist || []

  const checklist = currentChecklist
  const taskItems = items.filter((item) => item.type === 'task' && item.status !== 'archived')
  const explicitlyFocusedTasks = taskItems.filter((item) => item.isFocus || item.isFocused)
  const todayTasks = tasksForToday(items)
  const focusWorkCompleted = (
    explicitlyFocusedTasks.length > 0 && explicitlyFocusedTasks.every((item) => item.status === 'completed')
  ) || (
    todayTasks.length > 0 && todayTasks.every((item) => item.status === 'completed')
  ) || (
    taskItems.length > 0 && taskItems.every((item) => item.status === 'completed')
  )


  useEffect(() => {
    if (!isSwitchFocusOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (switchMenuRef.current && !switchMenuRef.current.contains(e.target as Node)) {
        setIsSwitchFocusOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSwitchFocusOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSwitchFocusOpen])

  const handleToggleSubtask = (subtaskId: string) => {
    const updated = checklist.map((item) =>
      item.id === subtaskId ? { ...item, isCompleted: !item.isCompleted } : item
    )
    if (focusedTask) {
      updateItem(focusedTask.id, { checklist: updated }).catch(() => {})
    }
  }

  const handleMainComplete = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#4edea3', '#d0bcff', '#4fc3f7'],
      })
    } catch {
      // ignore
    }

    if (focusedTask) {
      toggleTask(focusedTask.id).catch(() => {})
    }

    if (onComplete) {
      onComplete()
    }
  }

  if (!focusedTask) {
    return (
      <section
        data-testid="focus-hero-card"
        className="rounded-2xl bg-surface-container-low p-space-lg border border-outline-variant/30 text-on-surface"
      >
        <div className="flex items-start gap-3">
          <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-surface-container-high text-outline flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">{focusWorkCompleted ? 'check_circle' : 'center_focus_weak'}</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              {focusWorkCompleted ? 'Все задачи в фокусе выполнены!' : 'Нет задач в фокусе'}
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {pendingTasks.length > 0
                ? 'Выберите задачу из списка, чтобы сосредоточиться на ней.'
                : focusWorkCompleted
                  ? 'Отличная работа. Можно отдохнуть или добавить новую задачу.'
                  : 'Добавьте первую задачу, когда будете готовы приступить к работе.'}
            </p>
            <button type="button"
              onClick={() => pendingTasks.length > 0 ? setActiveTab('tasks') : openQuickCapture({ entityType: 'task' })}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 bg-surface-container-high text-on-surface text-label-md font-medium hover:bg-surface-container-highest transition-colors cursor-pointer">
              <span aria-hidden="true" className="material-symbols-outlined text-body-lg">{pendingTasks.length > 0 ? 'arrow_forward' : 'add'}</span>
              {pendingTasks.length > 0 ? 'Выбрать задачу' : 'Добавить задачу'}
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      data-testid="focus-hero-card"
      className="relative rounded-2xl bg-surface-container-low p-space-lg shadow-xl group border border-surface-container-high/40 hover:border-primary/40 transition-all glass-panel"
    >
      {/* Visual Accent Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-16 w-56 h-56 bg-primary-container/15 rounded-full blur-2xl"
        />
      </div>

      {/* Meta Header */}
      <div className="flex items-center justify-between gap-space-sm flex-wrap mb-space-md">
        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium leading-none select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span>В фокусе</span>
          </span>

          {/* Temporal status badge */}
          {temporalStatus === 'overdue' && (
            <span className="h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full bg-error/10 text-error border border-error/20 text-xs font-medium leading-none select-none animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
              <span>Просрочена</span>
            </span>
          )}
          {temporalStatus === 'current' && (
            <span className="h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-xs font-medium leading-none select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
              <span>Сейчас</span>
            </span>
          )}
          {/* Switch Focus Popover */}
          <div className="relative inline-flex items-center" ref={switchMenuRef}>
            <button
              type="button"
              onClick={() => setIsSwitchFocusOpen((prev) => !prev)}
              aria-label="Сменить фокус"
              aria-expanded={isSwitchFocusOpen}
              className="h-6 inline-flex items-center gap-1 px-2.5 rounded-full bg-surface-container-high/80 hover:bg-surface-container-highest text-outline hover:text-on-surface text-xs font-medium transition-colors cursor-pointer border border-outline-variant/30 leading-none select-none"
            >
              <span
                className="material-symbols-outlined !text-[13px] leading-none shrink-0"
                style={{ fontSize: '13px', lineHeight: 1 }}
              >
                sync_alt
              </span>
              <span>Сменить фокус</span>
            </button>

            {isSwitchFocusOpen && (
              <div
                role="menu"
                aria-label="Выбрать задачу в фокус"
                className="absolute left-0 top-full mt-2 w-72 max-h-64 overflow-y-auto rounded-xl bg-surface-container-high/95 border border-outline-variant/40 shadow-2xl backdrop-blur-xl p-1 z-40 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-outline border-b border-outline-variant/20">
                  Выберите задачу дня
                </div>
                {pendingTasks.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-outline">
                    Нет других активных задач
                  </div>
                ) : (
                  pendingTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setFocusedTask(t.id)
                        setIsSwitchFocusOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-container shrink-0">
                        {t.categoryTag}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <span className="h-6 inline-flex items-center px-2.5 rounded-full bg-surface-container-high/70 text-on-surface-variant text-xs font-medium leading-none select-none">
            {currentCategory}
          </span>

        </div>

        <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
          {currentAudio && (
            <div className="flex items-center gap-1 bg-surface-container-high/60 px-2 py-0.5 rounded-full">
              <span className="text-label-sm text-outline">Аудио</span>
              <MiniAudioPlayer audioUrl={currentAudio} />
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-label-lg text-outline">schedule</span>
            <span>
              Дедлайн: <strong className="text-on-surface font-semibold">{currentDeadline}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Task Title & Description */}
      <div 
        className={`mb-space-md ${focusedTask ? 'cursor-pointer group/title' : ''}`}
        onClick={() => focusedTask && openDrawer(focusedTask.id)}
      >
        <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-snug font-semibold group-hover/title:text-primary transition-colors">
          {currentTitle}
        </h2>
        {currentDescription && (
          <p className="font-body-md text-body-md text-outline mt-1 line-clamp-2">
            {currentDescription}
          </p>
        )}
      </div>

      {/* Checklist / Subtasks Section */}
      {checklist.length > 0 && (
        <div className="my-3 space-y-2 border-t border-b border-surface-container-high/30 py-3">
          <div className="text-xs font-semibold text-outline uppercase tracking-wider">
            Подзадачи
          </div>
          <div className="space-y-1.5">
            {checklist.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-2.5 cursor-pointer group text-sm select-none"
                onClick={() => handleToggleSubtask(sub.id)}
              >
                <Checkbox
                  checked={sub.isCompleted}
                  onChange={() => handleToggleSubtask(sub.id)}
                  size="sm"
                  ariaLabel={`Отметить подзадачу: ${sub.text}`}
                />
                <span
                  className={`transition-all text-body-sm ${
                    sub.isCompleted
                      ? 'line-through text-outline/75'
                      : 'text-on-surface group-hover:text-primary'
                  }`}
                >
                  {sub.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-space-sm pt-2 flex-wrap">
        <div className="flex items-center gap-2">
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Приостановить' : 'Воспроизвести'}
              className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-highest text-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
          )}
          {onSummary && (
            <button
              type="button"
              onClick={onSummary}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface font-label-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-body-md text-secondary">auto_awesome</span>
              <span className="hidden sm:inline">AI Сводка</span>
            </button>
          )}
        </div>

        {/* Complete Task Button */}
        {focusedTask && (
          <button
            type="button"
            onClick={handleMainComplete}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md font-medium transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-body-md">check</span>
            <span>Завершить задачу</span>
          </button>
        )}
      </div>
    </section>
  )
}
