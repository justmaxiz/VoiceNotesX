import React, { useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'

export interface BulkActionToolbarProps {
  onDone?: () => void
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({ onDone }) => {
  const {
    selectedTaskIds,
    isSelectMode,
    clearSelectedTasks,
    batchCompleteTasks,
    batchDeleteTasks,
    batchRescheduleTasks,
  } = useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectMode) {
        clearSelectedTasks()
        if (onDone) onDone()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelectMode, clearSelectedTasks, onDone])

  if (!isSelectMode || selectedTaskIds.length === 0) return null

  const count = selectedTaskIds.length
  const todayStr = new Date().toISOString().split('T')[0]

  const handleComplete = async () => {
    await batchCompleteTasks()
    if (onDone) onDone()
  }

  const handleDelete = async () => {
    await batchDeleteTasks()
    if (onDone) onDone()
  }

  const handleRescheduleToday = async () => {
    await batchRescheduleTasks(todayStr)
    if (onDone) onDone()
  }

  return (
    <div
      role="toolbar"
      aria-label="Панель массовых действий с задачами"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-surface-container-high/95 border border-primary/40 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 text-on-surface"
    >
      <div className="flex items-center gap-2 border-r border-outline-variant/30 pr-3">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-semibold whitespace-nowrap">
          Выбрано: {count} {count === 1 ? 'задача' : count < 5 ? 'задачи' : 'задач'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={handleComplete}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary-container text-on-secondary hover:opacity-90 text-xs font-semibold transition-all cursor-pointer shadow-xs glow-emerald"
        >
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>Выполнить</span>
        </button>

        <button
          type="button"
          onClick={handleRescheduleToday}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-primary text-xs font-medium transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">today</span>
          <span>На сегодня</span>
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-error-container/40 text-error text-xs font-medium transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">delete</span>
          <span>Удалить</span>
        </button>

        <button
          type="button"
          onClick={() => {
            clearSelectedTasks()
            if (onDone) onDone()
          }}
          title="Снять выделение (Esc)"
          aria-label="Снять выделение"
          className="p-1.5 rounded-xl hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  )
}
