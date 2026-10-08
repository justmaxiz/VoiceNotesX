import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioActionReview } from './AudioActionReview'
import type { AudioJob } from '../../lib/audioJobs'
const candidate = {
  title: 'Первое действие',
  description: 'Описание',
  priority: 'medium' as const,
  category_tag: '#Тест',
  transcript_summary: '',
  due_date: null,
  checklist: ['Вложенный шаг'],
}
const job: AudioJob = {
  id: 'job',
  audioId: 'audio',
  filename: 'test.wav',
  stage: 'completed',
  transcript: 'Исходник',
  summary: 'Сводка',
  candidates: [candidate, { ...candidate, title: 'Второе действие' }],
  createdAt: '2026-10-07T12:00:00Z',
}
describe('Audio action approval', () => {
  it('submits only selected edited actions and guards double submit', async () => {
    let finish!: (value: Response) => void
    const fetch = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    )
    vi.stubGlobal('fetch', fetch)
    const saved = vi.fn()
    render(<AudioActionReview job={job} onClose={() => {}} onSaved={saved} />)
    fireEvent.click(screen.getByLabelText('Добавить действие 2'))
    fireEvent.change(screen.getByLabelText('Заголовок действия 1'), {
      target: { value: 'Исправленное действие' },
    })
    expect(screen.getAllByText('Вложенный шаг')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить выбранные' }))
    fireEvent.click(screen.getByRole('button', { name: 'Сохраняем…' }))
    expect(fetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetch.mock.calls[0][1]!.body as string)
    expect(body.candidates).toHaveLength(1)
    expect(body.candidates[0]).toMatchObject({
      index: 0,
      note: { title: 'Исправленное действие' },
    })
    finish(new Response(JSON.stringify({ ids: ['note'] })))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
  })
  it('shows empty candidates without manufacturing tasks', () => {
    render(
      <AudioActionReview
        job={{ ...job, candidates: [] }}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )
    expect(screen.getByText(/Явных действий не найдено/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
