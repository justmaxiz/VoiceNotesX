import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MiniAudioPlayer } from '../MiniAudioPlayer'
import { useAudioStore } from '../../../store/useAudioStore'

describe('MiniAudioPlayer', () => {
  beforeEach(() => {
    useAudioStore.setState({ currentAudioUrl: null, isPlaying: false })
  })

  it('renders nothing if audioUrl is not provided', () => {
    const { container } = render(<MiniAudioPlayer />)
    expect(container.firstChild).toBeNull()
  })

  it('renders 24x24 button with play icon when idle', () => {
    render(<MiniAudioPlayer audioUrl="https://example.com/audio.mp3" />)
    const button = screen.getByTestId('mini-audio-player')
    expect(button).toBeDefined()
    expect(button.className).toContain('w-6')
    expect(button.className).toContain('h-6')
    expect(button.textContent).toContain('play_arrow')
  })

  it('toggles playback on click', () => {
    render(<MiniAudioPlayer audioUrl="https://example.com/audio.mp3" />)
    const button = screen.getByTestId('mini-audio-player')

    fireEvent.click(button)
    expect(useAudioStore.getState().currentAudioUrl).toBe('https://example.com/audio.mp3')
    expect(useAudioStore.getState().isPlaying).toBe(true)

    // After state change, button displays pause
    render(<MiniAudioPlayer audioUrl="https://example.com/audio.mp3" />)
    const activeButtons = screen.getAllByTestId('mini-audio-player')
    expect(activeButtons[0].textContent).toContain('pause')
  })
})
