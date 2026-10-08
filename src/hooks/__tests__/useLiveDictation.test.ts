import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSpeechRecognition } from '../useSpeechRecognition'

describe('streaming dictation', () => {
  let socket: any, processor: any
  const stop = vi.fn()
  const disconnect = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    socket = undefined
    processor = undefined
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } })
    vi.stubGlobal('AudioContext', class {
      audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
      destination = {}
      resume = vi.fn().mockResolvedValue(undefined)
      close = vi.fn().mockResolvedValue(undefined)
      createMediaStreamSource = () => ({ connect: vi.fn(), disconnect })
    })
    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null, postMessage: vi.fn() }
      connect = vi.fn()
      disconnect = vi.fn()
      constructor() { processor = this }
    })
    vi.stubGlobal('WebSocket', class {
      onmessage: any
      onerror: any
      onclose: any
      bufferedAmount = 0
      send = vi.fn()
      close = vi.fn()
      constructor() { socket = this }
    })
  })
  afterEach(() => vi.unstubAllGlobals())
  const message = (value: object) => socket.onmessage({ data: JSON.stringify(value) })
  async function start() {
    const hook = renderHook(() => useSpeechRecognition('ru-RU'))
    act(() => hook.result.current.startListening())
    await waitFor(() => expect(socket).toBeDefined())
    return hook
  }
  it('buffers the first audio while connecting and shows interim and final words', async () => {
    const { result } = await start()
    const pcm = new ArrayBuffer(3200)
    act(() => processor.port.onmessage({ data: { type: 'audio', pcm } }))
    expect(socket.send).not.toHaveBeenCalled()
    act(() => message({ type: 'ready' }))
    expect(socket.send).toHaveBeenCalledWith(pcm)
    act(() => message({ type: 'transcript', transcript: '', interim: 'Привет' }))
    expect(result.current.interimTranscript).toBe('Привет')
    act(() => message({ type: 'transcript', transcript: 'Привет.', interim: '' }))
    expect(result.current.transcript).toBe('Привет.')
  })
  it('flushes the final audio before finishing and waits for authoritative text', async () => {
    const { result } = await start()
    act(() => message({ type: 'ready' }))
    let done!: Promise<string>
    act(() => { done = result.current.stopListening() })
    expect(stop).toHaveBeenCalled()
    expect(socket.send).not.toHaveBeenCalled()
    act(() => processor.port.onmessage({ data: { type: 'audio', pcm: new ArrayBuffer(128) } }))
    act(() => processor.port.onmessage({ data: { type: 'flushed' } }))
    expect(socket.send.mock.calls[1][0]).toBe('{"type":"finish"}')
    await act(async () => {
      message({ type: 'done', text: 'Привет.' })
      expect(await done).toBe('Привет.')
    })
    expect(result.current.isListening).toBe(false)
  })
  it('ignores results from a cancelled session and releases the microphone', async () => {
    const { result } = await start()
    act(() => result.current.abortListening())
    expect(stop).toHaveBeenCalled()
    act(() => message({ type: 'transcript', transcript: 'Поздние слова', interim: '' }))
    expect(result.current.transcript).toBe('')
    expect(result.current.isListening).toBe(false)
  })
  it('does not send finish ahead of queued audio when stopped during connection setup', async () => {
    const { result } = await start()
    const pcm = new ArrayBuffer(200)
    let done!: Promise<string>
    act(() => { done = result.current.stopListening() })
    act(() => processor.port.onmessage({ data: { type: 'audio', pcm } }))
    act(() => message({ type: 'ready' }))
    expect(socket.send.mock.calls).toEqual([[pcm]])
    act(() => processor.port.onmessage({ data: { type: 'flushed' } }))
    expect(socket.send.mock.calls[1][0]).toBe('{"type":"finish"}')
    await act(async () => {
      message({ type: 'done', text: 'Привет.' })
      expect(await done).toBe('Привет.')
    })
  })
  it('keeps recognized words and explains a service failure', async () => {
    const { result } = await start()
    act(() => message({ type: 'transcript', transcript: 'Привет.', interim: '' }))
    act(() => message({ type: 'error', message: 'Сервис временно недоступен' }))
    expect(result.current.error).toBe('Сервис временно недоступен')
    expect(result.current.transcript).toBe('Привет.')
    expect(stop).toHaveBeenCalled()
  })
  it('keeps a specific service error when finalization fails instead of reporting no speech', async () => {
    const { result } = await start()
    act(() => message({ type: 'ready' }))
    let done!: Promise<string>
    act(() => { done = result.current.stopListening() })
    const failure = expect(done).rejects.toThrow('Регион недоступен')
    await act(async () => {
      message({ type: 'error', message: 'Регион недоступен' })
      await failure
    })
    expect(result.current.error).toBe('Регион недоступен')
  })
})
