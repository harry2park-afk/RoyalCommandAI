/** Browser-local 24 kHz PCM16 playback. Primed only by a user gesture. */
export class PcmSpeechPlayer {
  private context: AudioContext | null = null;
  private active: AbortController | null = null;

  prime() {
    if (!this.context) {
      const ctor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
      if (!ctor) return;
      try { this.context = new ctor(); } catch { return; }
    }
    void this.context.resume().catch(() => {});
  }
  get available() { return this.context !== null && this.context.state !== 'closed'; }
  stop() { this.active?.abort(); }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; }

  async play(response: Response, signal: AbortSignal, reading: () => void) {
    const context = this.context;
    if (!context || !response.ok || !response.body || !response.headers.get('content-type')?.startsWith('audio/pcm')) throw Error('SPEECH');
    this.stop();
    const controller = new AbortController(); this.active = controller;
    const cancel = AbortSignal.any([signal, controller.signal]);
    const reader = response.body.getReader(), sources = new Set<AudioBufferSourceNode>();
    let pending = new Uint8Array(0), nextTime = context.currentTime + 0.04, received = false, ended = false;
    let resolveDrain: () => void = () => {}, rejectDrain: (e: Error) => void = () => {};
    const drain = new Promise<void>((resolve, reject) => { resolveDrain = resolve; rejectDrain = reject; });
    // Cancellation can happen while reader.read() is pending, before awaiting drain.
    void drain.catch(() => {});
    const abort = () => {
      for (const source of sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
      sources.clear(); void reader.cancel().catch(() => {}); rejectDrain(Error('CANCELLED'));
    };
    cancel.addEventListener('abort', abort, {once: true});
    const append = (bytes: Uint8Array) => {
      if (cancel.aborted) throw Error('CANCELLED');
      const buffer = context.createBuffer(1, bytes.length / 2, 24000), channel = buffer.getChannelData(0);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let i = 0; i < channel.length; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect(); if (ended && !sources.size) resolveDrain(); };
      nextTime = Math.max(nextTime, context.currentTime + 0.015);
      source.start(nextTime); nextTime += buffer.duration;
      if (!received) { received = true; reading(); }
    };
    try {
      if (cancel.aborted) throw Error('CANCELLED');
      await context.resume();
      if (cancel.aborted || context.state !== 'running') throw Error('SPEECH');
      for (;;) {
        const chunk = await reader.read(); if (cancel.aborted) throw Error('CANCELLED');
        if (chunk.done) break;
        const joined = new Uint8Array(pending.length + chunk.value.length); joined.set(pending); joined.set(chunk.value, pending.length); pending = joined;
        // 120 ms blocks absorb packet boundaries without waiting for the whole file.
        while (pending.length >= 5760) { append(pending.subarray(0, 5760)); pending = pending.slice(5760); }
      }
      if (pending.length % 2) throw Error('SPEECH');
      if (pending.length) append(pending);
      if (!received) throw Error('SPEECH');
      ended = true; if (!sources.size) resolveDrain();
      await drain;
    } catch (error) { abort(); throw error; }
    finally { cancel.removeEventListener('abort', abort); reader.releaseLock(); if (this.active === controller) this.active = null; }
  }
}
