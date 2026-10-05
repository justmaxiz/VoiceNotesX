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
})
