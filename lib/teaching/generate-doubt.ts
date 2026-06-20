import type { Command } from './command-schema';
import { DOUBT_SYSTEM_PROMPT, DOUBT_USER_PROMPT, type DoubtPromptParams } from './prompts';
import { streamCommands } from './stream-commands';

/**
 * Stream a doubt answer from Claude.
 * Uses Haiku 4.5 for ~3–5× faster time-to-first-byte than Sonnet.
 * The constant system prompt is cached so only the doubt-specific content
 * incurs token processing cost.
 */
export function streamDoubtAnswer(context: DoubtPromptParams): AsyncGenerator<Command> {
  return streamCommands(DOUBT_USER_PROMPT(context), {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
    systemPrompt: DOUBT_SYSTEM_PROMPT,
  });
}
