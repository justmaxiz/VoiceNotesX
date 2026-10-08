import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeechRecognition } from '../useSpeechRecognition'

describe('useSpeechRecognition', () => {
  let mockRecognitionInstance: any

  beforeEach(() => {
    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      lang: '',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    }

    const MockRecognition = vi.fn().mockImplementation(() => mockRecognitionInstance)
    ;(globalThis as any).webkitSpeechRecognition = MockRecognition
  })

  it('checks isSupported correctly when speech API is present', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    expect(result.current.isSupported).toBe(true)
    expect(result.current.isListening).toBe(false)
  })

  it('handles startListening and processes speech results', () => {
    const { result } = renderHook(() => useSpeechRecognition())

    act(() => {
      result.current.startListening()
    })

    expect(result.current.isListening).toBe(true)
    expect(mockRecognitionInstance.start).toHaveBeenCalled()

    const item = [{ transcript: 'Привет мир' }] as any
    item.isFinal = true
    const results = [item]

    act(() => {
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results,
      })
    })

    expect(result.current.transcript).toBe('Привет мир')
  })

  it('resets transcript on resetTranscript call', () => {
    const { result } = renderHook(() => useSpeechRecognition())

    act(() => {
      result.current.startListening()
    })

    const item = [{ transcript: 'Тест' }] as any
    item.isFinal = true

    act(() => {
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results: [item],
      })
    })

    expect(result.current.transcript).toBe('Тест')

    act(() => {
      result.current.resetTranscript()
    })

    expect(result.current.transcript).toBe('')
  })

  it('waits for final words on stop instead of losing the last interim result', async () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.startListening())
    let stopped!: Promise<string>
    act(() => { stopped = result.current.stopListening() })
    await act(async () => {
      const item = Object.assign([{ transcript: 'Последние слова' }], { isFinal: true })
      mockRecognitionInstance.onresult({ resultIndex: 0, results: [item] })
      mockRecognitionInstance.onend()
      expect(await stopped).toBe('Последние слова')
    })
    expect(result.current.isListening).toBe(false)
    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(1)
  })

  it('does not duplicate cumulative final results', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.startListening())
    const first = Object.assign([{ transcript: 'Первая фраза' }], { isFinal: true })
    const second = Object.assign([{ transcript: 'Вторая фраза' }], { isFinal: true })
    act(() => mockRecognitionInstance.onresult({ resultIndex: 0, results: [first] }))
    act(() => mockRecognitionInstance.onresult({ resultIndex: 1, results: [first, second] }))
    expect(result.current.transcript).toBe('Первая фраза Вторая фраза')
  })

  it('keeps interim words if the browser never emits an end event', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useSpeechRecognition())
      act(() => result.current.startListening())
      const interim = Object.assign([{ transcript: 'Незавершённая фраза' }], { isFinal: false })
      act(() => mockRecognitionInstance.onresult({ resultIndex: 0, results: [interim] }))
      let stopped!: Promise<string>
      act(() => { stopped = result.current.stopListening() })
      await act(async () => {
        vi.advanceTimersByTime(1500)
        expect(await stopped).toBe('Незавершённая фраза')
      })
      expect(mockRecognitionInstance.abort).toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })
})
