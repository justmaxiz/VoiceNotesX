import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QuickCaptureWidget } from '../QuickCaptureWidget'
import { useNavigationStore } from '../../../store/navigationStore'

describe('QuickCaptureWidget Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({ isRecordingModalOpen: false })
  })

  it('renders quick capture input and controls', () => {
    render(<QuickCaptureWidget />)
    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    expect(input).toBeInTheDocument()
    expect(screen.getByLabelText('Начать голосовую запись')).toBeInTheDocument()
    expect(screen.getByLabelText('Сохранить мысль')).toBeInTheDocument()
  })

  it('submits text and calls onSave callback with feedback', () => {
    const onSave = vi.fn()
    render(<QuickCaptureWidget onSave={onSave} />)

    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    const submitBtn = screen.getByLabelText('Сохранить мысль')

    fireEvent.change(input, { target: { value: 'Новая идея для продукта' } })
    expect(input).toHaveValue('Новая идея для продукта')

    fireEvent.click(submitBtn)

    expect(onSave).toHaveBeenCalledWith('Новая идея для продукта')
    expect(input).toHaveValue('')
    expect(screen.getByPlaceholderText('Сохранено в заметки!')).toBeInTheDocument()
  })

  it('ignores empty submission', () => {
    const onSave = vi.fn()
    render(<QuickCaptureWidget onSave={onSave} />)

    const submitBtn = screen.getByLabelText('Сохранить мысль')
    fireEvent.click(submitBtn)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('triggers recording modal on microphone button click', () => {
    render(<QuickCaptureWidget />)

    const micBtn = screen.getByLabelText('Начать голосовую запись')
    fireEvent.click(micBtn)

    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(true)
  })

  it('renders aria-live notification on save and cleans up timer on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = render(<QuickCaptureWidget />)

    const input = screen.getByLabelText('Поле быстрого ввода мысли или задачи')
    fireEvent.change(input, { target: { value: 'Тестовая мысль' } })
    fireEvent.submit(input.closest('form')!)

    // Screen reader feedback
    expect(screen.getByText('Мысль сохранена в заметки')).toBeInTheDocument()

    // Fast-forward 2000ms
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByText('Мысль сохранена в заметки')).not.toBeInTheDocument()

    // Unmount should not throw
    unmount()
    vi.useRealTimers()
  })
})
