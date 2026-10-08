import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, it, expect } from 'vitest'

function processor() {
  let Constructor: any
  runInNewContext(readFileSync('public/dictation-processor.js', 'utf8'), {
    AudioWorkletProcessor: class {
      port = { messages: [] as any[], onmessage: null, postMessage(message: any) { this.messages.push(message) } }
    },
    registerProcessor: (_name: string, value: any) => { Constructor = value },
  })
  return new Constructor()
}

describe('PCM dictation worklet', () => {
  it('flushes a short utterance even when it does not fill a 100 ms chunk', () => {
    const worklet = processor()
    worklet.process([[Float32Array.from([0, 0.5, -0.5, 1.2, -1.2])]])
    expect(worklet.port.messages).toHaveLength(0)
    worklet.port.onmessage({ data: { type: 'flush' } })
    const pcm = new Int16Array(worklet.port.messages[0].pcm)
    expect(Array.from(pcm)).toEqual([0, 16384, -16384, 32767, -32768])
    expect(worklet.port.messages[1].type).toBe('flushed')
  })
  it('streams complete chunks and preserves the final partial chunk exactly once', () => {
    const worklet = processor()
    worklet.process([[new Float32Array(1700).fill(0.25)]])
    expect(worklet.port.messages[0].pcm.byteLength).toBe(3200)
    worklet.port.onmessage({ data: { type: 'flush' } })
    expect(worklet.port.messages[1].pcm.byteLength).toBe(200)
    worklet.port.onmessage({ data: { type: 'flush' } })
    expect(worklet.port.messages.filter((message: any) => message.type === 'audio')).toHaveLength(2)
  })
})
