import type { WhiteboardHandle } from '@/components/whiteboard/Whiteboard';
import type { Equation } from '@/components/whiteboard/EquationOverlay';
import type { Command, NarrateCommand, QuickCheckQuestion } from '@/lib/teaching/command-schema';

/**
 * Orchestrates the lesson playback loop.
 *
 * Two concurrent loops share a command queue:
 *
 *   Ingestion: pulls Commands from the stream, pushes to the queue, AND
 *   kicks off TTS fetches for any `narrate` it sees. By the time playback
 *   reaches narrate N, narrates N+1, N+2, … are likely already loading.
 *   That gives the brief's "lookahead buffer" for free.
 *
 *   Playback: pops Commands, buffers draws until the next narrate, plays
 *   the narrate's audio (Web Audio API for sample-accurate ended timing),
 *   then advances. On pause_for_doubts, waits for a `continue()` call.
 *
 * If no AudioContext is supplied or TTS fails, narration falls back to a
 * reading-time wait (~250 ms/word, 800 ms min) so the lesson still plays
 * without sound.
 */

export interface SchedulerDeps {
  whiteboard: WhiteboardHandle;
  audioContext: AudioContext | null;
  setCaption: (text: string | null) => void;
  setDoubtPrompt: (prompt: string | null) => void;
  setQuickCheck: (questions: QuickCheckQuestion[] | null) => void;
  addEquation: (eq: Equation) => void;
  clearEquations: () => void;
  setEnded: () => void;
  shouldRouteAudioLocally?: () => boolean;
  sayViaAvatar?: (text: string) => Promise<void>;
}

const WORDS_PER_SECOND = 4;
const MIN_NARRATE_MS = 800;

export class CommandScheduler {
  private drawBuffer: Command[] = [];
  private commandQueue: Command[] = [];
  private audioCache = new Map<string, Promise<AudioBuffer>>();
  private narrateHistory: string[] = [];
  private streamEnded = false;
  private aborted = false;
  private commandAvailable: (() => void) | null = null;
  private skipResolver: (() => void) | null = null;
  private continueResolver: (() => void) | null = null;
  private quickCheckResolver: (() => void) | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  // freeze/unfreeze: pause the playback loop so a user-initiated doubt can run cleanly
  private freezeResolver: (() => void) | null = null;
  private frozen = false;

  constructor(private deps: SchedulerDeps) {}

  /**
   * Most recent narrate texts the student has heard. Used as context for
   * doubt answering so Claude doesn't repeat itself.
   */
  getNarrateHistory(): readonly string[] {
    return this.narrateHistory;
  }

  /**
   * Resolve the current pause_for_doubts AND process a doubt-answer stream
   * inline before the main lesson resumes. The main playback loop is parked
   * on waitForContinue(); we run each doubt command through the same handle()
   * pipeline (so draws appear, narrates play with audio, skip still works),
   * then resolve the wait so the main lesson seamlessly continues.
   */
  async continueWithDoubt(stream: AsyncIterable<Command>): Promise<void> {
    try {
      for await (const cmd of stream) {
        if (this.aborted) break;
        await this.handle(cmd);
      }
      this.flushDraws();
    } finally {
      this.continueResolver?.();
    }
  }

  /**
   * Run ingestion and playback concurrently. Resolves when the stream ends
   * and the last command has been handled.
   */
  async run(stream: AsyncIterable<Command>): Promise<void> {
    await Promise.all([this.runIngestion(stream), this.runPlayback()]);
  }

  /** Cut a pending narrate short (clicked Skip). */
  skip(): void {
    this.skipResolver?.();
  }

  /** Resolve a pending pause_for_doubts. */
  continue(): void {
    this.continueResolver?.();
  }

  /** Resolve a pending quick_check. */
  continueAfterQuickCheck(): void {
    this.quickCheckResolver?.();
  }

  /** Freeze playback so a user-initiated doubt runs without interference. */
  freeze(): void {
    this.frozen = true;
    this.skip(); // stop current speech immediately
  }

  /** Resume playback after a user-initiated doubt finishes. */
  unfreeze(): void {
    this.frozen = false;
    const r = this.freezeResolver;
    this.freezeResolver = null;
    r?.();
  }

  /** Tear down; resolves any pending waits so run() finishes. */
  abort(): void {
    this.aborted = true;
    this.frozen = false;
    this.skipResolver?.();
    this.continueResolver?.();
    this.quickCheckResolver?.();
    this.freezeResolver?.();
    this.commandAvailable?.();
    try {
      this.currentSource?.stop();
    } catch {
      // already stopped
    }
  }

  // ---------- ingestion ----------

  private static webSpeechAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private async runIngestion(stream: AsyncIterable<Command>): Promise<void> {
    try {
      for await (const cmd of stream) {
        if (this.aborted) return;
        this.commandQueue.push(cmd);
        // Only prefetch OpenAI TTS when Web Speech API is not available
        if (cmd.type === 'narrate' && this.deps.audioContext && !CommandScheduler.webSpeechAvailable()) {
          this.audioCache.set(cmd.id, this.fetchAudio(cmd.text));
        }
        this.notifyCommandAvailable();
      }
    } finally {
      this.streamEnded = true;
      this.notifyCommandAvailable();
    }
  }

  private async fetchAudio(text: string): Promise<AudioBuffer> {
    const ctx = this.deps.audioContext;
    if (!ctx) throw new Error('no audio context');
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    return ctx.decodeAudioData(buf);
  }

  // ---------- playback ----------

  private async runPlayback(): Promise<void> {
    while (!this.aborted) {
      // If frozen (user asked a question), wait until unfreeze() is called
      if (this.frozen) {
        await new Promise<void>((r) => { this.freezeResolver = r; });
      }
      if (this.aborted) return;
      const cmd = await this.nextCommand();
      if (!cmd) {
        this.flushDraws();
        return;
      }
      await this.handle(cmd);
    }
  }

  private async nextCommand(): Promise<Command | null> {
    while (this.commandQueue.length === 0 && !this.streamEnded && !this.aborted) {
      await new Promise<void>((resolve) => {
        this.commandAvailable = resolve;
      });
    }
    if (this.aborted) return null;
    return this.commandQueue.shift() ?? null;
  }

  private notifyCommandAvailable(): void {
    const cb = this.commandAvailable;
    this.commandAvailable = null;
    cb?.();
  }

  private async handle(cmd: Command): Promise<void> {
    switch (cmd.type) {
      case 'narrate':
        this.flushDraws();
        this.deps.setCaption(cmd.text);
        this.narrateHistory.push(cmd.text);
        await this.playNarrate(cmd);
        this.deps.setCaption(null);
        return;

      case 'pause_for_doubts':
        this.flushDraws();
        this.deps.setDoubtPrompt(cmd.prompt);
        await this.waitForContinue();
        this.deps.setDoubtPrompt(null);
        return;

      case 'quick_check':
        this.flushDraws();
        this.deps.setQuickCheck(cmd.questions);
        await this.waitForQuickCheck();
        this.deps.setQuickCheck(null);
        return;

      case 'clear_board':
        this.flushDraws();
        this.deps.whiteboard.apply(cmd);
        this.deps.clearEquations();
        return;

      case 'end_lesson':
        this.flushDraws();
        this.deps.setEnded();
        return;

      default:
        this.drawBuffer.push(cmd);
    }
  }

  private flushDraws(): void {
    for (const cmd of this.drawBuffer) {
      if (cmd.type === 'draw_equation') {
        this.deps.addEquation({
          id: cmd.id,
          x: cmd.x,
          y: cmd.y,
          fontSize: cmd.fontSize,
          latex: cmd.latex,
        });
      } else {
        this.deps.whiteboard.apply(cmd);
      }
    }
    this.drawBuffer = [];
  }

  private async playNarrate(cmd: NarrateCommand): Promise<void> {
    // Avatar path
    const useAvatar =
      this.deps.sayViaAvatar && this.deps.shouldRouteAudioLocally?.() === false;
    if (useAvatar && this.deps.sayViaAvatar) {
      try {
        await this.runWithSkip(this.deps.sayViaAvatar(cmd.text));
        return;
      } catch (err) {
        console.warn('[lesson] avatar say failed, falling back:', err);
      }
    }

    // Web Speech API — zero latency, runs on-device, no API cost
    if (CommandScheduler.webSpeechAvailable()) {
      return this.playViaWebSpeech(cmd.text);
    }

    // OpenAI TTS fallback (when Web Speech API unavailable)
    const ctx = this.deps.audioContext;
    if (!ctx) {
      return this.waitReadingTime(cmd.text);
    }

    let audioPromise = this.audioCache.get(cmd.id);
    if (!audioPromise) {
      audioPromise = this.fetchAudio(cmd.text);
      this.audioCache.set(cmd.id, audioPromise);
    }

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioPromise;
    } catch (err) {
      console.warn('[lesson] TTS failed, falling back to reading-time:', err);
      return this.waitReadingTime(cmd.text);
    }

    if (this.aborted) return;

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      this.currentSource = source;

      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        try {
          source.stop();
        } catch {
          // already stopped
        }
        this.currentSource = null;
        this.skipResolver = null;
        resolve();
      };

      source.onended = finish;
      this.skipResolver = finish;

      try {
        source.start();
      } catch (err) {
        console.warn('[lesson] source.start failed:', err);
        finish();
      }
    });
  }

  /**
   * Race a promise against the skip resolver. If skip() is called, the
   * returned promise resolves early. The outer promise still rejects if
   * the inner promise rejects first.
   */
  private runWithSkip(inner: Promise<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (err?: unknown) => {
        if (settled) return;
        settled = true;
        this.skipResolver = null;
        if (err) reject(err);
        else resolve();
      };
      this.skipResolver = () => finish();
      inner.then(
        () => finish(),
        (err) => finish(err),
      );
    });
  }

  private playViaWebSpeech(text: string): Promise<void> {
    if (this.aborted) return Promise.resolve();

    // Cancel any leftover speech
    window.speechSynthesis.cancel();

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Pick best available English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang === 'en-US' && v.localService) ??
        voices.find((v) => v.lang === 'en-US') ??
        voices.find((v) => v.lang.startsWith('en')) ??
        null;
      if (preferred) utterance.voice = preferred;

      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        this.skipResolver = null;
        try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      this.skipResolver = finish;

      window.speechSynthesis.speak(utterance);

      // Watchdog: if speech hasn't started within 2s, fall through silently
      const watchdog = setTimeout(() => { if (!resolved) finish(); }, 2000);
      utterance.onstart = () => clearTimeout(watchdog);
    });
  }

  private waitReadingTime(text: string): Promise<void> {
    const words = text.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(MIN_NARRATE_MS, Math.round((words / WORDS_PER_SECOND) * 1000));
    return new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        this.skipResolver = null;
        resolve();
      };
      const timer = setTimeout(finish, duration);
      this.skipResolver = finish;
    });
  }

  private waitForContinue(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.continueResolver = () => {
        this.continueResolver = null;
        resolve();
      };
    });
  }

  private waitForQuickCheck(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.quickCheckResolver = () => {
        this.quickCheckResolver = null;
        resolve();
      };
    });
  }
}
