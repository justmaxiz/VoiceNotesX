import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { QuickCaptureWidget } from '../QuickCaptureWidget'
import { SlideOverDrawer } from '../SlideOverDrawer'
import { useAppStore } from '../../../store/useAppStore'
import { useQuickCaptureStore } from '../../../store/useQuickCaptureStore'
import { useCaptureAIStore } from '../../../store/useCaptureAIStore'
import { useDrawerStore } from '../../../store/useDrawerStore'
import { db } from '../../../lib/db'
import { installApiDouble } from '../../../test/apiDouble'
beforeEach(async () => { await db.clearDatabase(); useAppStore.getState().setItems([]); useCaptureAIStore.getState().reset(); useDrawerStore.getState().closeDrawer(); useQuickCaptureStore.setState({ isOpen: true, text: '', targetColumn: null, dueDate: null, dueTime: null }); vi.stubGlobal('fetch', installApiDouble().fetch) })
const enter = (text: string) => { const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи'); fireEvent.change(input, { target: { value: text } }); fireEvent.submit(input.closest('form')!); return input }
describe('AI Quick Capture', () => {
  it('derives a two-hour start from the extracted 11:00 deadline', async () => {
    const original = globalThis.fetch
    const deadline = '2026-10-08T11:00:00+04:00'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ result: { title: 'Доделать проект X', description: '', priority: 'medium', category_tag: '#Работа', transcript_summary: '', deadline, start_date: null, estimated_minutes: 120 } }))).mockImplementation(original))
    render(<QuickCaptureWidget />)
    const input = enter('надо доделать задачу по проекту X завтра к 11, займет часа 2')
    await waitFor(() => expect(input).toHaveValue(''))
    expect(useAppStore.getState().items[0]).toMatchObject({ type: 'task', estimatedMinutes: 120, deadline: '2026-10-08T07:00:00.000Z', startDate: '2026-10-08T05:00:00.000Z' })
  })
  it('does not send blank text and has no type switcher', () => { const fetch = vi.spyOn(globalThis, 'fetch'); render(<QuickCaptureWidget />); enter(' '); expect(fetch).not.toHaveBeenCalled(); expect(screen.queryByRole('group', { name: 'Тип записи' })).not.toBeInTheDocument() })
  it('ordinary submit saves one server note with the original transcript', async () => { render(<QuickCaptureWidget />); const input = enter('Исходная мысль'); await waitFor(() => expect(input).toHaveValue('')); expect(useAppStore.getState().items).toHaveLength(1); expect(useAppStore.getState().items[0]).toMatchObject({ type: 'note', transcriptText: 'Исходная мысль' }); expect(await db.items.count()).toBe(0) })
  it('preserves an extracted date-only schedule even when AI omits optional instant fields', async () => {
    const original = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ result: { title: 'Запланировано', description: '', priority: 'medium', category_tag: '#Тест', transcript_summary: '', due_date: '2026-10-10' } }))).mockImplementation(original))
    render(<QuickCaptureWidget />)
    const input = enter('Завтра выполнить действие')
    await waitFor(() => expect(input).toHaveValue(''))
    expect(useAppStore.getState().items[0]).toMatchObject({ type: 'task', dueDate: '2026-10-10', dueTime: null })
  })
  it('opens a skeleton before the response and ignores a repeated submit', async () => { let resolve!: (response: Response) => void; const original = globalThis.fetch; vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r })).mockImplementation(original)); render(<><QuickCaptureWidget /><SlideOverDrawer /></>); const input = enter('Долгий запрос'); expect(screen.getByRole('status', { name: 'ИИ обрабатывает текст' })).toBeInTheDocument(); fireEvent.submit(input.closest('form')!); resolve(new Response(JSON.stringify({ result: { title: 'Готово', description: '', priority: 'medium', category_tag: '#Тест', transcript_summary: '' } }))); await waitFor(() => expect(useAppStore.getState().items).toHaveLength(1)); expect(globalThis.fetch).toHaveBeenCalledTimes(2) })
  it('keeps the draft after provider error and saves raw text only after an explicit action', async () => { const original = globalThis.fetch; vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'AI_TIMEOUT', message: 'Таймаут' } }), { status: 504 })).mockImplementation(original)); render(<><QuickCaptureWidget /><SlideOverDrawer /></>); enter('Сохранить текст'); await screen.findByRole('button', { name: 'Сохранить исходный текст' }); expect(useAppStore.getState().items).toHaveLength(0); fireEvent.click(screen.getByRole('button', { name: 'Сохранить исходный текст' })); await waitFor(() => expect(useAppStore.getState().items).toHaveLength(1)); expect(useAppStore.getState().items[0].transcriptText).toBe('Сохранить текст') })
})

describe('Live text dictation', () => {
  let recognition: FakeRecognition
  class FakeRecognition {
    continuous = false
    interimResults = false
    lang = ''
    onresult: ((event: unknown) => void) | null = null
    onend: (() => void) | null = null
    onerror: ((event: unknown) => void) | null = null
    finalText = 'Завтра встреча в 18:00'
    start = vi.fn()
    abort = vi.fn()
    stop = vi.fn(() => { this.result(this.finalText, true); this.onend?.() })
    constructor() { recognition = this }
    result(text: string, isFinal: boolean) {
      const result = Object.assign([{ transcript: text }], { isFinal })
      this.onresult?.({ resultIndex: 0, results: [result] })
    }
  }
  beforeEach(() => vi.stubGlobal('webkitSpeechRecognition', FakeRecognition))
  afterEach(() => vi.unstubAllGlobals())

  it('shows interim words, prevents manual edits, waits for final text and sends only text', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<QuickCaptureWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать голосовую запись' }))
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    expect(input).toHaveAttribute('readonly')
    act(() => recognition.result('Завтра встреча', false))
    expect(input).toHaveValue('Завтра встреча')
    fireEvent.change(input, { target: { value: 'Manual edit' } })
    expect(input).toHaveValue('Завтра встреча')
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Отправить диктовку' }))
    await waitFor(() => expect(useAppStore.getState().items).toHaveLength(1))
    expect(useAppStore.getState().items[0].transcriptText).toBe('Завтра встреча в 18:00')
    const calls = fetch.mock.calls
    expect(calls.some(([url]) => String(url).includes('/audio/'))).toBe(false)
    expect(JSON.parse(String(calls[0][1]?.body)).text).toBe('Завтра встреча в 18:00')
  })

  it('cancels without a request, restores the prior draft and ignores late results', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<QuickCaptureWidget />)
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Мой черновик' } })
    fireEvent.click(screen.getByRole('button', { name: 'Начать голосовую запись' }))
    act(() => recognition.result('Добавленная диктовка', false))
    expect(input).toHaveValue('Мой черновик Добавленная диктовка')
    const cancel = screen.getByRole('button', { name: 'Отменить диктовку' })
    expect(cancel).toHaveTextContent('close')
    fireEvent.click(cancel)
    act(() => recognition.result('Поздний результат', true))
    expect(input).toHaveValue('Мой черновик')
    expect(input).not.toHaveAttribute('readonly')
    expect(recognition.abort).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not send an empty dictation', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<QuickCaptureWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать голосовую запись' }))
    recognition.finalText = ''
    fireEvent.click(screen.getByRole('button', { name: 'Отправить диктовку' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Речь не распознана')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows recognition failures and preserves the visible text for manual retry', () => {
    render(<QuickCaptureWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать голосовую запись' }))
    act(() => { recognition.result('Уже распознано', true); recognition.onerror?.({ error: 'network' }) })
    expect(screen.getByRole('alert')).toHaveTextContent('Сервис распознавания речи недоступен')
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    expect(input).toHaveValue('Уже распознано')
    expect(input).not.toHaveAttribute('readonly')
  })
})
