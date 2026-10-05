import React, { useState } from 'react'
import { TaskItemData } from '../../../types/item'

export interface QuickInputBarProps {
  onAddTask: (task: TaskItemData) => void
  onVoiceRecordClick?: () => void
}

/**
 * @deprecated Replaced by global unified QuickCaptureWidget (TASK-40).
 */
export const QuickInputBar: React.FC<QuickInputBarProps> = ({
  onAddTask,
  onVoiceRecordClick,
}) => {
  const [quickInput, setQuickInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    const randomSuffix = Math.random().toString(36).slice(2, 7)
    const newTask: TaskItemData = {
      id: `t-${Date.now()}-${randomSuffix}`,
      title: quickInput.trim(),
      category: '#Заметка',
      categoryClass: 'text-secondary',
      time: 'Сегодня',
      isCompleted: false,
    }
    onAddTask(newTask)
    setQuickInput('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-2xl bg-surface-container-high/90 backdrop-blur-xl p-space-sm shadow-xl flex items-center gap-space-sm border border-surface-container-highest/50"
    >
      <div className="pl-space-sm flex items-center text-primary">
        <span className="material-symbols-outlined">auto_awesome</span>
      </div>
      <input
        type="text"
        value={quickInput}
        onChange={(e) => setQuickInput(e.target.value)}
        placeholder="Быстрая мысль или задача... (Enter — сохранить, зажмите Пробел для аудио)"
        className="flex-1 bg-transparent py-2 px-space-xs font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
      />
      <div className="flex items-center gap-space-xs pr-space-xs">
        <button
          type="button"
          onClick={onVoiceRecordClick}
          aria-label="Записать голосовую мысль"
          title="Записать мысль"
          className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-secondary transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">mic</span>
        </button>
        <button
          type="submit"
          className="px-space-md py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all shadow-sm cursor-pointer"
        >
          <span>Добавить</span>
        </button>
      </div>
    </form>
  )
}
