import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioRecorder } from '../useAudioRecorder'

describe('useAudioRecorder', () => {
  let mockStream: any
  let mockTrack: any
  let mockRecorder: any

  beforeEach(() => {
    vi.useFakeTimers()

    mockTrack = {
      stop: vi.fn(),
    }

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    }

    mockRecorder = {
      state: 'inactive',
      mimeType: 'audio/webm;codecs=opus',
      start: vi.fn(function (this: any) {
        this.state = 'recording'
      }),
      stop: vi.fn(function (this: any) {
        this.state = 'inactive'
        if (this.onstop) this.onstop()
      }),
      pause: vi.fn(function (this: any) {
        this.state = 'paused'
      }),
      resume: vi.fn(function (this: any) {
        this.state = 'recording'
      }),
      ondataavailable: null,
      onstop: null,
    }

    // Mock MediaRecorder constructor
    const MockMediaRecorder = vi.fn().mockImplementation(() => mockRecorder) as any
    MockMediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true)
    ;(globalThis as any).MediaRecorder = MockMediaRecorder

    // Mock navigator.mediaDevices
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      configurable: true,
      writable: true,
    })

    // Mock URL.createObjectURL & revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-audio')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('initializes with default idle state', () => {
    const { result } = renderHook(() => useAudioRecorder())
    expect(result.current.isRecording).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.recordingTime).toBe(0)
    expect(result.current.audioBlob).toBeNull()
    expect(result.current.audioUrl).toBeNull()
    expect(result.current.stream).toBeNull()
  })

  it('starts recording and tracks duration', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)
    expect(result.current.stream).toBe(mockStream)
    expect(mockRecorder.start).toHaveBeenCalled()

    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.recordingTime).toBe(3)
  })

  it('stops recording, creates blob, and stops media tracks', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    // simulate data slice
    if (mockRecorder.ondataavailable) {
      mockRecorder.ondataavailable({ data: new Blob(['audio-data'], { type: 'audio/webm' }) })
    }

    let blobResult: any
    await act(async () => {
      blobResult = await result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(mockTrack.stop).toHaveBeenCalled()
    expect(blobResult).toBeInstanceOf(Blob)
    expect(result.current.audioUrl).toBe('blob:http://localhost/test-audio')
  })

  it('handles pause and resume', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    act(() => {
      result.current.pauseRecording()
    })
    expect(result.current.isPaused).toBe(true)
    expect(mockRecorder.pause).toHaveBeenCalled()

    act(() => {
      result.current.resumeRecording()
    })
    expect(result.current.isPaused).toBe(false)
    expect(mockRecorder.resume).toHaveBeenCalled()
  })
})
