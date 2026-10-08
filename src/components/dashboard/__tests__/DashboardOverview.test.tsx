import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DashboardOverview } from '../DashboardOverview'
import { useDashboardConfigStore } from '../../../store/dashboardConfigStore'
import { useAppStore } from '../../../store/useAppStore'
import { SEED_ITEMS } from '../../../lib/seedData'
import { summaryRepository } from '../../../lib/summaryRepository'
import { useSummaryStore,summaryStateKey } from '../../../store/useSummaryStore'
import { presetPeriod,type SummaryReport } from '../../../../server/src/summaryContracts'
import { buildSummaryContext,factualSummary } from '../../../../server/src/summaryFacts'
import { setSession } from '../../../lib/api'

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
      modules: { ...useDashboardConfigStore.getState().modules, recentAudio: true, focusTask: true, taskList: true, dailySummary: true },
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

  afterEach(() => {setSession(null);vi.useRealTimers();vi.restoreAllMocks()})

  it('reads the shared report without generating and respects module visibility',async()=>{
    setSession({accessToken:'dashboard-test',user:{id:'dashboard-owner',email:'dashboard@test.invalid'}})
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone,p=presetPeriod('day',zone),c=buildSummaryContext([],p,new Date())
    const report:SummaryReport={...factualSummary(c),id:'shared-report',slotKey:'shared-slot',version:1,period:p,asOf:c.asOf,generatedAt:c.asOf,metrics:c.metrics,facts:c.facts,coverage:c.coverage,sources:[],sourceFingerprint:c.sourceFingerprint,generationMode:'facts',freshness:'current',overview:{text:'Сохранённый общий итог',noteIds:[],factIds:['fact:completed']}}
    vi.spyOn(summaryRepository,'facts').mockResolvedValue({...c,report})
    const generate=vi.spyOn(summaryRepository,'generate')
    useSummaryStore.setState({entries:{}})
    useDashboardConfigStore.setState({modules:{...useDashboardConfigStore.getState().modules,dailySummary:true}})
    const view=render(<DashboardOverview/>);await screen.findByText('Сохранённый общий итог')
    expect(useSummaryStore.getState().entries[summaryStateKey(p)].report?.id).toBe('shared-report');expect(generate).not.toHaveBeenCalled()
    view.unmount();useDashboardConfigStore.setState({modules:{...useDashboardConfigStore.getState().modules,dailySummary:false}})
    render(<DashboardOverview/>);expect(screen.queryByText('Сохранённый общий итог')).not.toBeInTheDocument()
  })

  it('renders greetings, metrics, and hero focus task', () => {
    localStorage.setItem('voicenotes_profile:test-user', JSON.stringify({ name: 'Мария Иванова' }))
    render(<DashboardOverview />)
    expect(screen.getByRole('heading', { name: /Мария Иванова/ })).toBeInTheDocument()
    localStorage.removeItem('voicenotes_profile:test-user')
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
