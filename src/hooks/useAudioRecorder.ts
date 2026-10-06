import { useState, useRef, useCallback, useEffect } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number // in seconds
  audioBlob: Blob | null
  audioUrl: string | null
  stream: MediaStream | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  pauseRecording: () => void
  resumeRecording: () => void
}

const getSupportedMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return ''
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
  ]
  return types.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t)
    } catch {
      return false
    }
  }) || ''
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  audioUrlRef.current = audioUrl
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const pauseStartRef = useRef<number>(0)

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      streamRef.current = null
    }
    setStream(null)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Захват аудио не поддерживается данным браузером')
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = mediaStream
      setStream(mediaStream)

      const mimeType = getSupportedMimeType()
      const options = mimeType ? { mimeType } : undefined
      const recorder = new MediaRecorder(mediaStream, options)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.start(100) // 100ms slices

      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      setRecordingTime(0)
      setIsRecording(true)
      setIsPaused(false)

      clearTimer()
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
        setRecordingTime(Math.max(0, Math.floor(elapsed)))
      }, 100)
    } catch (err: any) {
      cleanupStream()
      const message = err?.message || 'Ошибка доступа к микрофону'
      setError(message)
      throw err
    }
  }, [audioUrl, cleanupStream, clearTimer])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      clearTimer()

      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        cleanupStream()
        setIsRecording(false)
        setIsPaused(false)
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)

        setAudioBlob(blob)
        setAudioUrl(url)
        setIsRecording(false)
        setIsPaused(false)
        cleanupStream()
        resolve(blob)
      }

      try {
        recorder.stop()
      } catch {
        cleanupStream()
        setIsRecording(false)
        setIsPaused(false)
        resolve(null)
      }
    })
  }, [clearTimer, cleanupStream])

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.pause()
      setIsPaused(true)
      pauseStartRef.current = Date.now()
      clearTimer()
    }
  }, [clearTimer])

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'paused') {
      recorder.resume()
      setIsPaused(false)
      pausedTimeRef.current += Date.now() - pauseStartRef.current

      clearTimer()
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
        setRecordingTime(Math.max(0, Math.floor(elapsed)))
      }, 100)
    }
  }, [clearTimer])

  useEffect(() => {
    return () => {
      clearTimer()
      cleanupStream()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [clearTimer, cleanupStream])

  return {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    stream,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  }
}
