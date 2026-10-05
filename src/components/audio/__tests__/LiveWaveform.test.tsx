import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { LiveWaveform } from '../LiveWaveform'

describe('LiveWaveform', () => {
  beforeEach(() => {
    // Mock HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      rect: vi.fn(),
      fill: vi.fn(),
    }) as any
  })

  it('renders nothing when not recording', () => {
    const { container } = render(<LiveWaveform isRecording={false} stream={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders canvas when recording is active', () => {
    const mockStream = {} as MediaStream
    const { getByTestId } = render(<LiveWaveform isRecording={true} stream={mockStream} />)
    expect(getByTestId('live-waveform-container')).toBeDefined()
  })
})
