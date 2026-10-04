import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'
import { Badge } from '../Badge'
import { Card } from '../Card'
import { Waveform } from '../Waveform'
import { SegmentProgress } from '../SegmentProgress'
import { EmptyState } from '../EmptyState'

describe('Atomic UI Components', () => {
  describe('Button', () => {
    it('renders label and triggers click', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Нажми меня</Button>)
      const btn = screen.getByRole('button', { name: 'Нажми меня' })
      expect(btn).toBeInTheDocument()
      fireEvent.click(btn)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('respects disabled state', () => {
      const handleClick = vi.fn()
      render(
        <Button disabled onClick={handleClick}>
          Неактивно
        </Button>
      )
      const btn = screen.getByRole('button', { name: 'Неактивно' })
      expect(btn).toBeDisabled()
      fireEvent.click(btn)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Badge', () => {
    it('renders text with pulse indicator', () => {
      render(
        <Badge variant="secondary" pulse>
          В эфире
        </Badge>
      )
      expect(screen.getByText('В эфире')).toBeInTheDocument()
    })
  })

  describe('Card', () => {
    it('renders content with glass or container styling', () => {
      render(
        <Card variant="glass" data-testid="card-element">
          Контент карточки
        </Card>
      )
      const card = screen.getByTestId('card-element')
      expect(card).toHaveClass('glass-panel')
      expect(screen.getByText('Контент карточки')).toBeInTheDocument()
    })
  })

  describe('Waveform', () => {
    it('supports slider role and keyboard arrow navigation', () => {
      const handleSeek = vi.fn()
      render(
        <Waveform
          interactive
          progress={0.5}
          onSeek={handleSeek}
          ariaLabel="Шкала аудио"
        />
      )
      const slider = screen.getByRole('slider', { name: 'Шкала аудио' })
      expect(slider).toHaveAttribute('aria-valuenow', '50')

      fireEvent.keyDown(slider, { key: 'ArrowRight' })
      expect(handleSeek).toHaveBeenCalledWith(0.55)

      fireEvent.keyDown(slider, { key: 'ArrowLeft' })
      expect(handleSeek).toHaveBeenCalledWith(0.45)
    })
  })

  describe('SegmentProgress', () => {
    it('handles negative and bounded progress safely', () => {
      render(<SegmentProgress total={-5} completed={0} />)
      const emptyBar = screen.getByRole('progressbar')
      expect(emptyBar).toHaveAttribute('aria-valuenow', '0')

      const { container } = render(<SegmentProgress total={6} completed={3} />)
      const bars = container.querySelectorAll('.h-1\\.5')
      expect(bars.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('EmptyState', () => {
    it('renders title, description and action', () => {
      render(
        <EmptyState
          title="Список пуст"
          description="Добавьте первую запись"
          action={<button>Создать</button>}
        />
      )
      expect(screen.getByText('Список пуст')).toBeInTheDocument()
      expect(screen.getByText('Добавьте первую запись')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument()
    })
  })
})
