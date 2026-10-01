/** One reusable audio element and one cancellable queue per answer surface. */
export type SpeechJob = { id: string; text: string; language?: string; roomId?: string };
type Playback = { job: SpeechJob; abort: AbortController; finish?: () => void; url?: string };
type Options = {
  load: (job: SpeechJob, text: string, signal: AbortSignal) => Promise<Blob>;
  status: (id: string, state: "preparing" | "reading" | "idle" | "error") => void;
  play?: (blob: Blob, signal: AbortSignal) => Promise<boolean>;
  stopPlayback?: () => void;
  primeStream?: () => void;
  stream?: (job: SpeechJob, text: string, signal: AbortSignal, reading: () => void) => Promise<boolean>;
};
const SILENCE = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==";
export function primeSpeechElement(audio:HTMLMediaElement){audio.src=SILENCE;void audio.play().catch(()=>{});}
export class AnswerSpeaker {
  private audio: HTMLAudioElement | null = null;
  private queue: SpeechJob[] = [];
  private current: Playback | null = null;
  constructor(private options: Options) {}
  /** Called synchronously from an explicit user gesture, never on page load. */
  prime() {
    this.options.primeStream?.();
    if (!this.audio) { this.audio = new Audio(); this.audio.preload = "auto"; }
    if (this.current) return;
    primeSpeechElement(this.audio);
  }
  enqueue(job: SpeechJob) {
    if (!job.text.trim()) return;
    this.queue.push(job);
    void this.next();
  }
  stop(id?: string) {
    if(!id||!this.current||this.current.job.id===id)this.options.stopPlayback?.();
    this.queue = id ? this.queue.filter(job => job.id !== id) : [];
    const current = this.current;
    if (current && (!id || current.job.id === id)) {
      this.current = null;
      current.abort.abort();
      if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.pause(); this.audio.removeAttribute("src"); }
      current.finish?.();
      if (current.url) URL.revokeObjectURL(current.url);
      this.options.status(current.job.id, "idle");
      void this.next();
    }
  }
  private async next() {
    if (this.current || !this.queue.length) return;
    const job = this.queue.shift()!;
    const current = { job, abort: new AbortController() } as Playback;
    this.current = current;
    if (!this.audio) { this.audio = new Audio(); this.audio.preload = "auto"; }
    const audio = this.audio;
    try {
      // Keep all of the answer, within each server's 4,000-character limit.
      for (let offset = 0; offset < job.text.length; offset += 3500) {
        this.options.status(job.id, "preparing");
        if (this.options.stream) {
          const streamed = await this.options.stream(job, job.text.slice(offset, offset + 3500), AbortSignal.any([current.abort.signal, AbortSignal.timeout(180000)]), () => {
            if (this.current === current) this.options.status(job.id, "reading");
          });
          if (this.current !== current) return;
          if (streamed) continue;
        }
        const blob = await this.options.load(job, job.text.slice(offset, offset + 3500), AbortSignal.any([current.abort.signal, AbortSignal.timeout(35000)]));
        if (this.current !== current) return;
        if(this.options.play){
          this.options.status(job.id,"reading");
          const played=await this.options.play(blob,current.abort.signal);
          if(this.current!==current)return;
          if(played)continue;
        }
        current.url = URL.createObjectURL(blob);
        audio.src = current.url;
        await new Promise<void>((resolve, reject) => {
          current.finish = resolve;
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("AUDIO_PLAYBACK"));
          void audio.play().then(() => { if (this.current === current) this.options.status(job.id, "reading"); }).catch(reject);
        });
        if (this.current !== current) return;
        audio.onended = null; audio.onerror = null;
        URL.revokeObjectURL(current.url); current.url = undefined;
      }
      this.options.status(job.id, "idle");
    } catch {
      if (this.current === current) this.options.status(job.id, "error");
    } finally {
      if (this.current === current) {
        this.current = null;
        audio.onended = null; audio.onerror = null; audio.pause(); audio.removeAttribute("src");
        if (current.url) URL.revokeObjectURL(current.url);
        void this.next();
      }
    }
  }
}
export function readSpeakerPreference(key: string, fallback = false): boolean {
  try { const value = localStorage.getItem(key); return value === null ? fallback : value === "on"; } catch { return fallback; }
}
export function saveSpeakerPreference(key: string, enabled: boolean) {
  try { localStorage.setItem(key, enabled ? "on" : "off"); } catch { /* In-memory choice still works. */ }
}
