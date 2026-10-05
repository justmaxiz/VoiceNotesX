import React, { useState, useRef, useEffect } from 'react'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { useAppStore } from '../../store/useAppStore'
import { useNavigationStore } from '../../store/navigationStore'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { LiveWaveform } from '../audio/LiveWaveform'
import { structureVoiceNote } from '../../lib/geminiStructuring'
import { Item } from '../../types/item'

export interface QuickCaptureWidgetProps {
  onSave?: (text: string) => void
}

export const QuickCaptureWidget: React.FC<QuickCaptureWidgetProps> = ({ onSave }) => {
  const {
    isOpen,
    entityType,
    targetColumn,
    text: storeText,
    setEntityType,
    setText: setStoreText,
    closeQuickCapture,
  } = useQuickCaptureStore()

  const [localText, setLocalText] = useState(storeText)
  const [justSaved, setJustSaved] = useState(false)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { addItem } = useAppStore()
  const { setRecordingModalOpen } = useNavigationStore()
  const { isRecording, stream, startRecording, stopRecording } = useAudioRecorder()
  const {
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  // Sync storeText to localText if changed externally
  useEffect(() => {
    if (storeText !== localText) {
      setLocalText(storeText)
    }
  }, [storeText])

  // Sync live STT transcript into local input during recording
  useEffect(() => {
    if (isRecording) {
      const combined = `${transcript} ${interimTranscript}`.trim()
      if (combined) {
        setLocalText(combined)
        setStoreText(combined)
      }
    }
  }, [isRecording, transcript, interimTranscript, setStoreText])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleToggleRecord = async () => {
    setRecordingModalOpen(true)
    if (isRecording) {
      stopListening()
      const blob = await stopRecording()
      let audioUrl: string | undefined
      if (blob) {
        audioUrl = URL.createObjectURL(blob)
      }
      if (localText.trim()) {
        saveItem(localText.trim(), false, audioUrl)
      }
      resetTranscript()
    } else {
      try {
        resetTranscript()
        await startRecording()
        startListening()
        if (inputRef.current) {
          inputRef.current.focus()
        }
      } catch {
        // Fallback
      }
    }
  }

  const saveItem = (
    textToSave: string,
    useAI = false,
    recordedAudioUrl?: string
  ) => {
    const trimmed = textToSave.trim()
    if (!trimmed) return

    // Immediately trigger synchronous UI update & onSave callback
    if (onSave) {
      onSave(trimmed)
    }

    setLocalText('')
    setStoreText('')
    setJustSaved(true)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setJustSaved(false)
      timerRef.current = null
    }, 2000)

    // Background persistence
    if (useAI) {
      setIsProcessingAI(true)
      structureVoiceNote(trimmed)
        .then((structured) => {
          const newItem: Item = {
            id: 'item-' + Date.now(),
            type: structured.entity_type,
            title: structured.title,
            description: structured.description,
            transcriptText: trimmed,
            status:
              targetColumn === 'completed'
                ? 'completed'
                : targetColumn === 'in_progress'
                ? 'in_progress'
                : targetColumn === 'focus'
                ? 'todo'
                : 'todo',
            isFocus: targetColumn === 'focus' || structured.priority === 'high',
            priority: structured.priority,
            dueDate: structured.due_date || undefined,
            categoryTag: structured.category_tag,
            audioUrl: recordedAudioUrl,
            checklist: structured.checklist?.map((text, idx) => ({
              id: `chk-${Date.now()}-${idx}`,
              text,
              isCompleted: false,
              sortOrder: idx + 1,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          return addItem(newItem)
        })
        .finally(() => {
          setIsProcessingAI(false)
        })
    } else {
      const newItem: Item = {
        id: 'item-' + Date.now(),
        type: entityType,
        title: trimmed,
        description: '',
        status:
          targetColumn === 'completed'
            ? 'completed'
            : targetColumn === 'in_progress'
            ? 'in_progress'
            : targetColumn === 'focus'
            ? 'todo'
            : 'todo',
        isFocus: targetColumn === 'focus',
        priority: 'medium',
        categoryTag: entityType === 'task' ? '#Работа' : '#Заметки',
        audioUrl: recordedAudioUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addItem(newItem).catch(() => {})
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveItem(localText, false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      saveItem(localText, true)
    } else if (e.key === 'Escape') {
      if (isRecording) {
        handleToggleRecord()
      } else {
        closeQuickCapture()
      }
    }
  }

  if (!isOpen) return null

  return (
    <aside
      aria-label="Быстрый ввод мыслей и задач"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-[580px] md:w-[720px] pointer-events-auto"
    >
      <form
        onSubmit={handleSubmit}
        className={`glass-panel rounded-2xl px-space-md py-2.5 shadow-2xl flex items-center gap-2 sm:gap-space-sm bg-surface-container-high/90 border backdrop-blur-2xl transition-all ${
          isRecording
            ? 'border-secondary ring-2 ring-secondary/50 shadow-[0_0_25px_rgba(78,222,163,0.35)]'
            : 'border-surface-container-highest/60 hover:border-primary/50'
        }`}
      >
        {/* Screen reader announcement */}
        <span className="sr-only" aria-live="polite">
          {justSaved ? 'Мысль сохранена в заметки' : ''}
        </span>

        {/* Entity Switcher (Задача / Заметка) */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-container text-xs shrink-0 select-none border border-outline-variant/20">
          <button
            type="button"
            onClick={() => setEntityType('task')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              entityType === 'task'
                ? 'bg-primary text-on-primary font-medium shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            Задача
          </button>
          <button
            type="button"
            onClick={() => setEntityType('note')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              entityType === 'note'
                ? 'bg-secondary text-on-secondary font-medium shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            Заметка
          </button>
        </div>

        {/* Live Waveform when recording */}
        {isRecording && (
          <div className="shrink-0 flex items-center">
            <LiveWaveform isRecording={isRecording} stream={stream} width={100} height={28} />
          </div>
        )}

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={localText}
          onChange={(e) => {
            setLocalText(e.target.value)
            setStoreText(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            justSaved
              ? 'Сохранено в заметки!'
              : isRecording
              ? 'Слушаю... Говорите...'
              : isProcessingAI
              ? 'AI структурирует задачу...'
              : 'Быстрая мысль или задача... (Enter — сохранить, ⌘Enter — с AI)'
          }
          aria-label="Поле быстрого ввода мысли или задачи"
          className="flex-1 bg-transparent py-1 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none min-w-0"
        />

        {/* Actions Group */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Record Button */}
          <button
            type="button"
            onClick={handleToggleRecord}
            aria-label="Начать голосовую запись"
            title={isRecording ? 'Остановить запись' : 'Голосовая запись (Space)'}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              isRecording
                ? 'bg-secondary text-on-secondary shadow-md scale-105 animate-pulse'
                : 'bg-surface-container hover:bg-surface-container-highest text-secondary hover:scale-105 active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-body-lg">
              {isRecording ? 'stop' : 'mic'}
            </span>
          </button>

          {/* Save / Add Button */}
          <button
            type="submit"
            disabled={!localText.trim() || isProcessingAI}
            aria-label="Сохранить мысль"
            className={`px-3 sm:px-space-md py-2 rounded-xl font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
              localText.trim() && !isProcessingAI
                ? 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container glow-violet shadow-sm'
                : 'bg-surface-container text-outline opacity-60 cursor-not-allowed'
            }`}
          >
            {isProcessingAI ? (
              <span className="material-symbols-outlined text-body-md animate-spin">sync</span>
            ) : (
              <span className="hidden sm:inline">Сохранить</span>
            )}
            <span className="material-symbols-outlined text-body-md sm:hidden">send</span>
          </button>
        </div>
      </form>
    </aside>
  )
}
