import { useState, useRef, useCallback, useEffect } from 'react'
import { useLiveDictation } from './useLiveDictation'

export interface SpeechRecognitionHook {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => Promise<string>
  abortListening: () => void
  resetTranscript: () => void
}

export function useSpeechRecognition(lang = 'ru-RU'): SpeechRecognitionHook {
  const live = useLiveDictation(lang)
  const browser = useBrowserSpeechRecognition(lang)
  return live.isSupported ? live : browser
}

function useBrowserSpeechRecognition(lang: string): SpeechRecognitionHook {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const listeningRef = useRef(false)
  const finalRef = useRef('')
  const interimRef = useRef('')
  const finishingRef = useRef<((text: string) => void) | null>(null)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const complete = useCallback(() => {
    if (finishTimer.current) clearTimeout(finishTimer.current)
    finishTimer.current = null
    const text = `${finalRef.current} ${interimRef.current}`.trim()
    const resolve = finishingRef.current
    finishingRef.current = null
    setIsListening(false)
    resolve?.(text)
  }, [])

  const abortListening = useCallback(() => {
    listeningRef.current = false
    const recognition = recognitionRef.current
    recognitionRef.current = null // Ignore late results from a cancelled session.
    recognition?.abort()
    complete()
  }, [complete])

  const resetTranscript = useCallback(() => {
    finalRef.current = ''
    interimRef.current = ''
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const stopListening = useCallback((): Promise<string> => {
    listeningRef.current = false
    if (!recognitionRef.current) return Promise.resolve(`${finalRef.current} ${interimRef.current}`.trim())
    return new Promise(resolve => {
      finishingRef.current = resolve
      // Some browsers do not emit onend after stop. Keep the last visible words.
      finishTimer.current = setTimeout(() => {
        const recognition = recognitionRef.current
        recognitionRef.current = null
        recognition?.abort()
        complete()
      }, 1500)
      try { recognitionRef.current.stop() } catch { complete() }
    })
  }, [complete])

  const startListening = useCallback(() => {
    if (listeningRef.current || finishingRef.current) return
    setError(null)
    if (!isSupported) {
      setError('Распознавание речи не поддерживается этим браузером. Откройте сайт в Chrome или Edge.')
      return
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang === 'auto' ? navigator.language : lang
    let prefix = finalRef.current
    recognition.onresult = (event: any) => {
      if (recognitionRef.current !== recognition) return
      const final: string[] = []
      const interim: string[] = []
      // Results are cumulative within a session; rebuilding avoids duplicates.
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        ;(result.isFinal ? final : interim).push(result[0]?.transcript || '')
      }
      finalRef.current = [prefix, ...final].filter(Boolean).join(' ').trim()
      interimRef.current = interim.join(' ').trim()
      setTranscript(finalRef.current)
      setInterimTranscript(interimRef.current)
    }
    recognition.onerror = (event: any) => {
      if (recognitionRef.current !== recognition || event.error === 'no-speech') return
      listeningRef.current = false
      const messages: Record<string, string> = {
        'not-allowed': 'Разрешите доступ к микрофону в браузере.',
        'service-not-allowed': 'Браузер запретил распознавание речи.',
        network: 'Сервис распознавания речи недоступен. Проверьте соединение.',
        'audio-capture': 'Микрофон недоступен. Проверьте его подключение.',
      }
      setError(messages[event.error] || 'Не удалось распознать речь. Повторите диктовку.')
      recognitionRef.current = null
      recognition.abort()
      complete()
    }
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      if (listeningRef.current) {
        prefix = `${finalRef.current} ${interimRef.current}`.trim()
        finalRef.current = prefix
        interimRef.current = ''
        setTranscript(prefix)
        setInterimTranscript('')
        try { recognition.start() } catch {
          listeningRef.current = false
          setError('Распознавание остановлено. Можно отправить уже распознанный текст.')
          complete()
        }
      } else {
        recognitionRef.current = null
        complete()
      }
    }
    listeningRef.current = true
    setIsListening(true)
    try { recognition.start() } catch {
      listeningRef.current = false
      recognitionRef.current = null
      setError('Не удалось начать диктовку. Повторите попытку.')
      complete()
    }
  }, [isSupported, lang, complete])

  useEffect(() => () => {
    listeningRef.current = false
    const recognition = recognitionRef.current
    recognitionRef.current = null
    recognition?.abort()
    if (finishTimer.current) clearTimeout(finishTimer.current)
    finishingRef.current?.(`${finalRef.current} ${interimRef.current}`.trim())
    finishingRef.current = null
  }, [])

  return { transcript, interimTranscript, isListening, isSupported, error, startListening, stopListening, abortListening, resetTranscript }
}
