class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = 320;
    this.pending = new Float32Array(this.frameSize);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const channel = input[0];
    let readOffset = 0;

    while (readOffset < channel.length) {
      const remaining = this.frameSize - this.offset;
      const available = channel.length - readOffset;
      const toCopy = Math.min(remaining, available);

      this.pending.set(channel.subarray(readOffset, readOffset + toCopy), this.offset);
      this.offset += toCopy;
      readOffset += toCopy;

      if (this.offset === this.frameSize) {
        const chunk = this.pending;
        this.pending = new Float32Array(this.frameSize);
        this.offset = 0;
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
      }
    }

    return true;
  }
}

registerProcessor("pcm-processor", PcmProcessor);
