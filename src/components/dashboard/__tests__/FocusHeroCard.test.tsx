import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { FocusHeroCard } from '../components/FocusHeroCard'
import { useAppStore } from '../../../store/useAppStore'
import { useNavigationStore } from '../../../store/navigationStore'
import { useQuickCaptureStore } from '../../../store/useQuickCaptureStore'
import type { Item } from '../../../types/item'

const task: Item = {
  id: 'task', type: 'task', title: 'Подготовить план', status: 'todo', priority: 'medium',
  categoryTag: '#Работа', isFocus: false, createdAt: '2026-10-07T08:00:00Z', updatedAt: '2026-10-07T08:00:00Z',
}
beforeEach(() => {
  useAppStore.getState().setItems([])
  useNavigationStore.setState({ activeTab: 'overview' })
  useQuickCaptureStore.setState({ isOpen: false, entityType: 'note' })
})
function expectEmptyCard() {
  const card = within(screen.getByTestId('focus-hero-card'))
  expect(card.queryByText('В фокусе')).not.toBeInTheDocument()
  expect(card.queryByText(/Дедлайн:/)).not.toBeInTheDocument()
  expect(card.queryByText('#Фокус')).not.toBeInTheDocument()
  expect(card.queryByRole('button', { name: /Сменить фокус/ })).not.toBeInTheDocument()
  expect(card.queryByRole('button', { name: /Завершить задачу/ })).not.toBeInTheDocument()
  expect(card.queryByText('AI Сводка')).not.toBeInTheDocument()
  return card
}
describe('Focus hero empty state', () => {
  it.each([
    ['empty account', []],
    ['notes only', [{ ...task, type: 'note' as const }]],
    ['archived tasks only', [{ ...task, status: 'archived' as const }]],
  ])('shows a clean invitation for %s', (_label, items) => {
    useAppStore.getState().setItems(items as Item[])
    render(<FocusHeroCard onSummary={() => {}} />)
    const card = expectEmptyCard()
    expect(card.getByText('Нет задач в фокусе')).toBeInTheDocument()
    fireEvent.click(card.getByRole('button', { name: 'Добавить задачу' }))
    expect(useQuickCaptureStore.getState()).toMatchObject({ isOpen: true, entityType: 'task' })
  })
  it('offers the task list when tasks exist without a focus', () => {
    useAppStore.getState().setItems([task])
    render(<FocusHeroCard />)
    fireEvent.click(expectEmptyCard().getByRole('button', { name: 'Выбрать задачу' }))
    expect(useNavigationStore.getState().activeTab).toBe('tasks')
  })
  it('changes between the empty, focused and completed states', () => {
    render(<FocusHeroCard />)
    expectEmptyCard()
    act(() => useAppStore.getState().setItems([{ ...task, isFocus: true }]))
    const card = within(screen.getByTestId('focus-hero-card'))
    expect(card.getByText('Подготовить план')).toBeInTheDocument()
    expect(card.getByRole('button', { name: /Завершить задачу/ })).toBeInTheDocument()
    act(() => useAppStore.getState().setItems([{ ...task, isFocus: true, status: 'completed' }]))
    expect(expectEmptyCard().getByText('Все задачи в фокусе выполнены!')).toBeInTheDocument()
  })
})
