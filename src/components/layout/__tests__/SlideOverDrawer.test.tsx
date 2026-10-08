import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { SlideOverDrawer } from '../SlideOverDrawer'
import { useDrawerStore } from '../../../store/useDrawerStore'
import { useAppStore } from '../../../store/useAppStore'
import { Item } from '../../../types/item'

describe('SlideOverDrawer - Task Details, Tags & Reminders (TASK-37)', () => {
  const sampleTask: Item = {
    id: 'test-drawer-item',
    type: 'task',
    title: 'Детальная задача для проверки шторки',
    description: 'Описание детальной задачи',
    categoryTag: '#Тест',
    tags: ['#Тест', '#Разработка'],
    dueDate: '2026-10-10',
    dueTime: '15:30',
    reminderMinutesBefore: 15,
    isFocus: false,
    status: 'todo',
    priority: 'medium',
    checklist: [
      { id: 'cl-1', text: 'Подпункт 1', isCompleted: false, sortOrder: 1 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(async () => {
    const { db, clearDatabase } = await import('../../../lib/db')
    await clearDatabase()
    await db.items.bulkPut([sampleTask])
    useAppStore.setState({ items: [sampleTask] })
    useDrawerStore.setState({ isDrawerOpen: true, selectedItemId: 'test-drawer-item' })
  })

  it('renders DateTimePicker with presets and date input', () => {
    render(<SlideOverDrawer />)

    expect(screen.getByText('Дата и время дедлайна')).toBeInTheDocument()
    expect(screen.getByText('Сегодня')).toBeInTheDocument()
    expect(screen.getByText('Завтра')).toBeInTheDocument()
    expect(screen.getByText('Весь день')).toBeInTheDocument()
  })

  it('renders interactive TagInput with current tags and + Тег button', () => {
    render(<SlideOverDrawer />)

    expect(screen.getByText('Теги')).toBeInTheDocument()
    expect(screen.getByText('#Тест')).toBeInTheDocument()
    expect(screen.getByText('#Разработка')).toBeInTheDocument()
    expect(screen.getByText('+ Тег')).toBeInTheDocument()
  })

  it('renders reminders selector and allows changing reminder time', async () => {
    render(<SlideOverDrawer />)

    expect(screen.getByText('Напоминание')).toBeInTheDocument()
    const reminderButton = screen.getByRole('button', { name: /За 15 минут до начала/i })
    expect(reminderButton).toHaveAttribute('aria-haspopup', 'listbox')

    fireEvent.click(reminderButton)
    fireEvent.click(screen.getByRole('option', { name: /За 1 час до начала/i }))
    await waitFor(() => expect(useAppStore.getState().items[0].reminderMinutesBefore).toBe(60))
  })

  it('toggles focus state when target button is clicked', async () => {
    render(<SlideOverDrawer />)

    const focusBtn = screen.getByText('Сделать главной')
    fireEvent.click(focusBtn)

    expect(await screen.findByText('В фокусе дня')).toBeInTheDocument()
  })

  it('toggles checklist item completion with custom Checkbox', async () => {
    render(<SlideOverDrawer />)

    const itemCheckbox = screen.getByRole('checkbox', { name: 'Пункт: Подпункт 1' })
    expect(itemCheckbox).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(itemCheckbox)
    await waitFor(() => expect(useAppStore.getState().items[0].checklist?.[0].isCompleted).toBe(true))
  })
})
