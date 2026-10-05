import React, { useEffect, useRef } from 'react'

export interface LiveWaveformProps {
  isRecording: boolean
  stream?: MediaStream | null
  height?: number
  width?: number
  className?: string
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({
  isRecording,
  stream,
  height = 32,
  width = 140,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  useEffect(() => {
    if (!isRecording || !stream) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect()
        } catch {
          // ignore
        }
        sourceRef.current = null
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close()
        } catch {
          // ignore
        }
        audioCtxRef.current = null
      }

      // Clear canvas if present
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let isCancelled = false

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

      if (!AudioContextClass) return

      const audioCtx = new AudioContextClass()
      audioCtxRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const barCount = 22
      const spacing = 3
      const barWidth = Math.max(2, (width - spacing * (barCount - 1)) / barCount)

      const render = () => {
        if (isCancelled) return

        analyser.getByteFrequencyData(dataArray)

        ctx.clearRect(0, 0, width, height)

        for (let i = 0; i < barCount; i++) {
          // Map to frequency index
          const dataIndex = Math.min(bufferLength - 1, Math.floor((i / barCount) * bufferLength))
          const amplitude = dataArray[dataIndex] / 255
          const minHeight = 4
          const barHeight = Math.max(minHeight, amplitude * (height - 4))
          const x = i * (barWidth + spacing)
          const y = (height - barHeight) / 2

          // Gradient Cyber Emerald (#10b981) to Electric Violet (#8b5cf6)
          const gradient = ctx.createLinearGradient(0, height, 0, 0)
          gradient.addColorStop(0, '#10b981')
          gradient.addColorStop(1, '#8b5cf6')

          ctx.fillStyle = gradient
          ctx.beginPath()
          const radius = barWidth / 2
          ctx.roundRect
            ? ctx.roundRect(x, y, barWidth, barHeight, radius)
            : ctx.rect(x, y, barWidth, barHeight)
          ctx.fill()
        }

        animFrameIdRef.current = requestAnimationFrame(render)
      }

      animFrameIdRef.current = requestAnimationFrame(render)
    } catch {
      // AudioContext may fail in non-supported environments
    }

    return () => {
      isCancelled = true
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect()
        } catch {
          // ignore
        }
        sourceRef.current = null
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close()
        } catch {
          // ignore
        }
        audioCtxRef.current = null
      }
    }
  }, [isRecording, stream, width, height])

  if (!isRecording) return null

  return (
    <div
      data-testid="live-waveform-container"
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-label="Живая звуковая волна микрофона"
        className="block"
      />
    </div>
  )
}
