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
  /** Called with true the first time local TTS fails and playback falls back to
   *  silent reading-time, and with false again once audio plays successfully. */
  setAudioFailed?: (failed: boolean) => void;
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
  // pause/resume: user-initiated lesson pause (suspends audio, holds playback between commands)
  private pausedState = false;
  private pauseResolver: (() => void) | null = null;

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
   * inline before the main lesson resumes.
   *
   * Perf fix: collect ALL commands first while immediately kicking off TTS
   * fetches in parallel. By the time the first narrate starts playing, its
   * audio is already loading (or done). Without this, TTS fetches were serial
   * — each narrate waited 8–15 s before the next one even started fetching.
   */
  async continueWithDoubt(stream: AsyncIterable<Command>): Promise<void> {
    const commands: Command[] = [];
    try {
      // Collect + pre-fetch TTS concurrently with Haiku generation
      for await (const cmd of stream) {
        if (this.aborted) break;
        commands.push(cmd);
        if (cmd.type === 'narrate' && this.deps.audioContext) {
          this.audioCache.set(cmd.id, this.fetchAudio(cmd.text));
        }
      }
      // Play in order — audio is already loading
      for (const cmd of commands) {
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

  /** Pause lesson: suspend audio and hold between commands. */
  pausePlayback(): void {
    if (this.pausedState) return;
    this.pausedState = true;
    this.deps.audioContext?.suspend().catch(() => {});
  }

  /** Resume lesson after pausePlayback(). */
  resumePlayback(): void {
    if (!this.pausedState) return;
    this.pausedState = false;
    this.deps.audioContext?.resume().catch(() => {});
    const r = this.pauseResolver;
    this.pauseResolver = null;
    r?.();
  }

  get isPaused(): boolean {
    return this.pausedState;
  }

  /** Tear down; resolves any pending waits so run() finishes. */
  abort(): void {
    this.aborted = true;
    this.frozen = false;
    this.pausedState = false;
    this.skipResolver?.();
    this.continueResolver?.();
    this.quickCheckResolver?.();
    this.freezeResolver?.();
    this.pauseResolver?.();
    this.commandAvailable?.();
    try {
      this.currentSource?.stop();
    } catch {
      // already stopped
    }
  }

  // ---------- ingestion ----------

  private async runIngestion(stream: AsyncIterable<Command>): Promise<void> {
    try {
      for await (const cmd of stream) {
        if (this.aborted) return;
        this.commandQueue.push(cmd);
        // Prefetch OpenAI TTS for every narrate so audio is ready by playback time
        if (cmd.type === 'narrate' && this.deps.audioContext) {
          this.audioCache.set(cmd.id, this.fetchAudio(cmd.text));
        }
        this.notifyCommandAvailable();
      }
    } finally {
      this.streamEnded = true;
      this.notifyCommandAvailable();
    }
  }

  private async fetchAudio(text: string, retriesLeft = 1): Promise<AudioBuffer> {
    const ctx = this.deps.audioContext;
    if (!ctx) throw new Error('no audio context');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      return await ctx.decodeAudioData(buf);
    } catch (err) {
      if (retriesLeft <= 0) throw err;
      await new Promise((r) => setTimeout(r, 800));
      return this.fetchAudio(text, retriesLeft - 1);
    }
  }

  // ---------- playback ----------

  private async runPlayback(): Promise<void> {
    while (!this.aborted) {
      // If frozen (user asked a question), wait until unfreeze() is called
      if (this.frozen) {
        await new Promise<void>((r) => { this.freezeResolver = r; });
      }
      // If user-paused, hold here between commands until resumePlayback()
      if (this.pausedState) {
        await new Promise<void>((r) => { this.pauseResolver = r; });
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

    // OpenAI TTS via Web Audio API
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
      this.deps.setAudioFailed?.(false);
    } catch (err) {
      console.warn('[lesson] TTS failed, falling back to reading-time:', err);
      this.deps.setAudioFailed?.(true);
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
