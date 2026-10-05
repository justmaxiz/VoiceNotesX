import React, { useState, useRef, useEffect } from 'react'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { useAppStore } from '../../store/useAppStore'
import { useNavigationStore } from '../../store/navigationStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { LiveWaveform } from '../audio/LiveWaveform'
import { structureVoiceNote } from '../../lib/geminiStructuring'
import { Item } from '../../types/item'

export interface QuickCaptureWidgetProps {
  onSave?: (text: string) => void
}

const AVAILABLE_TAGS = ['#Работа', '#Личное', '#Разработка', '#Дизайн', '#Аналитика', '#Финансы']

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
  const [selectedTag, setSelectedTag] = useState('#Работа')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [savedNotification, setSavedNotification] = useState<{ id: string; title: string } | null>(null)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const widgetRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tagMenuRef = useRef<HTMLDivElement>(null)

  const { addItem } = useAppStore()
  const { setRecordingModalOpen } = useNavigationStore()
  const { openDrawer } = useDrawerStore()
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close tag dropdown on click outside
  useEffect(() => {
    if (!isTagDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isTagDropdownOpen])

  // Collapse widget on click outside
  useEffect(() => {
    if (!isExpanded) return
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

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

    if (onSave) {
      onSave(trimmed)
    }

    const createdId = 'item-' + Date.now()
    setLocalText('')
    setStoreText('')
    setIsExpanded(false)
    setSavedNotification({ id: createdId, title: trimmed })

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setSavedNotification(null)
      timerRef.current = null
    }, 2000)

    // Background persistence
    if (useAI) {
      setIsProcessingAI(true)
      structureVoiceNote(trimmed)
        .then((structured) => {
          const newItem: Item = {
            id: createdId,
            type: structured.entity_type,
            title: structured.title,
            description: structured.description,
            transcriptText: trimmed,
            status:
              targetColumn === 'completed'
                ? 'completed'
                : targetColumn === 'in_progress'
                ? 'in_progress'
                : 'todo',
            isFocus: structured.priority === 'high',
            isFocused: structured.priority === 'high',
            priority: structured.priority,
            dueDate: structured.due_date || undefined,
            categoryTag: structured.category_tag || selectedTag,
            tags: [structured.category_tag || selectedTag],
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
        id: createdId,
        type: entityType,
        title: trimmed,
        description: '',
        status:
          targetColumn === 'completed'
            ? 'completed'
            : targetColumn === 'in_progress'
            ? 'in_progress'
            : 'todo',
        isFocus: false,
        isFocused: false,
        priority: 'medium',
        categoryTag: selectedTag,
        tags: [selectedTag],
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
      } else if (isExpanded) {
        setIsExpanded(false)
        inputRef.current?.blur()
      } else {
        closeQuickCapture()
      }
    }
  }

  if (!isOpen) return null

  return (
    <aside
      ref={widgetRef}
      aria-label="Быстрый ввод мыслей и задач"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExpanded
          ? 'w-[92%] sm:w-[640px] md:w-[740px]'
          : 'w-[92%] sm:w-[420px]'
      }`}
    >
      {/* Toast Notification with Open in Drawer action */}
      {savedNotification && (
        <div
          role="status"
          className="mb-2 py-1.5 px-4 rounded-xl bg-surface-container-high/95 border border-secondary/40 shadow-xl backdrop-blur-xl flex items-center justify-between text-xs text-on-surface animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span className="truncate">
              {entityType === 'task' ? 'Задача' : 'Заметка'} сохранена: «{savedNotification.title}»
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              openDrawer(savedNotification.id)
              setSavedNotification(null)
            }}
            className="text-primary hover:underline font-semibold ml-3 shrink-0 cursor-pointer"
          >
            Открыть детально
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onClick={() => setIsExpanded(true)}
        className={`glass-panel rounded-2xl px-space-md py-2.5 shadow-2xl flex items-center gap-2 sm:gap-space-sm bg-surface-container-high/90 border backdrop-blur-2xl transition-all ${
          isRecording
            ? 'border-secondary ring-2 ring-secondary/50 shadow-[0_0_25px_rgba(78,222,163,0.35)]'
            : 'border-surface-container-highest/60 hover:border-primary/50'
        }`}
      >
        {/* Screen reader announcement */}
        <span className="sr-only" aria-live="polite">
          {savedNotification ? 'Мысль сохранена в заметки' : ''}
        </span>

        {isExpanded && (
          <div className="flex items-center gap-2 shrink-0 animate-in fade-in zoom-in-95 duration-200 hidden sm:flex">
            {/* Entity Switcher (Задача / Заметка) */}
            <div className="flex items-center p-0.5 rounded-lg bg-surface-container text-xs select-none border border-outline-variant/20" role="group" aria-label="Тип записи">
              <button
                type="button"
                aria-pressed={entityType === 'task'}
                onClick={() => setEntityType('task')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  entityType === 'task'
                    ? 'bg-primary text-on-primary font-medium shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                Задача
              </button>
              <button
                type="button"
                aria-pressed={entityType === 'note'}
                onClick={() => setEntityType('note')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  entityType === 'note'
                    ? 'bg-primary text-on-primary font-medium shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                Заметка
              </button>
            </div>

            {/* Tag Selector Dropdown */}
            <div className="relative shrink-0" ref={tagMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsTagDropdownOpen((prev) => !prev)
                }}
                className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-highest text-outline hover:text-on-surface text-xs font-medium border border-outline-variant/20 flex items-center gap-1 cursor-pointer transition-colors h-7"
              >
                <span>{selectedTag}</span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>

              {isTagDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-36 rounded-xl bg-surface-container-high border border-outline-variant/30 shadow-xl py-1 z-50 flex flex-col">
                  {AVAILABLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTag(tag)
                        setIsTagDropdownOpen(false)
                      }}
                      className={`px-3 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                        selectedTag === tag
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
          onFocus={() => setIsExpanded(true)}
          onChange={(e) => {
            setLocalText(e.target.value)
            setStoreText(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            savedNotification
              ? 'Сохранено в заметки!'
              : isRecording
              ? 'Слушаю... Говорите...'
              : isProcessingAI
              ? 'AI структурирует задачу...'
              : 'Быстрая мысль или задача... (Enter — сохранить, ⌘Enter — с AI, / или C)'
          }
          aria-label="Поле быстрого ввода мысли или задачи"
          className="flex-1 bg-transparent py-1 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none min-w-0"
        />

        {/* Actions Group */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Record Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleToggleRecord()
            }}
            aria-label="Начать голосовую запись"
            title={isRecording ? 'Остановить запись' : 'Голосовая запись (Space)'}
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              isRecording
                ? 'bg-error text-on-error shadow-md scale-105 animate-pulse'
                : 'bg-surface-container hover:bg-surface-container-highest text-primary hover:scale-105 active:scale-95'
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
            onClick={(e) => e.stopPropagation()}
            aria-label="Сохранить мысль"
            className={`p-2 rounded-full font-label-md text-label-md transition-all flex items-center justify-center cursor-pointer ${
              localText.trim() && !isProcessingAI
                ? 'bg-primary text-on-primary hover:bg-primary/90 shadow-sm hover:scale-105 active:scale-95'
                : 'bg-surface-container text-outline opacity-60 cursor-not-allowed'
            }`}
          >
            {isProcessingAI ? (
              <span className="material-symbols-outlined text-body-md animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-body-md">send</span>
            )}
          </button>
        </div>
      </form>
    </aside>
  )
}
