import React, { useEffect } from 'react'
import { useNavigationStore } from '../../store/navigationStore'

export const RecordingModal: React.FC = () => {
  const { isRecordingModalOpen, setRecordingModalOpen } = useNavigationStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecordingModalOpen) {
        setRecordingModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecordingModalOpen, setRecordingModalOpen])

  if (!isRecordingModalOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Модальное окно записи аудио"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-space-md"
      onClick={() => setRecordingModalOpen(false)}
    >
      <div
        className="glass-panel rounded-2xl p-space-xl max-w-md w-full flex flex-col items-center gap-space-md text-center shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center glow-violet animate-pulse">
          <span className="material-symbols-outlined text-3xl">mic</span>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Быстрая голосовая запись
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Говорите свободно — звук будет автоматически транскрибирован и структурирован в задачу.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span>Микрофон готов к приему</span>
        </div>

        <div className="flex items-center gap-space-sm w-full mt-space-xs">
          <button
            type="button"
            onClick={() => setRecordingModalOpen(false)}
            className="flex-1 py-2.5 px-space-md rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all cursor-pointer"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={() => setRecordingModalOpen(false)}
            className="flex-1 py-2.5 px-space-md rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all shadow-[0_0_20px_-3px_rgba(160,120,255,0.4)] cursor-pointer"
          >
            Сохранить заметку
          </button>
        </div>
      </div>
    </div>
  )
}
