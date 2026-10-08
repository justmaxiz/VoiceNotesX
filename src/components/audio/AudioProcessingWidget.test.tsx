import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioProcessingWidget } from './AudioProcessingWidget'
import type { AudioJob } from '../../lib/audioJobs'
const job: AudioJob = {
  id: 'restored',
  audioId: 'audio',
  filename: 'restored.wav',
  stage: 'transcribing',
  transcript: '',
  summary: '',
  candidates: [],
  createdAt: '2026-10-07T12:00:00Z',
}
afterEach(() => vi.useRealTimers())
describe('Audio processing widget', () => {
  it('restores a job, shows transcript and completion without artificial percentage', async () => {
    let current = { ...job }
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (input) =>
          new Response(
            JSON.stringify(
              String(input).includes('/audio/jobs')
                ? { jobs: [current] }
                : { notes: [], total: 0 },
            ),
          ),
      ),
    )
    vi.useFakeTimers()
    await act(async () => {
      render(<AudioProcessingWidget />)
    })
    expect(screen.getByText('Распознаём речь')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    current = { ...job, stage: 'analyzing', transcript: 'Готовый транскрипт' }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(screen.getByText('Анализируем текст')).toBeInTheDocument()
    expect(screen.getByText('Готовый транскрипт')).toBeInTheDocument()
    current = { ...current, stage: 'completed' }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(screen.getByText('Аудио проанализировано')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Просмотреть действия' }),
    ).toBeInTheDocument()
  })
  it('shows retry on a processing error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              jobs: [{ ...job, stage: 'error', error: 'AI_UNAVAILABLE' }],
            }),
          ),
      ),
    )
    render(<AudioProcessingWidget />)
    await screen.findByText('Обработка не завершена')
    expect(
      screen.getByRole('button', { name: 'Повторить обработку' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
