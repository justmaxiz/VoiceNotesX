import { useState, useRef, useCallback, useEffect } from 'react'

export interface SpeechRecognitionHook {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useSpeechRecognition(lang = 'ru-RU'): SpeechRecognitionHook {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    )

  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    setIsListening(false)
    setInterimTranscript('')
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const startListening = useCallback(() => {
    setError(null)
    if (!isSupported) {
      setError('Web Speech API не поддерживается в данном браузере')
      return
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionClass()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onresult = (event: any) => {
        let finalChunk = ''
        let interimChunk = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0]?.transcript || ''
          if (result.isFinal) {
            finalChunk += text + ' '
          } else {
            interimChunk += text
          }
        }

        if (finalChunk) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()))
        }
        setInterimTranscript(interimChunk)
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // ignore silence
          return
        }
        setError(event.error || 'Ошибка распознавания речи')
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isListeningRef.current = false
          setIsListening(false)
        }
      }

      recognition.onend = () => {
        // Auto-restart continuous recognition if listening flag is still true
        if (isListeningRef.current) {
          try {
            recognition.start()
          } catch {
            isListeningRef.current = false
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
    }

    isListeningRef.current = true
    setIsListening(true)

    try {
      recognitionRef.current.start()
    } catch {
      // might already be started
    }
  }, [isSupported, lang])

  useEffect(() => {
    return () => {
      isListeningRef.current = false
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }
    }
  }, [])

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
