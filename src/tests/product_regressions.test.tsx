import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { CalendarPage } from '../components/calendar/CalendarPage'
import { QuickCaptureWidget } from '../components/layout/QuickCaptureWidget'
import { FocusHeroCard } from '../components/dashboard/components/FocusHeroCard'
import { SlideOverDrawer } from '../components/layout/SlideOverDrawer'
import { NotesPage } from '../components/notes/NotesPage'
import { useAppStore } from '../store/useAppStore'
import { useQuickCaptureStore } from '../store/useQuickCaptureStore'
import { useDrawerStore } from '../store/useDrawerStore'
import { db } from '../lib/db'
import { normalizeTaskDates } from '../lib/taskDates'
import { Item } from '../types/item'

const task = (id: string, patch: Partial<Item> = {}): Item => normalizeTaskDates({ id, type: 'task', title: id, categoryTag: '#Work', status: 'todo', priority: 'medium', isFocus: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...patch })
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 10, 12))
  await db.clearDatabase()
  useAppStore.getState().setItems([])
  useQuickCaptureStore.setState({ isOpen: true, text: '', dueDate: null, dueTime: null, targetColumn: null, entityType: 'task' })
  useDrawerStore.setState({ isDrawerOpen: false, selectedItemId: null })
  vi.stubEnv('VITE_AI_PROXY_URL', '')
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('Calendar, focus and details user interactions', () => {
  it('month cell creation persists its selected date through ordinary Enter', async () => {
    render(<><CalendarPage /><QuickCaptureWidget /></>)
    fireEvent.click(screen.getByTestId('calendar-day-2026-10-18'))
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Selected date' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(input).toHaveValue(''))
    const stored = useAppStore.getState().items[0]
    expect(stored.dueDate).toBe('2026-10-18')
    expect(stored.isAllDay).toBe(true)
  })
  it('hour cell creation persists clock context, and navigation advances selected day/week', async () => {
    render(<><CalendarPage /><QuickCaptureWidget /></>)
    fireEvent.click(screen.getByRole('button', { name: 'День' }))
    fireEvent.click(screen.getByLabelText('Создать задачу 2026-10-10 14:00'))
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Hour task' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(input).toHaveValue(''))
    expect(useAppStore.getState().items[0]).toMatchObject({ dueDate: '2026-10-10', dueTime: '14:00' })
    fireEvent.click(screen.getByLabelText('Следующий период'))
    expect(screen.getByLabelText('Создать задачу 2026-10-11 14:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сегодня' }))
    fireEvent.click(screen.getByRole('button', { name: 'Неделя' }))
    fireEvent.click(screen.getByLabelText('Следующий период'))
    expect(screen.getByLabelText('Создать задачу 2026-10-12 14:00')).toBeInTheDocument()
  })
  it('day overlap has separate clickable widths and all-day tasks remain present', () => {
    useAppStore.getState().setItems([task('a', { dueDate: '2026-10-10', dueTime: '16:00', estimatedMinutes: 120 }), task('b', { dueDate: '2026-10-10', dueTime: '16:00', estimatedMinutes: 120 }), task('all-day', { dueDate: '2026-10-10', isAllDay: true })])
    render(<CalendarPage />)
    fireEvent.click(screen.getByRole('button', { name: 'День' }))
    expect(screen.getByTestId('calendar-event-a')).toHaveStyle({ width: '50%', left: '0%' })
    expect(screen.getByTestId('calendar-event-b')).toHaveStyle({ width: '50%', left: '50%' })
    expect(screen.getByText(/all-day/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('calendar-event-a'))
    expect(useDrawerStore.getState().selectedItemId).toBe('a')
  })
  it('early and late tasks remain visible and open details in day and week views', () => {
    useAppStore.getState().setItems([task('early', { dueDate: '2026-10-10', dueTime: '07:00' }), task('late', { dueDate: '2026-10-10', dueTime: '23:30', estimatedMinutes: 30 })])
    render(<CalendarPage />)
    fireEvent.click(screen.getByRole('button', { name: 'День' }))
    expect(screen.getByTestId('calendar-event-early')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('calendar-event-late'))
    expect(useDrawerStore.getState().selectedItemId).toBe('late')
    fireEvent.click(screen.getByRole('button', { name: 'Неделя' }))
    expect(screen.getByTestId('calendar-event-late')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('calendar-event-early'))
    expect(useDrawerStore.getState().selectedItemId).toBe('early')
  })
  it.each(['День', 'Неделя'])('instantaneous tasks have clickable markers in %s view', (view) => {
    const instant = new Date(2026, 9, 10, 12).toISOString()
    useAppStore.getState().setItems([task('instant', { startDate: instant, deadline: instant })])
    render(<CalendarPage />)
    fireEvent.click(screen.getByRole('button', { name: view }))
    const marker = screen.getByTestId('calendar-event-instant')
    expect(marker).toHaveStyle({ height: '8px', top: '672px' })
    fireEvent.click(marker)
    expect(useDrawerStore.getState().selectedItemId).toBe('instant')
  })
  it('hero reflects same-task checklist edits and does not erase newly added entries', async () => {
    const focused = task('focused', { dueDate: '2026-10-10', isFocus: true, checklist: [{ id: 'one', text: 'Original', isCompleted: false, sortOrder: 1 }] })
    await db.createItem(focused)
    useAppStore.getState().setItems([focused])
    render(<FocusHeroCard />)
    await act(async () => { await useAppStore.getState().updateItem('focused', { checklist: [...focused.checklist!, { id: 'two', text: 'Added in drawer', isCompleted: false, sortOrder: 2 }] }) })
    expect(screen.getByText('Added in drawer')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Отметить подзадачу: Original'))
    await waitFor(() => expect(useAppStore.getState().items[0].checklist?.[0].isCompleted).toBe(true))
    expect(useAppStore.getState().items.find(item => item.id === 'focused')?.checklist).toHaveLength(2)
  })
  it('hero status updates on timer even while the manual task reference remains unchanged', () => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0))
    useAppStore.getState().setItems([task('manual', { isFocus: true, startDate: new Date(2026, 9, 10, 11).toISOString(), deadline: new Date(2026, 9, 10, 12, 0, 10).toISOString() })])
    render(<FocusHeroCard />)
    expect(screen.getByText('Сейчас')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(30000) })
    expect(screen.getByText('Просрочена')).toBeInTheDocument()
  })
  it('drawer local refinement changes actual stored title and preserves interval', async () => {
    const item = task('refine', { title: 'Old', dueDate: '2026-10-10', dueTime: '16:00', estimatedMinutes: 120 })
    await db.createItem(item)
    useAppStore.getState().setItems([item])
    useDrawerStore.setState({ isDrawerOpen: true, selectedItemId: 'refine' })
    render(<SlideOverDrawer />)
    fireEvent.change(screen.getByLabelText('Дополнить / Изменить'), { target: { value: 'Переименуй в New title' } })
    fireEvent.click(screen.getByRole('button', { name: 'Применить указание' }))
    await waitFor(() => expect(useAppStore.getState().items[0].title).toBe('New title'))
    expect(useAppStore.getState().items.find(item => item.id === 'refine')?.startDate).toBe(item.startDate)
  })
  it('completion through a status patch records completedAt and clears manual focus', async () => {
    const item = task('complete', { isFocus: true })
    await db.createItem(item)
    useAppStore.getState().setItems([item])
    await useAppStore.getState().updateItem(item.id, { status: 'completed' })
    expect(useAppStore.getState().items.find(row => row.id === item.id)).toMatchObject({ status: 'completed', isFocus: false, completedAt: new Date().toISOString() })
  })
  it('notes can filter by secondary edited tags and omit archives', () => {
    useAppStore.getState().setItems([task('visible', { type: 'note', tags: ['#Work', '#Second'] }), task('other', { type: 'note' }), task('archived', { type: 'note', status: 'archived' })])
    render(<NotesPage />)
    fireEvent.click(screen.getByRole('button', { name: '#Second' }))
    expect(screen.getByText('visible')).toBeInTheDocument()
    expect(screen.queryByText('other')).not.toBeInTheDocument()
    expect(screen.queryByText('archived')).not.toBeInTheDocument()
  })
})
