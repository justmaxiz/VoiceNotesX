import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '../lib/api'

interface Session {
  cancelled: boolean
  socket?: WebSocket
  stream?: MediaStream
  context?: AudioContext
  processor?: AudioWorkletNode
  source?: MediaStreamAudioSourceNode
  ready: boolean
  queued: ArrayBuffer[]
  resolve?: (text: string) => void
  reject?: (error: Error) => void
  timer?: ReturnType<typeof setTimeout>
  finishing: boolean
  flushed: boolean
}

export function useLiveDictation(language: string) {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const textRef = useRef({ transcript: '', interim: '' })
  const isSupported = typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof window.AudioContext === 'function' && typeof window.AudioWorkletNode === 'function'
  const visibleText = () => [textRef.current.transcript, textRef.current.interim].filter(Boolean).join(' ').trim()

  const release = useCallback((session: Session) => {
    session.cancelled = true
    clearTimeout(session.timer)
    session.queued = []
    session.stream?.getTracks().forEach(track => track.stop())
    session.source?.disconnect()
    session.processor?.disconnect()
    if (session.context) void session.context.close().catch(() => {})
    session.socket?.close()
    session.resolve?.(visibleText())
    session.resolve = undefined
    session.reject = undefined
    if (sessionRef.current === session) {
      sessionRef.current = null
      setIsListening(false)
    }
  }, [])

  const abortListening = useCallback(() => {
    if (sessionRef.current) release(sessionRef.current)
  }, [release])

  const resetTranscript = useCallback(() => {
    textRef.current = { transcript: '', interim: '' }
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const startListening = useCallback(() => {
    if (sessionRef.current) return
    setError(null)
    const session: Session = { cancelled: false, ready: false, queued: [], finishing: false, flushed: false }
    sessionRef.current = session
    setIsListening(true)
    const fail = (message: string) => {
      if (session.cancelled) return
      setError(message)
      session.reject?.(new Error(message))
      session.resolve = undefined
      release(session)
    }
    const sendFinish = () => {
      if (session.cancelled || !session.ready || !session.finishing || !session.flushed) return
      session.socket!.send(JSON.stringify({ type: 'finish' }))
      clearTimeout(session.timer)
      session.timer = setTimeout(() => fail('Сервис не завершил диктовку. Распознанный текст сохранён.'), 7000)
    }
    session.timer = setTimeout(() => fail('Не удалось запустить микрофон и диктовку. Повторите попытку.'), 15000)
    // Acquire the microphone immediately and buffer audio during connection setup.
    void (async () => {
      try {
        const context = new AudioContext({ sampleRate: 16000 })
        session.context = context
        await context.resume()
        if (session.cancelled) return
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false })
        if (session.cancelled) { stream.getTracks().forEach(track => track.stop()); return }
        session.stream = stream
        await context.audioWorklet.addModule('/dictation-processor.js')
        if (session.cancelled) return
        const processor = new AudioWorkletNode(context, 'dictation-pcm')
        session.processor = processor
        session.source = context.createMediaStreamSource(stream)
        processor.port.onmessage = event => {
          if (session.cancelled) return
          if (event.data.type === 'flushed') { session.flushed = true; sendFinish(); return }
          const pcm = event.data.pcm as ArrayBuffer
          if (session.ready) {
            if (session.socket!.bufferedAmount > 320000) { fail('Соединение слишком медленное для диктовки. Текст сохранён.'); return }
            session.socket!.send(pcm)
          } else {
            session.queued.push(pcm)
          }
        }
        session.source.connect(processor)
        processor.connect(context.destination)
        const url = new URL(apiUrl('/dictation/live'), window.location.href)
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        url.searchParams.set('language', language)
        const socket = new WebSocket(url)
        session.socket = socket
        clearTimeout(session.timer)
        session.timer = setTimeout(() => fail('Сервис диктовки не подключился. Повторите попытку.'), 15000)
        socket.onmessage = event => {
          if (session.cancelled) return
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'ready') {
              clearTimeout(session.timer)
              session.ready = true
              for (const pcm of session.queued) socket.send(pcm)
              session.queued = []
              if (session.finishing) sendFinish()
            } else if (message.type === 'transcript') {
              textRef.current = { transcript: message.transcript || '', interim: message.interim || '' }
              setTranscript(textRef.current.transcript)
              setInterimTranscript(textRef.current.interim)
            } else if (message.type === 'done') {
              textRef.current = { transcript: message.text || visibleText(), interim: '' }
              setTranscript(textRef.current.transcript)
              setInterimTranscript('')
              release(session)
            } else if (message.type === 'error') fail(message.message)
          } catch { fail('Некорректный ответ сервиса диктовки.') }
        }
        socket.onerror = () => fail('Сервис диктовки недоступен. Проверьте подключение и вход в аккаунт.')
        socket.onclose = () => fail('Соединение диктовки прервано. Распознанный текст сохранён.')
        if (session.finishing) {
          session.source.disconnect()
          processor.port.postMessage({ type: 'flush' })
          stream.getTracks().forEach(track => track.stop())
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : ''
        fail(name === 'NotAllowedError' ? 'Разрешите доступ к микрофону в браузере.' : name === 'NotFoundError' ? 'Микрофон не найден. Проверьте подключение.' : 'Не удалось начать диктовку. Проверьте микрофон.')
      }
    })()
  }, [language, release])

  const stopListening = useCallback((): Promise<string> => {
    const session = sessionRef.current
    if (!session) return Promise.resolve(visibleText())
    if (session.finishing) return Promise.resolve(visibleText())
    session.finishing = true
    return new Promise((resolve, reject) => {
      session.resolve = resolve
      session.reject = reject
      if (session.processor) {
        session.source?.disconnect()
        session.processor.port.postMessage({ type: 'flush' })
        session.stream?.getTracks().forEach(track => track.stop())
      }
    })
  }, [])

  useEffect(() => () => {
    if (sessionRef.current) release(sessionRef.current)
  }, [release])

  return { transcript, interimTranscript, isListening, isSupported, error, startListening, stopListening, abortListening, resetTranscript }
}
