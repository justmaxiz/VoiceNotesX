import React, { useState, useRef, useEffect } from 'react'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { useAppStore } from '../../store/useAppStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { useCaptureAIStore } from '../../store/useCaptureAIStore'
import { Item } from '../../types/item'

import { useSettingsStore } from '../../store/useSettingsStore'
import { useSpaceRecordShortcut } from '../../hooks/useSpaceRecordShortcut'

export interface QuickCaptureWidgetProps {
  onSave?: (text: string) => void
}

const AVAILABLE_TAGS = ['#Работа', '#Личное', '#Разработка', '#Дизайн', '#Аналитика', '#Финансы']

export const QuickCaptureWidget: React.FC<QuickCaptureWidgetProps> = ({ onSave }) => {
  const {
    isOpen,

    targetColumn,
    dueDate,
    dueTime,
    text: storeText,

    setText: setStoreText,
    closeQuickCapture,
  } = useQuickCaptureStore()

  const [localText, setLocalText] = useState(storeText)
  const [selectedTag, setSelectedTag] = useState('#Работа')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [savedNotification, setSavedNotification] = useState<{ id: string; title: string } | null>(null)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const capturePending = useCaptureAIStore(state => state.status === 'pending')
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [isFinishingDictation, setIsFinishingDictation] = useState(false)
  const dictationDraftRef = useRef('')
  const dictationActiveRef = useRef(false)
  const savingRef = useRef(false)
  const recordingRef = useRef(false)
  const { aiMode, structuringStyle, language } = useSettingsStore()
  const [isExpanded, setIsExpanded] = useState(false)

  const widgetRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tagMenuRef = useRef<HTMLDivElement>(null)

  const { addItem } = useAppStore()
  const { openDrawer } = useDrawerStore()
  const {
    isListening: isRecording,
    isSupported,
    error: speechError,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
  } = useSpeechRecognition(language)

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
    if (dictationActiveRef.current) {
      const combined = [dictationDraftRef.current, transcript, interimTranscript].filter(Boolean).join(' ').trim()
      setLocalText(combined)
      setStoreText(combined)
    }
  }, [isRecording, transcript, interimTranscript, setStoreText])

  useEffect(() => {
    if (speechError) setCaptureError(speechError)
  }, [speechError])

  useEffect(() => {
    if (!isOpen) {
      dictationActiveRef.current = false
      abortListening()
    }
  }, [isOpen, abortListening])

  useEffect(() => {
    return () => {
      dictationActiveRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  useSpaceRecordShortcut({
    onToggle: () => handleToggleRecord(),
    enabled: isOpen && !isFinishingDictation && !isProcessingAI && !capturePending,
  })

  const handleToggleRecord = async () => {
    if (recordingRef.current || savingRef.current || capturePending || isFinishingDictation) return
    recordingRef.current = true
    setCaptureError(null)
    try {
      if (isRecording) {
        dictationActiveRef.current = false
        abortListening()
        setLocalText(dictationDraftRef.current)
        setStoreText(dictationDraftRef.current)
        resetTranscript()
      } else {
        if (!isSupported) throw new Error('Распознавание речи не поддерживается этим браузером. Откройте сайт в Chrome или Edge.')
        dictationDraftRef.current = localText.trim()
        dictationActiveRef.current = true
        resetTranscript()
        startListening()
        setIsExpanded(true)
        inputRef.current?.focus()
      }
    } catch (error) {
      setCaptureError((error as Error).message)
    } finally { recordingRef.current = false }
  }

  const saveItem = async (textToSave: string, useAI = true) => {
    const trimmed = textToSave.trim()
    if (!trimmed || savingRef.current || capturePending) return
    savingRef.current = true
    setIsProcessingAI(true)
    setCaptureError(null)
    try {
      const previousDraft = useCaptureAIStore.getState().draft
      const now = new Date().toISOString()
      const createdId = previousDraft?.transcriptText === trimmed ? previousDraft.id : crypto.randomUUID()
      const newItem: Item = {
        id: createdId, type: 'note', title: trimmed.slice(0, 500), description: trimmed,
        transcriptText: trimmed, status: targetColumn === 'completed' ? 'completed' : targetColumn === 'in_progress' ? 'in_progress' : 'todo', priority: 'medium',
        isFocus: false, isFocused: false, categoryTag: selectedTag, tags: [selectedTag],
        ...(dueDate ? { dueDate, dueTime, isAllDay: !dueTime } : {}),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: now, updatedAt: now,
      }
      if (useAI) await useCaptureAIStore.getState().start(newItem, { mode: aiMode, style: structuringStyle })
      else await addItem(newItem)
      setLocalText('')
      setStoreText('')
      useQuickCaptureStore.setState({ dueDate: null, dueTime: null, targetColumn: null })
      setIsExpanded(false)
      setSavedNotification({ id: createdId, title: newItem.title })
      onSave?.(trimmed)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { setSavedNotification(null); timerRef.current = null }, 2000)
    } catch (error) {
      // Keep the text draft available for retry.
      setCaptureError(`Не удалось сохранить: ${(error as Error).message}`)
    } finally {
      savingRef.current = false
      setIsProcessingAI(false)
    }
  }

  const submitCapture = async () => {
    if (isFinishingDictation || recordingRef.current || savingRef.current || capturePending) return
    if (!isRecording) return saveItem(localText, true)
    recordingRef.current = true
    setIsFinishingDictation(true)
    try {
      const spoken = await stopListening()
      if (!dictationActiveRef.current) return
      dictationActiveRef.current = false
      const text = [dictationDraftRef.current, spoken].filter(Boolean).join(' ').trim()
      setLocalText(text)
      setStoreText(text)
      resetTranscript()
      if (!text) { setCaptureError('Речь не распознана. Повторите диктовку.'); return }
      await saveItem(text, true)
    } catch (error) {
      dictationActiveRef.current = false
      setCaptureError(error instanceof Error ? error.message : 'Не удалось завершить диктовку.')
    } finally { recordingRef.current = false; setIsFinishingDictation(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void submitCapture()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void submitCapture()
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
      {captureError && <p role="alert" className="mb-2 rounded-xl bg-error-container text-on-error-container p-3 text-xs">{captureError}</p>}
      {/* Toast Notification with Open in Drawer action */}
      {savedNotification && (
        <div
          role="status"
          className="mb-2 py-1.5 px-4 rounded-xl bg-surface-container-high/95 border border-secondary/40 shadow-xl backdrop-blur-xl flex items-center justify-between text-xs text-on-surface animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span className="truncate">
              Заметка сохранена: «{savedNotification.title}»
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
            <span className="material-symbols-outlined text-secondary animate-pulse" aria-hidden="true">graphic_eq</span>
          </div>
        )}

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={localText}
          readOnly={isRecording || isFinishingDictation || isProcessingAI || capturePending}
          onFocus={() => setIsExpanded(true)}
          onChange={(e) => {
            if (isRecording || isFinishingDictation || isProcessingAI || capturePending) return
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
              : 'Мысль или задача… (Enter — обработать с AI)'
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
            disabled={isFinishingDictation || isProcessingAI || capturePending}
            aria-label={isRecording ? 'Отменить диктовку' : 'Начать голосовую запись'}
            title={isRecording ? 'Отменить диктовку (Escape)' : 'Голосовая запись (Space)'}
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              isRecording
                ? 'bg-error text-on-error shadow-md scale-105 animate-pulse'
                : 'bg-surface-container hover:bg-surface-container-highest text-primary hover:scale-105 active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-body-lg">
              {isRecording ? 'close' : 'mic'}
            </span>
          </button>

          {/* Save / Add Button */}
          <button
            type="submit"
            disabled={(!localText.trim() && !isRecording) || isProcessingAI || capturePending || isFinishingDictation}
            onClick={(e) => e.stopPropagation()}
            aria-label={isRecording ? 'Отправить диктовку' : 'Сохранить мысль'}
            className={`p-2 rounded-full font-label-md text-label-md transition-all flex items-center justify-center cursor-pointer ${
              (localText.trim() || isRecording) && !isProcessingAI && !isFinishingDictation
                ? 'bg-primary text-on-primary hover:bg-primary/90 shadow-sm hover:scale-105 active:scale-95'
                : 'bg-surface-container text-outline opacity-60 cursor-not-allowed'
            }`}
          >
            {isProcessingAI || isFinishingDictation ? (
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
