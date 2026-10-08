// The context runs at 16 kHz; send mono PCM in 100 ms chunks.
class DictationProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Int16Array(1600);
    this.offset = 0;
    this.port.onmessage = () => {
      this.flush();
      this.port.postMessage({ type: 'flushed' });
    };
  }
  flush() {
    if (!this.offset) return;
    const pcm = this.samples.slice(0, this.offset);
    this.port.postMessage({ type: 'audio', pcm: pcm.buffer }, [pcm.buffer]);
    this.offset = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) for (const sample of input) {
      this.samples[this.offset++] = Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767));
      if (this.offset === this.samples.length) this.flush();
    }
    return true;
  }
}
registerProcessor('dictation-pcm', DictationProcessor);
