import { render,screen,fireEvent,waitFor } from '@testing-library/react'
import { describe,it,expect,vi,afterEach } from 'vitest'
import { SummaryScheduleSettings } from '../SummaryScheduleSettings'
import { summaryRepository } from '../../../lib/summaryRepository'
describe('Server evening settings',()=>{
  afterEach(()=>vi.restoreAllMocks())
  it('loads and persists enabled, IANA zone and evening time',async()=>{
    const save=vi.spyOn(summaryRepository,'saveSettings')
    render(<SummaryScheduleSettings/>);await screen.findByLabelText('Часовой пояс (IANA)')
    fireEvent.change(screen.getByLabelText('Часовой пояс (IANA)'),{target:{value:'Europe/Saratov'}})
    fireEvent.change(screen.getByLabelText('Локальное время'),{target:{value:'20:30'}})
    fireEvent.click(screen.getByRole('button',{name:'Сохранить расписание'}))
    await screen.findByText('Расписание сохранено.');expect(save).toHaveBeenCalledWith({enabled:true,timeZone:'Europe/Saratov',localTime:'20:30'})
  })
  it('shows failure and allows retry without a false saved message',async()=>{
    vi.spyOn(summaryRepository,'settings').mockRejectedValueOnce(new Error('Database unavailable'))
    render(<SummaryScheduleSettings/>);await screen.findByText('Database unavailable')
    fireEvent.click(screen.getByRole('button',{name:'Повторить загрузку'}));await screen.findByLabelText('Часовой пояс (IANA)')
    vi.spyOn(summaryRepository,'saveSettings').mockRejectedValueOnce(new Error('Некорректный часовой пояс.'))
    fireEvent.click(screen.getByRole('button',{name:'Сохранить расписание'}));await screen.findByText('Некорректный часовой пояс.')
    await waitFor(()=>expect(screen.getByRole('button',{name:'Сохранить расписание'})).toBeEnabled());expect(screen.queryByText('Расписание сохранено.')).not.toBeInTheDocument()
  })
})
