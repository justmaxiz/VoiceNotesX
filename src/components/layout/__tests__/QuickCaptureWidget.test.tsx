import { Blob as NodeBlob } from 'node:buffer'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QuickCaptureWidget } from '../QuickCaptureWidget'
import { useQuickCaptureStore } from '../../../store/useQuickCaptureStore'
import { useAppStore } from '../../../store/useAppStore'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { db } from '../../../lib/db'

beforeEach(async () => {
  await db.clearDatabase()
  useAppStore.getState().setItems([])
  useAppStore.setState({ error: null })
  useQuickCaptureStore.setState({ isOpen: true, text: '', entityType: 'task', targetColumn: null, dueDate: null, dueTime: null })
  vi.stubEnv('VITE_AI_PROXY_URL', '')
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('QuickCapture persistence', () => {
  it('renders input and voice/save controls', () => {
    render(<QuickCaptureWidget />)
    expect(screen.getByLabelText('Поле быстрого ввода мысли или задачи')).toBeInTheDocument()
    expect(screen.getByLabelText('Начать голосовую запись')).toBeInTheDocument()
    expect(screen.getByLabelText('Сохранить мысль')).toBeInTheDocument()
  })
  it('clears input and announces success only after real persistence', async () => {
    const onSave = vi.fn()
    render(<QuickCaptureWidget onSave={onSave} />)
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Новая идея' } })
    fireEvent.click(screen.getByLabelText('Сохранить мысль'))
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Новая идея'))
    expect(input).toHaveValue('')
    expect((await db.getAllItems())[0].title).toBe('Новая идея')
    expect(screen.getByText('Мысль сохранена в заметки')).toBeInTheDocument()
  })
  it('retains the draft and displays failure, then permits retry', async () => {
    vi.spyOn(db, 'createItem').mockRejectedValueOnce(new Error('Quota exceeded'))
    render(<QuickCaptureWidget />)
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Сохранить важную мысль' } })
    fireEvent.click(screen.getByLabelText('Сохранить мысль'))
    await screen.findByRole('alert')
    expect(input).toHaveValue('Сохранить важную мысль')
    expect(screen.queryByText('Мысль сохранена в заметки')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Сохранить мысль'))
    await waitFor(() => expect(input).toHaveValue(''))
    expect(await db.items.count()).toBe(1)
  })
  it('ignores blank and repeated submissions during persistence', async () => {
    render(<QuickCaptureWidget />)
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.submit(input.closest('form')!)
    expect(await db.items.count()).toBe(0)
    fireEvent.change(input, { target: { value: 'Один раз' } })
    fireEvent.submit(input.closest('form')!)
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(input).toHaveValue(''))
    expect(await db.items.count()).toBe(1)
  })
  it('configured proxy failure is visible and keeps text for retry', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', 'https://example.com/ai')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response)
    render(<QuickCaptureWidget />)
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Proxy failure draft' } })
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    expect(await screen.findByRole('alert')).toHaveTextContent('503')
    expect(input).toHaveValue('Proxy failure draft')
    expect(await db.items.count()).toBe(0)
  })
  it('records and persists original audio even without speech recognition', async () => {
    vi.stubGlobal('Blob', NodeBlob)
    URL.createObjectURL = vi.fn(() => 'blob:audio')
    URL.revokeObjectURL = vi.fn()
    const tracks = [{ stop: vi.fn() }]
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => tracks })) } })
    class Recorder {
      static isTypeSupported() { return true }
      state = 'inactive'
      mimeType = 'audio/webm'
      ondataavailable?: (event: { data: Blob }) => void
      onstop?: () => void
      start() { this.state = 'recording' }
      stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['recorded'], { type: this.mimeType }) }); this.onstop?.() }
    }
    vi.stubGlobal('MediaRecorder', Recorder)
    render(<QuickCaptureWidget />)
    fireEvent.click(screen.getByLabelText('Начать голосовую запись'))
    await waitFor(() => expect(screen.getByTitle('Остановить запись')).toBeInTheDocument())
    fireEvent.click(screen.getByTitle('Остановить запись'))
    await waitFor(() => expect(screen.getByText('Мысль сохранена в заметки')).toBeInTheDocument())
    const saved = (await db.getAllItems())[0]
    expect(saved.title).toBe('Аудиозаметка')
    expect(await (await db.getAudioSession(saved.id))?.audioBlob?.text()).toBe('recorded')
    expect(tracks[0].stop).toHaveBeenCalled()
  })
  it('passes preferences to configured proxy and preserves manual focus on urgent extraction', async () => {
    const manual = { id: 'manual', type: 'task' as const, title: 'Manual', categoryTag: '#Work', status: 'in_progress' as const, priority: 'medium' as const, isFocus: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await db.createItem(manual)
    useAppStore.getState().setItems([manual])
    useSettingsStore.setState({ aiMode: 'deep', structuringStyle: 'action_plan' })
    vi.stubEnv('VITE_AI_PROXY_URL', 'https://example.com/ai')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ text: JSON.stringify({ entity_type: 'task', title: 'Urgent', description: 'Urgent', priority: 'high', category_tag: '#Work', transcript_summary: 'Urgent' }) }) } as Response)
    render(<QuickCaptureWidget />)
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Срочно выполнить другую задачу' } })
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(input).toHaveValue(''))
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toMatchObject({ mode: 'deep', style: 'action_plan' })
    expect((await db.getItem('manual'))?.isFocus).toBe(true)
    expect(useAppStore.getState().items.find((item) => item.title === 'Urgent')?.isFocus).toBe(false)
  })
})
