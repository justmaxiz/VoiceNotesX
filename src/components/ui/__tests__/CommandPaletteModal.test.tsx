import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Header } from '../../layout/Header'
import { useAppStore } from '../../../store/useAppStore'
import { useCommandPaletteStore } from '../../../store/useCommandPaletteStore'
import { useDrawerStore } from '../../../store/useDrawerStore'
import { useNavigationStore } from '../../../store/navigationStore'
import { Item } from '../../../types/item'

function makeItem(overrides: Partial<Item> & Pick<Item, 'id' | 'title'>): Item {
  const { id, title, ...fields } = overrides
  return {
    id,
    title,
    type: 'note',
    description: '',
    categoryTag: '#Работа',
    status: 'todo',
    priority: 'medium',
    isFocus: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...fields,
  }
}

const items = [
  makeItem({ id: 'note-1', title: 'План запуска', description: 'Поиск метрик для заметки', updatedAt: '2026-10-01T10:00:00Z' }),
  makeItem({ id: 'task-1', title: 'Собрать данные', type: 'task', description: 'Собрать метрики', status: 'todo', updatedAt: '2026-10-02T10:00:00Z' }),
  makeItem({ id: 'note-2', title: 'Архивная запись', description: 'Метрики прошлой кампании', status: 'archived', updatedAt: '2026-10-03T10:00:00Z' }),
  makeItem({ id: 'note-3', title: 'Третья запись', updatedAt: '2026-10-04T10:00:00Z' }),
  makeItem({ id: 'note-4', title: 'Четвертая запись', updatedAt: '2026-10-05T10:00:00Z' }),
  makeItem({ id: 'note-5', title: 'Пятая запись', updatedAt: '2026-10-06T10:00:00Z' }),
  makeItem({ id: 'note-6', title: 'Шестая запись', updatedAt: '2026-10-07T10:00:00Z' }),
]

describe('CommandPaletteModal search behavior', () => {
  beforeEach(() => {
    useAppStore.getState().setItems(items)
    useDrawerStore.getState().closeDrawer()
    useNavigationStore.setState({ isRecordingModalOpen: false })
    useCommandPaletteStore.setState({ isOpen: true, query: '', returnFocusElement: null })
  })

  afterEach(() => {
    cleanup()
    useCommandPaletteStore.setState({ isOpen: false, query: '', returnFocusElement: null })
    useDrawerStore.getState().closeDrawer()
    useAppStore.getState().setItems([])
  })

  it('shows quick commands and the five most recently updated items with an empty query', () => {
    render(<Header />)

    expect(screen.getByRole('heading', { name: 'Быстрые команды' })).toBeInTheDocument()
    const recentGroup = screen.getByRole('group', { name: 'Недавние элементы' })
    const recent = within(recentGroup).getAllByRole('option')
    expect(recent).toHaveLength(5)
    expect(recent[0]).toHaveAccessibleName('Открыть заметку: Шестая запись')
    expect(recent[4]).toHaveAccessibleName('Открыть заметку: Архивная запись')
  })

  it('updates results as the user types and highlights the matching snippet', () => {
    render(<Header />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'метрик' } })

    const results = screen.getAllByRole('option')
    expect(results).toHaveLength(3)
    expect(results.map((result) => result.getAttribute('aria-label'))).toContain('Открыть задачу: Собрать данные')
    expect(results.map((result) => result.getAttribute('aria-label'))).toContain('Открыть заметку: Архивная запись')
    const highlightedMatch = results[0].querySelector('mark')
    expect(highlightedMatch).toBeInTheDocument()
    expect(highlightedMatch).toHaveTextContent(/метрик/i)
  })

  it('opens a clicked result in the drawer and closes the palette', () => {
    render(<Header />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'метрик' } })
    fireEvent.click(screen.getByRole('option', { name: 'Открыть задачу: Собрать данные' }))

    expect(useDrawerStore.getState()).toMatchObject({ selectedItemId: 'task-1', isDrawerOpen: true })
    expect(screen.queryByTestId('command-palette-widget')).not.toBeInTheDocument()
  })

  it('moves focus through results with Tab and opens the focused result with Enter', () => {
    render(<Header />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'метрик' } })
    input.focus()

    fireEvent.keyDown(input, { key: 'Tab' })
    const firstResult = screen.getAllByRole('option')[0]
    expect(document.activeElement).toBe(firstResult)
    fireEvent.keyDown(firstResult, { key: 'Enter' })

    const expectedItem = items.find((item) => firstResult.getAttribute('aria-label')?.endsWith(item.title))
    expect(useDrawerStore.getState().selectedItemId).toBe(expectedItem?.id)
  })

  it('activates a focused quick command with Enter', () => {
    render(<Header />)
    const input = screen.getByRole('combobox')
    input.focus()
    fireEvent.keyDown(input, { key: 'Tab' })

    const firstCommand = screen.getByRole('option', { name: /Начать запись голоса/ })
    expect(document.activeElement).toBe(firstCommand)
    fireEvent.keyDown(firstCommand, { key: 'Enter' })

    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(true)
    expect(screen.queryByTestId('command-palette-widget')).not.toBeInTheDocument()
  })

  it('keeps every matching result available in the scrollable list', () => {
    const manyItems = Array.from({ length: 30 }, (_, index) => makeItem({
      id: `long-list-${index}`,
      title: `Запись ${index}`,
      description: 'Совпадения для длинного списка',
      updatedAt: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
    }))
    useAppStore.getState().setItems(manyItems)
    render(<Header />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'совпадения' } })

    expect(screen.getAllByRole('option')).toHaveLength(30)
    expect(document.getElementById('command-palette-results')).toHaveClass('overflow-y-auto')
  })

  it('shows a no-results message without clearing the query', () => {
    render(<Header />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'несуществующий-термин' } })

    expect(screen.getByRole('status')).toHaveTextContent('Ничего не найдено по запросу «несуществующий-термин»')
    expect(input).toHaveValue('несуществующий-термин')
  })

  it('closes on Escape and restores focus to the opening control', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    useCommandPaletteStore.getState().openPalette(opener)
    render(<Header />)
    const input = screen.getByRole('combobox')

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByTestId('command-palette-widget')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('combobox'))
    opener.remove()
  })

  it('closes when clicking outside the palette', () => {
    render(<Header />)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByTestId('command-palette-widget')).not.toBeInTheDocument()
  })

  it('clears the previous query and focuses search again after reopening', () => {
    useCommandPaletteStore.setState({ isOpen: false, query: '', returnFocusElement: null })
    const opener = document.createElement('button')
    document.body.append(opener)
    render(<Header />)

    act(() => useCommandPaletteStore.getState().openPalette(opener))
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'предыдущий запрос' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    act(() => useCommandPaletteStore.getState().openPalette(opener))

    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(document.activeElement).toBe(screen.getByRole('combobox'))
    opener.remove()
  })
})
