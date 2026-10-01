/**
 * Web Audio playback for the reveal ladder.
 *
 * Why not <audio> + currentTime: see docs/RESEARCH.md §4.2. Seeking an
 * <audio> element lands on a codec frame boundary and pausing via setTimeout
 * carries tens of milliseconds of jitter. At a 100ms target that is a 20-50%
 * error — the shortest clue in the game would be unreliable. AudioBufferSource
 * start(when, offset, duration) is sample-accurate, so that is what this uses.
 */
import { assetUrls } from '../assets/urls';


/**
 * Schedule a hair in the future rather than at currentTime. Starting exactly
 * at currentTime can drop the first samples, which on a 0.1s clip is audible.
 */
const LOOKAHEAD_SECONDS = 0.02;

/** Longest fade applied to each edge, to avoid a click on a hard cut. */
const MAX_FADE_SECONDS = 0.008;

export type PlaybackState = 'idle' | 'loading' | 'playing';

/** Where the current clip is: seconds heard so far out of the clip's length. */
export interface PlaybackProgress {
  elapsed: number;
  duration: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private inflight = new Map<string, Promise<AudioBuffer>>();
  private current: AudioBufferSourceNode | null = null;
  /** When the current clip starts and how long it runs, on the context clock. */
  private span: { startAt: number; duration: number } | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  private state: PlaybackState = 'idle';
  private listeners = new Set<(s: PlaybackState) => void>();

  /**
   * Create or resume the AudioContext. Must be called from a real user
   * gesture handler: mobile Safari starts contexts suspended and will not
   * autoplay, and a context created outside a gesture stays mute.
   *
   * Safe to call repeatedly — one context per session, never per round.
   */
  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  subscribe(fn: (s: PlaybackState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private setState(s: PlaybackState): void {
    if (s === this.state) return;
    this.state = s;
    for (const fn of this.listeners) fn(s);
  }

  /**
   * Fetch and decode a clip, caching the result.
   *
   * decodeAudioData needs the whole buffer, so the client necessarily holds
   * every byte of whatever step it has been given. That is why the ladder is
   * pre-cut into separate files server-side: a player can only ever hold the
   * steps they have actually unlocked. See §4.2 and §10.5.
   */
  async load(url: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(url);
    if (cached) return cached;

    const pending = this.inflight.get(url);
    if (pending) return pending;

    const task = (async () => {
      await this.unlock();
      const res = await assetUrls.fetch(url);
      if (!res.ok) throw new Error(`clip fetch failed (${res.status}): ${url}`);
      const bytes = await res.arrayBuffer();
      // decodeAudioData detaches the ArrayBuffer, so nothing may reuse it.
      const buffer = await this.ctx!.decodeAudioData(bytes);
      this.buffers.set(url, buffer);
      this.inflight.delete(url);
      return buffer;
    })();

    this.inflight.set(url, task);
    try {
      return await task;
    } catch (err) {
      this.inflight.delete(url);
      throw err;
    }
  }

  /** Warm the cache for the next step so revealing feels instant. */
  prefetch(url: string): void {
    void this.load(url).catch(() => {
      /* best-effort; the real play() will surface any error */
    });
  }

  /**
   * Play at most `seconds` from the start of the clip.
   *
   * The clamp against buffer.duration is cheap insurance. Ingest cuts from PCM
   * WAV, where ffmpeg's seek is sample-exact (verified at 0.000s deviation
   * across the ladder), so in practice the file is already the right length.
   * But the ladder step, not the file, should decide what is heard: a clip
   * rebuilt with different settings must not be able to leak extra audio and
   * quietly make an early clue easier.
   */
  async play(url: string, seconds: number): Promise<void> {
    this.setState('loading');
    let buffer: AudioBuffer;
    try {
      buffer = await this.load(url);
    } catch (err) {
      this.setState('idle');
      throw err;
    }

    this.stop();
    await this.unlock();
    const ctx = this.ctx!;

    const duration = Math.min(seconds, buffer.duration);
    if (duration <= 0) {
      this.setState('idle');
      return;
    }

    // Keep fades proportional so a 0.1s clue is not mostly ramp.
    const fade = Math.min(MAX_FADE_SECONDS, duration / 8);
    const startAt = ctx.currentTime + LOOKAHEAD_SECONDS;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(1, startAt + fade);
    gain.gain.setValueAtTime(1, startAt + duration - fade);
    gain.gain.linearRampToValueAtTime(0, startAt + duration);
    gain.connect(ctx.destination);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    source.onended = () => {
      gain.disconnect();
      if (this.current === source) {
        this.current = null;
        this.span = null;
        this.setState('idle');
      }
    };

    // Sample-accurate: play `duration` from offset 0, scheduled at startAt.
    source.start(startAt, 0, duration);
    this.current = source;
    this.span = { startAt, duration };
    this.setState('playing');

    // onended is the source of truth; this is a belt-and-braces stop in case
    // a browser fails to fire it for a very short buffer.
    this.stopTimer = setTimeout(
      () => {
        if (this.current === source) this.stop();
      },
      (LOOKAHEAD_SECONDS + duration + 0.1) * 1000,
    );
  }

  /**
   * How far into the current clip playback is, read from the AudioContext
   * clock — the same clock that schedules the audio, so a playhead drawn from
   * this matches what is heard rather than a separate timer's guess. Null when
   * nothing is playing. Cheap: call it every animation frame.
   */
  progress(): PlaybackProgress | null {
    if (!this.span || !this.ctx || !this.current) return null;
    const { startAt, duration } = this.span;
    const elapsed = Math.min(Math.max(this.ctx.currentTime - startAt, 0), duration);
    return { elapsed, duration };
  }

  stop(): void {
    this.span = null;
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.current) {
      const source = this.current;
      this.current = null;
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped or never started; nothing to do.
      }
      source.disconnect();
    }
    this.setState('idle');
  }

  /** Release everything. Call on unmount. */
  dispose(): void {
    this.stop();
    this.buffers.clear();
    this.inflight.clear();
    this.listeners.clear();
    void this.ctx?.close();
    this.ctx = null;
  }
}
