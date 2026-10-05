import React, { useState, useRef, useEffect } from 'react'
import { useNavigationStore } from '../../store/navigationStore'

export interface QuickCaptureWidgetProps {
  onSave?: (text: string) => void
}

export const QuickCaptureWidget: React.FC<QuickCaptureWidgetProps> = ({ onSave }) => {
  const [text, setText] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setRecordingModalOpen } = useNavigationStore()

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    if (onSave) {
      onSave(trimmed)
    }

    setText('')
    setJustSaved(true)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setJustSaved(false)
      timerRef.current = null
    }, 2000)
  }

  return (
    <aside
      aria-label="Быстрый ввод мыслей и задач"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-[560px] md:w-[680px] pointer-events-auto"
    >
      <form
        onSubmit={handleSubmit}
        className="glass-panel border-glow rounded-2xl px-space-md py-2.5 shadow-2xl flex items-center gap-space-sm bg-surface-container-high/90 border border-surface-container-highest/60 backdrop-blur-2xl transition-all"
      >
        {/* Screen reader announcement */}
        <span className="sr-only" aria-live="polite">
          {justSaved ? 'Мысль сохранена в заметки' : ''}
        </span>

        {/* Leading AI / Note Icon */}
        <div className="flex items-center justify-center text-primary shrink-0 select-none">
          <span className="material-symbols-outlined text-body-lg">
            {justSaved ? 'check_circle' : 'auto_awesome'}
          </span>
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={justSaved ? 'Сохранено в заметки!' : 'Быстрая мысль или задача... (Enter — сохранить)'}
          aria-label="Поле быстрого ввода мысли или задачи"
          className="flex-1 bg-transparent py-1 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none min-w-0"
        />

        {/* Actions Group */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Record Button */}
          <button
            type="button"
            onClick={() => setRecordingModalOpen(true)}
            aria-label="Начать голосовую запись"
            title="Голосовая запись (Space)"
            className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-secondary transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-body-lg">mic</span>
          </button>

          {/* Save / Add Button */}
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Сохранить мысль"
            className={`px-space-md py-2 rounded-xl font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              text.trim()
                ? 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container glow-violet shadow-sm'
                : 'bg-surface-container text-outline opacity-60 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline">Сохранить</span>
            <span className="material-symbols-outlined text-body-md sm:hidden">send</span>
          </button>
        </div>
      </form>
    </aside>
  )
}
