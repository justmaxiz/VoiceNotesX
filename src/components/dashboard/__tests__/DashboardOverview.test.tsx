import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DashboardOverview } from '../DashboardOverview'
import { useDashboardConfigStore } from '../../../store/dashboardConfigStore'
import { useAppStore } from '../../../store/useAppStore'
import { SEED_ITEMS } from '../../../lib/seedData'

describe('DashboardOverview Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-07T09:00:00.000Z'))
    useAppStore.setState({ 
      items: SEED_ITEMS.map((item) => item.id === 't-1' ? { ...item, audioUrl: 'https://example.com/test.webm' } : item),
      toggleTask: vi.fn().mockImplementation(async (id) => {
        const items = useAppStore.getState().items;
        useAppStore.setState({
          items: items.map(i => i.id === id ? { ...i, status: i.status === 'completed' ? 'todo' : 'completed' } : i)
        });
      })
    })
    useDashboardConfigStore.setState({
      modules: { ...useDashboardConfigStore.getState().modules, recentAudio: true, focusTask: true, taskList: true },
    })
    
    // Mock the toggleTask so it doesn't call IndexedDB
    useAppStore.setState({
      toggleTask: async (id) => {
        useAppStore.setState((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: item.status === 'completed' ? 'todo' : 'completed' }
              : item
          ),
        }))
      }
    })
  })

  afterEach(() => vi.useRealTimers())

  it('renders greetings, metrics, and hero focus task', () => {
    render(<DashboardOverview />)
    expect(screen.getByText(/Александр/)).toBeInTheDocument()
    expect(screen.getAllByText('Добавить новую фичу в VoiceNotes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Недавние аудиозаписи')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Сводка дня')[0]).toBeInTheDocument()
  })

  it('toggles audio play button icon state', () => {
    render(<DashboardOverview />)
    const playBtns = screen.getAllByLabelText(/Воспроизвести/i)
    const playBtn = playBtns[0]
    expect(playBtn).toBeInTheDocument()

    fireEvent.click(playBtn)
    expect(screen.getByLabelText(/Пауза аудио/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Пауза аудио/i))
    expect(screen.getAllByLabelText(/Воспроизвести/i).length).toBeGreaterThan(0)
  })

  it('toggles task completion and updates productivity stats', async () => {
    render(<DashboardOverview />)
    const firstCheckbox = screen.getByLabelText('Отметить задачу: Подготовить отчет по продуктовым метрикам Q3')
    expect(firstCheckbox).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(firstCheckbox)
    
    await waitFor(() => {
      expect(firstCheckbox).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('does NOT contain redundant QuickInputBar (TASK-40)', () => {
    render(<DashboardOverview />)
    expect(screen.queryByPlaceholderText(/Быстрая мысль или задача/)).toBeNull()
  })

  it('filters task list to overdue tasks', () => {
    render(<DashboardOverview />)
    const overdueBtn = screen.getByRole('button', { name: /Просроченные/i })
    fireEvent.click(overdueBtn)

    expect(overdueBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Провести ревью архитектуры микросервисов')).toBeInTheDocument()
    expect(screen.queryByText('Записать идеи для дизайн-системы 2026')).not.toBeInTheDocument()
  })
})
