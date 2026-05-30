import type { Command } from './command-schema';
import { DOUBT_ANSWER_PROMPT, type DoubtPromptParams } from './prompts';
import { streamCommands } from './stream-commands';

/**
 * Stream a doubt answer from Claude. Uses Haiku 4.5 for ~3–5× faster
 * time-to-first-byte than Sonnet — doubts are short 2–5 sentence answers
 * with tight prompt constraints, so quality drop is negligible. The main
 * lesson stream still uses Sonnet for full teaching.
 */
export function streamDoubtAnswer(context: DoubtPromptParams): AsyncGenerator<Command> {
  return streamCommands(DOUBT_ANSWER_PROMPT(context), {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
  });
}
